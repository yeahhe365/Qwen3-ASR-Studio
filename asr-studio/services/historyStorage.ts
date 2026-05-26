import type { HistoryItem } from '../types';
import { getJsonBoolean, getJsonNonnegativeNumber, getJsonString, isJsonRecord } from './jsonValue';
import { normalizeHistorySegments } from './historySegments';
import { isValidHttpUrl } from './remoteAudioFile';
import { isAsrProvider, isCompressionLevel, isLanguage } from './typeGuards';

const getTimestamp = (value: unknown) => {
  const timestamp = getJsonNonnegativeNumber(value);
  return typeof timestamp === 'number' ? Math.trunc(timestamp) : 0;
};

const getAudioUrl = (value: unknown) => {
  const audioUrl = getJsonString(value).trim();
  return audioUrl && isValidHttpUrl(audioUrl) ? audioUrl : undefined;
};

const getAudioFile = (value: unknown) => {
  return value instanceof File ? value : undefined;
};

export const normalizeStoredHistoryItem = (value: unknown): HistoryItem | null => {
  if (!isJsonRecord(value)) {
    return null;
  }

  const id = value.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  const transcription = getJsonString(value.transcription).trim();
  if (!transcription) {
    return null;
  }

  const provider = isAsrProvider(value.provider) ? value.provider : undefined;
  const language = isLanguage(value.language) ? value.language : undefined;
  const compressionLevel = isCompressionLevel(value.compressionLevel) ? value.compressionLevel : undefined;

  return {
    id,
    fileName: getJsonString(value.fileName).trim() || '未命名音频',
    transcription,
    detectedLanguage: getJsonString(value.detectedLanguage),
    context: getJsonString(value.context),
    timestamp: getTimestamp(value.timestamp),
    audioFile: getAudioFile(value.audioFile),
    audioUrl: getAudioUrl(value.audioUrl),
    segments: normalizeHistorySegments(transcription, value.segments, { numberMode: 'nonnegative' }),
    provider,
    language,
    enableItn: getJsonBoolean(value.enableItn),
    compressionLevel,
    trimSilence: getJsonBoolean(value.trimSilence),
    enableLongAudioChunking: getJsonBoolean(value.enableLongAudioChunking),
  };
};

export const normalizeStoredHistoryItems = (value: unknown): HistoryItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeStoredHistoryItem)
    .filter((item): item is HistoryItem => Boolean(item))
    .sort((a, b) => b.timestamp - a.timestamp || b.id - a.id);
};
