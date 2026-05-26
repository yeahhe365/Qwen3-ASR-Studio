import { AsrProvider, CompressionLevel, Language, type HistoryItem } from '../types';
import { normalizeHistorySegments } from './historySegments';
import { getJsonBoolean, getJsonEnumValue, getJsonNumber, getJsonString, isJsonRecord } from './jsonValue';
import { isValidHttpUrl } from './remoteAudioFile';

const getImportRecords = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isJsonRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.history)) {
    return payload.history;
  }

  if (typeof payload.transcription === 'string') {
    return [payload];
  }

  return [];
};

const createImportedId = (candidate: unknown, index: number, usedIds: Set<number>, now: number) => {
  const fallbackId = Math.max(1, now + index);
  let id = typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0 ? candidate : fallbackId;

  if (usedIds.has(id)) {
    id = fallbackId;
  }

  while (usedIds.has(id)) {
    id += 1;
  }

  usedIds.add(id);
  return id;
};

const getAudioUrl = (value: unknown) => {
  const audioUrl = getJsonString(value).trim();
  if (!audioUrl) {
    return undefined;
  }

  return isValidHttpUrl(audioUrl) ? audioUrl : undefined;
};

export const parseHistoryImportPayload = (
  payload: unknown,
  options: { usedIds?: Set<number>; now?: number } = {},
): HistoryItem[] => {
  const records = getImportRecords(payload);
  const usedIds = new Set(options.usedIds ?? []);
  const nowCandidate = options.now ?? Date.now();
  const now = Number.isFinite(nowCandidate) ? Math.max(1, Math.trunc(nowCandidate)) : Date.now();

  return records
    .map((record, index): HistoryItem | null => {
      if (!isJsonRecord(record)) {
        return null;
      }

      const transcription = getJsonString(record.transcription).trim();
      if (!transcription) {
        return null;
      }

      const fileName =
        getJsonString(record.fileName).trim() || getJsonString(record.sourceFile).trim() || `imported-${index + 1}.txt`;
      const timestamp = getJsonNumber(record.timestamp) ?? getJsonNumber(record.createdAt) ?? Math.max(0, now - index);
      const provider = getJsonEnumValue(AsrProvider, record.provider) as AsrProvider | undefined;
      const language = getJsonEnumValue(Language, record.language) as Language | undefined;
      const compressionLevel = getJsonEnumValue(CompressionLevel, record.compressionLevel) as
        | CompressionLevel
        | undefined;

      return {
        id: createImportedId(record.id, index, usedIds, now),
        fileName,
        transcription,
        detectedLanguage: getJsonString(record.detectedLanguage),
        context: getJsonString(record.context),
        timestamp,
        audioUrl: getAudioUrl(record.audioUrl),
        segments: normalizeHistorySegments(transcription, record.segments, { fallbackToTextSegments: true }),
        provider,
        language,
        enableItn: getJsonBoolean(record.enableItn),
        compressionLevel,
        trimSilence: getJsonBoolean(record.trimSilence),
        enableLongAudioChunking: getJsonBoolean(record.enableLongAudioChunking),
      };
    })
    .filter((item): item is HistoryItem => Boolean(item))
    .sort((a, b) => b.timestamp - a.timestamp);
};

export const parseHistoryImportJson = (
  json: string,
  options: { usedIds?: Set<number>; now?: number } = {},
): HistoryItem[] => {
  return parseHistoryImportPayload(JSON.parse(json), options);
};
