import {
  type AudioChunk,
  getAudioProcessingFallbackReason,
  splitAudioIntoChunks,
  trimSilenceFromAudio,
} from './audioService';
import { transcribeAudio } from './asrService';
import { AsrProviderConfig, Language, TranscriptionResult } from '../types';
import { normalizeSegments } from './transcriptionSegments';

const LONG_AUDIO_CHUNK_SECONDS = 5 * 60;

export const createAbortError = () => new DOMException('Aborted', 'AbortError');

export const isAbortError = (error: unknown) => error instanceof Error && error.name === 'AbortError';

export const mergeChunkTranscriptionResults = (
  chunks: AudioChunk[],
  results: TranscriptionResult[],
): TranscriptionResult => {
  const transcription = results
    .map((result) => result.transcription.trim())
    .filter(Boolean)
    .join('\n\n');
  const detectedLanguage =
    results.find((result) => result.detectedLanguage && result.detectedLanguage !== '自动识别')?.detectedLanguage ||
    results.find((result) => result.detectedLanguage)?.detectedLanguage ||
    '';
  const segments = results.flatMap((result, resultIndex) => {
    const chunk = chunks[resultIndex];
    const resultSegments = normalizeSegments(result.transcription, result.segments);
    const chunkDuration = Math.max(0, chunk.endTime - chunk.startTime);
    const fallbackSegmentDuration = resultSegments.length > 0 ? chunkDuration / resultSegments.length : 0;

    return resultSegments.map((segment, segmentIndex) => {
      const fallbackStartTime = chunk.startTime + fallbackSegmentDuration * segmentIndex;
      const fallbackEndTime = chunk.startTime + fallbackSegmentDuration * (segmentIndex + 1);
      return {
        ...segment,
        id: `chunk-${chunk.index}-${segment.id || segmentIndex + 1}`,
        startTime: typeof segment.startTime === 'number' ? chunk.startTime + segment.startTime : fallbackStartTime,
        endTime: typeof segment.endTime === 'number' ? chunk.startTime + segment.endTime : fallbackEndTime,
      };
    });
  });

  return {
    transcription,
    detectedLanguage,
    segments,
  };
};

type TranscribePreparedAudioOptions = {
  file: File;
  audioSourceUrl?: string;
  controller: AbortController;
  context: string;
  language: Language;
  enableItn: boolean;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
  asrConfig: AsrProviderConfig;
  setProgress: (message: string) => void;
};

export const transcribePreparedAudio = async ({
  file,
  audioSourceUrl,
  controller,
  context,
  language,
  enableItn,
  trimSilence,
  enableLongAudioChunking,
  asrConfig,
  setProgress,
}: TranscribePreparedAudioOptions) => {
  let fileToTranscribe = file;

  if (trimSilence && !audioSourceUrl) {
    setProgress('正在裁剪首尾静音...');
    fileToTranscribe = await trimSilenceFromAudio(fileToTranscribe);
    if (controller.signal.aborted) {
      throw createAbortError();
    }
    const fallbackReason = getAudioProcessingFallbackReason(fileToTranscribe);
    if (fallbackReason) {
      setProgress(fallbackReason);
    }
  }

  const chunks =
    enableLongAudioChunking && !audioSourceUrl
      ? await splitAudioIntoChunks(fileToTranscribe, LONG_AUDIO_CHUNK_SECONDS)
      : [{ file: fileToTranscribe, index: 1, total: 1, startTime: 0, endTime: 0 }];
  if (controller.signal.aborted) {
    throw createAbortError();
  }

  const chunkFallbackReason = chunks.find((chunk) => getAudioProcessingFallbackReason(chunk.file));
  if (chunkFallbackReason) {
    setProgress(getAudioProcessingFallbackReason(chunkFallbackReason.file) || '已跳过长音频切片。');
  }

  if (chunks.length === 1) {
    return transcribeAudio(chunks[0].file, context, language, enableItn, asrConfig, setProgress, controller.signal);
  }

  const chunkResults: TranscriptionResult[] = [];
  for (const chunk of chunks) {
    if (controller.signal.aborted) {
      throw createAbortError();
    }

    setProgress(`正在识别第 ${chunk.index}/${chunk.total} 段...`);
    chunkResults.push(
      await transcribeAudio(chunk.file, context, language, enableItn, asrConfig, setProgress, controller.signal),
    );
  }

  return mergeChunkTranscriptionResults(chunks, chunkResults);
};
