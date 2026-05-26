import type { AsrProvider, TranscriptionSegment } from '../types';
import { downloadFile } from './downloadFile';
import { createExportFileName, sanitizeExportFileName } from './exportFileName';

export type TranscriptExportFormat = 'txt' | 'md' | 'json' | 'srt' | 'vtt';

export interface TranscriptExportPayload {
  transcription: string;
  detectedLanguage: string;
  segments?: TranscriptionSegment[];
  fileName?: string;
  provider?: AsrProvider;
  createdAt?: number;
}

const DEFAULT_SEGMENT_SECONDS = 3;

const getExportSegments = (payload: TranscriptExportPayload) => {
  const explicitSegments = payload.segments?.filter((segment) => segment.text.trim());
  if (explicitSegments?.length) {
    return explicitSegments;
  }

  return payload.transcription
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `line-${index + 1}`,
      text,
    }));
};

const getSafeSeconds = (seconds: number | undefined, fallback: number) => {
  return typeof seconds === 'number' && Number.isFinite(seconds) ? Math.max(0, seconds) : fallback;
};

const getSegmentCueTimes = (segment: TranscriptionSegment, index: number) => {
  const fallbackStart = index * DEFAULT_SEGMENT_SECONDS;
  const start = getSafeSeconds(segment.startTime, fallbackStart);
  const fallbackEnd = Math.max(start + DEFAULT_SEGMENT_SECONDS, fallbackStart + DEFAULT_SEGMENT_SECONDS);
  const rawEnd = getSafeSeconds(segment.endTime, fallbackEnd);

  return {
    start,
    end: rawEnd > start ? rawEnd : fallbackEnd,
  };
};

const formatSrtTime = (seconds: number) => {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
};

const formatVttTime = (seconds: number) => formatSrtTime(seconds).replace(',', '.');

const formatSubtitleCueText = (text: string) => {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

export const getTranscriptExportMimeType = (format: TranscriptExportFormat) => {
  const mimeTypes: Record<TranscriptExportFormat, string> = {
    txt: 'text/plain;charset=utf-8',
    md: 'text/markdown;charset=utf-8',
    json: 'application/json;charset=utf-8',
    srt: 'application/x-subrip;charset=utf-8',
    vtt: 'text/vtt;charset=utf-8',
  };

  return mimeTypes[format];
};

export const createTranscriptExport = (format: TranscriptExportFormat, payload: TranscriptExportPayload) => {
  const segments = getExportSegments(payload);

  if (format === 'json') {
    return JSON.stringify(
      {
        sourceFile: payload.fileName || null,
        provider: payload.provider || null,
        detectedLanguage: payload.detectedLanguage || null,
        createdAt: payload.createdAt ?? Date.now(),
        transcription: payload.transcription,
        segments,
      },
      null,
      2,
    );
  }

  if (format === 'md') {
    const metadata = [
      `# ${payload.fileName ? sanitizeExportFileName(payload.fileName) : 'Transcript'}`,
      '',
      payload.detectedLanguage ? `- Language: ${payload.detectedLanguage}` : '',
      payload.provider ? `- Provider: ${payload.provider}` : '',
    ].filter(Boolean);

    return `${metadata.join('\n')}\n\n${payload.transcription}`;
  }

  if (format === 'srt') {
    return segments
      .map((segment, index) => {
        const cue = getSegmentCueTimes(segment, index);
        const start = formatSrtTime(cue.start);
        const end = formatSrtTime(cue.end);
        return `${index + 1}\n${start} --> ${end}\n${formatSubtitleCueText(segment.text)}`;
      })
      .join('\n\n');
  }

  if (format === 'vtt') {
    const cues = segments
      .map((segment, index) => {
        const cue = getSegmentCueTimes(segment, index);
        const start = formatVttTime(cue.start);
        const end = formatVttTime(cue.end);
        return `${start} --> ${end}\n${formatSubtitleCueText(segment.text)}`;
      })
      .join('\n\n');
    return `WEBVTT\n\n${cues}`;
  }

  return payload.transcription;
};

export const downloadTranscriptExport = (format: TranscriptExportFormat, payload: TranscriptExportPayload) => {
  const content = createTranscriptExport(format, payload);
  const blob = new Blob([content], {
    type: getTranscriptExportMimeType(format),
  });
  downloadFile(
    blob,
    createExportFileName({
      prefix: 'transcript',
      extension: format,
      sourceName: payload.fileName,
      timestamp: payload.createdAt,
    }),
  );
};
