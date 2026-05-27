import { DOUBAO_ASR_RESOURCE_ID, NVIDIA_NIM_ASR_MODEL } from '../constants';
import { AsrProvider, NvidiaNimTask, type AsrProviderConfig, type CompressionLevel, type Language } from '../types';
import { getMainstreamAsrModelDescriptor } from './providers/mainstreamAsrCatalog';
import { normalizeMainstreamAsrBaseUrl } from './providers/mainstreamAsrProvider';
import { normalizeNvidiaNimBaseUrl } from './providers/nvidiaNimProvider';

type TranscriptionCacheSource =
  | {
      type: 'remote-url';
      value: string;
    }
  | {
      type: 'file-hash';
      value: string;
    };

type CreateTranscriptionCacheKeyOptions = {
  source: TranscriptionCacheSource;
  config: AsrProviderConfig;
  language: Language;
  enableItn: boolean;
  compressionLevel: CompressionLevel;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
  context: string;
  benchmarkOptions?: Record<string, unknown>;
};

export const createTranscriptionCacheSource = (fileHash: string, audioSourceUrl?: string): TranscriptionCacheSource => {
  const normalizedUrl = audioSourceUrl?.trim();
  if (normalizedUrl) {
    return {
      type: 'remote-url',
      value: normalizedUrl,
    };
  }

  return {
    type: 'file-hash',
    value: fileHash,
  };
};

export const createProviderCacheDescriptor = (config: AsrProviderConfig) => {
  if (config.provider === AsrProvider.DOUBAO) {
    return {
      provider: config.provider,
      resourceId: DOUBAO_ASR_RESOURCE_ID,
    };
  }

  if (config.provider === AsrProvider.NVIDIA_NIM) {
    return {
      provider: config.provider,
      model: NVIDIA_NIM_ASR_MODEL,
      baseUrl: normalizeNvidiaNimBaseUrl(config.nvidiaNimBaseUrl),
      task: config.nvidiaNimTask ?? NvidiaNimTask.TRANSCRIBE,
    };
  }

  if (config.provider === AsrProvider.MAINSTREAM) {
    const descriptor = getMainstreamAsrModelDescriptor(config.mainstreamAsrModel);
    return {
      provider: config.provider,
      model: descriptor.modelName,
      vendor: descriptor.vendor,
      baseUrl: normalizeMainstreamAsrBaseUrl(config.mainstreamAsrBaseUrl),
    };
  }

  return {
    provider: config.provider,
  };
};

export const createTranscriptionCacheKey = ({
  source,
  config,
  language,
  enableItn,
  compressionLevel,
  trimSilence,
  enableLongAudioChunking,
  context,
  benchmarkOptions,
}: CreateTranscriptionCacheKeyOptions) => {
  return JSON.stringify({
    version: 3,
    source,
    provider: createProviderCacheDescriptor(config),
    options: {
      language,
      enableItn,
      compressionLevel,
      trimSilence,
      enableLongAudioChunking,
      context: context.trim(),
      benchmarkOptions: benchmarkOptions ?? null,
    },
  });
};
