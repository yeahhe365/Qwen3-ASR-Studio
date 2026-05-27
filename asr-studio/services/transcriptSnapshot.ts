import {
  AsrProvider,
  type CompressionLevel,
  type HistoryItem,
  type Language,
  type MainstreamAsrModel,
  type NvidiaNimTask,
} from '../types';
import { isAsrProvider, isCompressionLevel, isLanguage, isMainstreamAsrModel, isNvidiaNimTask } from './typeGuards';

export type TranscriptSaveSnapshotInput = {
  transcription: string;
  detectedLanguage: string;
  context: string;
  provider?: AsrProvider;
  language?: Language;
  enableItn?: boolean;
  compressionLevel?: CompressionLevel;
  trimSilence?: boolean;
  enableLongAudioChunking?: boolean;
  nvidiaNimTask?: NvidiaNimTask;
  mainstreamAsrModel?: MainstreamAsrModel;
};

export type TranscriptSaveSnapshotDefaults = Required<
  Pick<
    TranscriptSaveSnapshotInput,
    | 'provider'
    | 'language'
    | 'enableItn'
    | 'compressionLevel'
    | 'trimSilence'
    | 'enableLongAudioChunking'
    | 'nvidiaNimTask'
    | 'mainstreamAsrModel'
  >
>;

export const createTranscriptSaveSnapshot = (input: TranscriptSaveSnapshotInput) => {
  return JSON.stringify({
    transcription: input.transcription,
    detectedLanguage: input.detectedLanguage,
    context: input.context,
    provider: input.provider ?? null,
    language: input.language ?? null,
    enableItn: input.enableItn ?? null,
    compressionLevel: input.compressionLevel ?? null,
    trimSilence: input.trimSilence ?? null,
    enableLongAudioChunking: input.enableLongAudioChunking ?? null,
    nvidiaNimTask: input.provider === AsrProvider.NVIDIA_NIM ? (input.nvidiaNimTask ?? null) : null,
    mainstreamAsrModel: input.provider === AsrProvider.MAINSTREAM ? (input.mainstreamAsrModel ?? null) : null,
  });
};

export const isTranscriptSaveSnapshotDirty = (current: TranscriptSaveSnapshotInput, savedSnapshot: string | null) => {
  return Boolean(current.transcription) && createTranscriptSaveSnapshot(current) !== savedSnapshot;
};

export const createRestoredTranscriptSaveSnapshot = (item: HistoryItem, defaults: TranscriptSaveSnapshotDefaults) => {
  return createTranscriptSaveSnapshot({
    transcription: item.transcription,
    detectedLanguage: item.detectedLanguage,
    context: item.context,
    provider: isAsrProvider(item.provider) ? item.provider : defaults.provider,
    language: isLanguage(item.language) ? item.language : defaults.language,
    enableItn: typeof item.enableItn === 'boolean' ? item.enableItn : defaults.enableItn,
    compressionLevel: isCompressionLevel(item.compressionLevel) ? item.compressionLevel : defaults.compressionLevel,
    trimSilence: typeof item.trimSilence === 'boolean' ? item.trimSilence : defaults.trimSilence,
    enableLongAudioChunking:
      typeof item.enableLongAudioChunking === 'boolean'
        ? item.enableLongAudioChunking
        : defaults.enableLongAudioChunking,
    nvidiaNimTask: isNvidiaNimTask(item.nvidiaNimTask) ? item.nvidiaNimTask : defaults.nvidiaNimTask,
    mainstreamAsrModel: isMainstreamAsrModel(item.mainstreamAsrModel)
      ? item.mainstreamAsrModel
      : defaults.mainstreamAsrModel,
  });
};
