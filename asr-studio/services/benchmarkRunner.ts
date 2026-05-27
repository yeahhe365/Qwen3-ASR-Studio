import { CompressionLevel, type AsrProviderConfig, type Language } from '../types';
import { compressAudio, getEffectiveCompressionLevel } from './audioService';
import {
  getCachedTranscription,
  getFileHash,
  setCachedTranscription,
} from './cacheService';
import { getProviderReadinessError } from './providerRegistry';
import { createRemoteAudioFile, getAudioSourceUrl } from './remoteAudioFile';
import { createAbortError, isAbortError, transcribePreparedAudio } from './transcriptionProcessing';
import { createTranscriptionCacheKey, createTranscriptionCacheSource } from './transcriptionCacheKey';
import type {
  BenchmarkModelTarget,
  BenchmarkPerturbationSettings,
  BenchmarkRunConfigSnapshot,
  BenchmarkRunResult,
  BenchmarkSample,
  BenchmarkScoringOptions,
} from './benchmarkTypes';
import { createBenchmarkProviderConfig, estimateBenchmarkCost } from './benchmarkModels';
import { scoreBenchmarkTranscript } from './benchmarkScoring';
import {
  createBenchmarkDiarizationMetrics,
  createBenchmarkStreamingMetrics,
  createBenchmarkTimestampMetrics,
} from './benchmarkAdvancedAnalytics';
import { applyBenchmarkPerturbation } from './benchmarkPerturbations';

export type BenchmarkAudioFileIndex = Map<string, File>;

export type BenchmarkRunOneOptions = {
  sample: BenchmarkSample;
  target: BenchmarkModelTarget;
  baseConfig: AsrProviderConfig;
  language: Language;
  context: string;
  enableItn: boolean;
  compressionLevel: CompressionLevel;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
  scoringOptions: BenchmarkScoringOptions;
  perturbation?: BenchmarkPerturbationSettings;
  audioFiles: BenchmarkAudioFileIndex;
  signal: AbortSignal;
  onProgress?: (message: string) => void;
};

