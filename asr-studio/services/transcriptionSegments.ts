import type { TranscriptionSegment } from '../types';

export const createSegmentsFromText = (text: string): TranscriptionSegment[] => {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `line-${index + 1}`,
      text: line,
    }));
};

export const normalizeSegments = (text: string, segments?: TranscriptionSegment[]) => {
  const usableSegments = segments?.filter((segment) => segment.text.trim());
  return usableSegments?.length ? usableSegments : createSegmentsFromText(text);
};
