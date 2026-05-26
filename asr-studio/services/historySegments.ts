import type { TranscriptionSegment } from '../types';
import { getJsonNonnegativeNumber, getJsonNumber, getJsonString, isJsonRecord } from './jsonValue';
import { normalizeSegments } from './transcriptionSegments';

type SegmentNumberMode = 'raw' | 'nonnegative';

const getSegmentNumber = (value: unknown, mode: SegmentNumberMode) => {
  return mode === 'nonnegative' ? getJsonNonnegativeNumber(value) : getJsonNumber(value);
};

export const normalizeHistorySegments = (
  transcription: string,
  value: unknown,
  options: { fallbackToTextSegments?: boolean; numberMode?: SegmentNumberMode } = {},
) => {
  const { fallbackToTextSegments = false, numberMode = 'raw' } = options;
  if (!Array.isArray(value)) {
    return fallbackToTextSegments ? normalizeSegments(transcription) : undefined;
  }

  const segments = value
    .map((segment, index): TranscriptionSegment | null => {
      if (!isJsonRecord(segment)) {
        return null;
      }

      const text = getJsonString(segment.text).trim();
      if (!text) {
        return null;
      }

      return {
        id: getJsonString(segment.id, `segment-${index + 1}`),
        text,
        startTime: getSegmentNumber(segment.startTime, numberMode),
        endTime: getSegmentNumber(segment.endTime, numberMode),
        speaker: getJsonString(segment.speaker) || undefined,
        confidence: getSegmentNumber(segment.confidence, numberMode),
      };
    })
    .filter((segment): segment is TranscriptionSegment => Boolean(segment));

  if (!segments.length && !fallbackToTextSegments) {
    return undefined;
  }

  return normalizeSegments(transcription, segments);
};