const normalizePathKey = (value: string) => value.trim().replace(/^\.?\//, '').toLowerCase();

export const createBenchmarkAudioFileIndex = (files: File[]) => {
  const index: BenchmarkAudioFileIndex = new Map();

  files.forEach((file) => {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    [file.name, relativePath].filter(Boolean).forEach((key) => {
      index.set(normalizePathKey(key || ''), file);
    });
  });

  return index;
};

export const resolveBenchmarkSampleAudioFile = (sample: BenchmarkSample, audioFiles: BenchmarkAudioFileIndex) => {
  if (sample.audioUrl) {
    return createRemoteAudioFile(sample.audioUrl);
  }

  if (!sample.fileName) {
    return null;
  }

  return audioFiles.get(normalizePathKey(sample.fileName)) || audioFiles.get(normalizePathKey(sample.fileName.split('/').pop() || '')) || null;
};

export const createBenchmarkResultId = (sampleId: string, modelId: string) => {
  return `${sampleId}__${modelId}`;
};

export const createBenchmarkRunConfigSnapshot = ({
  providerConfig,
  language,
  context,
  enableItn,
  compressionLevel,
  trimSilence,
  enableLongAudioChunking,
  scoringOptions,
}: Omit<BenchmarkRunConfigSnapshot, 'createdAt'>): BenchmarkRunConfigSnapshot => ({
  providerConfig: {
    ...providerConfig,
    qwenApiKey: providerConfig.qwenApiKey ? '[configured]' : '',
    doubaoApiKey: providerConfig.doubaoApiKey ? '[configured]' : '',
    doubaoAccessKey: providerConfig.doubaoAccessKey ? '[configured]' : '',
    geminiApiKey: providerConfig.geminiApiKey ? '[configured]' : '',
    nvidiaNimApiKey: providerConfig.nvidiaNimApiKey ? '[configured]' : '',
    mainstreamAsrApiKey: providerConfig.mainstreamAsrApiKey ? '[configured]' : '',
  },
  language,
  context,
  enableItn,
  compressionLevel,
  trimSilence,
  enableLongAudioChunking,
  scoringOptions,
  createdAt: new Date().toISOString(),
});

const createErrorResult = ({
  sample,
  target,
  message,
  status = 'error',
  startedAt,
}: {
  sample: BenchmarkSample;
  target: BenchmarkModelTarget;
  message: string;
  status?: BenchmarkRunResult['status'];
  startedAt: number;
}): BenchmarkRunResult => ({
  id: createBenchmarkResultId(sample.id, target.id),
  sampleId: sample.id,
  modelId: target.id,
  status,
  message,
  errorMessage: message,
  startedAt,
  finishedAt: Date.now(),
});

export const runBenchmarkTranscription = async ({
  sample,
  target,
  baseConfig,
  language,
  context,
  enableItn,
  compressionLevel,
  trimSilence,
  enableLongAudioChunking,
  scoringOptions,
  perturbation,
  audioFiles,
  signal,
  onProgress,
}: BenchmarkRunOneOptions): Promise<BenchmarkRunResult> => {
  const startedAt = Date.now();
  const providerConfig = createBenchmarkProviderConfig(baseConfig, target);
  const runId = createBenchmarkResultId(sample.id, target.id);

  try {
    if (signal.aborted) {
      throw createAbortError();
    }

    let sourceFile = resolveBenchmarkSampleAudioFile(sample, audioFiles);
    if (!sourceFile) {
      return createErrorResult({
        sample,
        target,
        startedAt,
        message: sample.fileName ? `未找到本地音频：${sample.fileName}` : '样本缺少可用音频来源。',
      });
    }

    const audioSourceUrl = getAudioSourceUrl(sourceFile);
    if (perturbation?.enabled && !audioSourceUrl) {
      onProgress?.(`生成扰动音频：${perturbation.mode}`);
      sourceFile = await applyBenchmarkPerturbation(sourceFile, perturbation);
    }

    const readinessError = getProviderReadinessError(providerConfig, sourceFile);
    if (readinessError) {
      return createErrorResult({ sample, target, startedAt, message: readinessError });
    }

    const preparedAudioSourceUrl = getAudioSourceUrl(sourceFile);
    const audioChecksum = audioSourceUrl ? '' : await getFileHash(sourceFile);
    if (signal.aborted) {
      throw createAbortError();
    }

    const cacheKey = createTranscriptionCacheKey({
      source: createTranscriptionCacheSource(audioChecksum, preparedAudioSourceUrl),
      config: providerConfig,
      language,
      enableItn,
      compressionLevel,
      trimSilence,
      enableLongAudioChunking,
      context,
      benchmarkOptions: {
        scoringOptions,
        perturbation: perturbation?.enabled ? perturbation : null,
      },
    });
    const cachedResult = await getCachedTranscription(cacheKey);
    if (signal.aborted) {
      throw createAbortError();
    }

    const snapshot = createBenchmarkRunConfigSnapshot({
      providerConfig,
      language,
      context,
      enableItn,
      compressionLevel,
      trimSilence,
      enableLongAudioChunking,
      scoringOptions,
    });

    const estimatedCostUsd = estimateBenchmarkCost(sample.durationSeconds, target.costPerMinuteUsd);
    const finish = (
      hypothesis: string,
      detectedLanguage: string | undefined,
      fromCache: boolean,
      segments: BenchmarkRunResult['segments'] = [],
    ): BenchmarkRunResult => {
      const finishedAt = Date.now();
      const latencyMs = finishedAt - startedAt;
      const baseResult: BenchmarkRunResult = {
        id: runId,
        sampleId: sample.id,
        modelId: target.id,
        status: 'done',
        message: fromCache ? '缓存命中' : '完成',
        hypothesis,
        detectedLanguage,
        segments,
        score: scoreBenchmarkTranscript({
        referenceText: sample.referenceText,
        hypothesisText: hypothesis,
        keywords: sample.keywords,
        names: sample.names,
        terms: sample.terms,
        options: scoringOptions,
        }),
        latencyMs,
        rtf: sample.durationSeconds && sample.durationSeconds > 0 ? latencyMs / 1000 / sample.durationSeconds : null,
        estimatedCostUsd,
        runCostUsd: fromCache ? 0 : estimatedCostUsd,
        cacheKey,
        audioChecksum,
        audioSource: preparedAudioSourceUrl || sourceFile.name,
        fromCache,
        modelSnapshot: target,
        providerConfigSnapshot: snapshot,
        startedAt,
        finishedAt,
      };

      return {
        ...baseResult,
        timestampMetrics: createBenchmarkTimestampMetrics(sample, baseResult),
        diarizationMetrics: createBenchmarkDiarizationMetrics(sample, baseResult),
        streamingMetrics: createBenchmarkStreamingMetrics(sample, baseResult),
      };
    };

    if (cachedResult) {
      return finish(cachedResult.transcription, cachedResult.detectedLanguage, true, cachedResult.segments);
    }

    let fileToTranscribe = sourceFile;
    if (!preparedAudioSourceUrl) {
      onProgress?.('准备音频');
      fileToTranscribe = await compressAudio(
        sourceFile,
        getEffectiveCompressionLevel(providerConfig.provider, sourceFile, compressionLevel || CompressionLevel.ORIGINAL),
      );
      if (signal.aborted) {
        throw createAbortError();
      }
    }

    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    signal.addEventListener('abort', forwardAbort, { once: true });

    try {
      const result = await transcribePreparedAudio({
        file: fileToTranscribe,
        audioSourceUrl: preparedAudioSourceUrl,
        controller,
        context,
        language,
        enableItn,
        trimSilence,
        enableLongAudioChunking,
        asrConfig: providerConfig,
        setProgress: (message) => onProgress?.(message),
      });

      if (result.transcription) {
        await setCachedTranscription(cacheKey, {
          ...result,
          provider: providerConfig.provider,
          createdAt: Date.now(),
        });
      }

      return finish(result.transcription, result.detectedLanguage, false, result.segments);
    } finally {
      signal.removeEventListener('abort', forwardAbort);
    }
  } catch (error) {
    if (isAbortError(error)) {
      return createErrorResult({ sample, target, startedAt, status: 'cancelled', message: '已取消' });
    }

    const message = error instanceof Error ? error.message : 'Benchmark 运行失败。';
    return createErrorResult({ sample, target, startedAt, message });
  }
};
