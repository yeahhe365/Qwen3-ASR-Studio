import type { TranscriptionSegment } from '../types';
import type {
  BenchmarkManifestParseError,
  BenchmarkManifestParseResult,
  BenchmarkSample,
  BenchmarkSpeakerTurn,
} from './benchmarkTypes';
import { isValidHttpUrl } from './remoteAudioFile';

type RawManifestRow = Record<string, unknown>;

const FIELD_ALIASES = {
  id: ['id', 'sampleId', 'sample_id', 'uid'],
  audioUrl: ['audioUrl', 'audio_url', 'url', 'audio', 'sourceUrl', 'source_url'],
  fileName: ['fileName', 'file_name', 'filename', 'file', 'path', 'audioFile', 'audio_file'],
  referenceText: ['referenceText', 'reference_text', 'reference', 'transcript', 'text', 'groundTruth', 'ground_truth'],
  language: ['language', 'lang', 'locale'],
  domain: ['domain', 'category', 'scenario'],
  duration: ['duration', 'durationSeconds', 'duration_seconds', 'seconds'],
  speaker: ['speaker', 'speakerId', 'speaker_id'],
  noise: ['noise', 'noiseLevel', 'noise_level', 'environment'],
  accent: ['accent', 'dialect'],
  tags: ['tags', 'tag'],
  keywords: ['keywords', 'keyword', 'hotwords', 'hot_words'],
  names: ['names', 'properNouns', 'proper_nouns', 'people'],
  terms: ['terms', 'terminology', 'domainTerms', 'domain_terms'],
  referenceSegments: ['referenceSegments', 'reference_segments', 'segments'],
  speakerTurns: ['speakerTurns', 'speaker_turns', 'diarization', 'speaker_segments'],
} as const;

const normalizeHeader = (value: string) => value.trim().replace(/^\uFEFF/, '').toLowerCase();

const createHeaderIndex = (headers: string[]) => {
  const normalized = new Map<string, string>();
  headers.forEach((header) => {
    normalized.set(normalizeHeader(header), header);
  });
  return normalized;
};

const getValue = (row: RawManifestRow, field: keyof typeof FIELD_ALIASES) => {
  const keys = new Set(Object.keys(row));
  const normalizedKeyMap = new Map(Array.from(keys).map((key) => [normalizeHeader(key), key]));

  for (const alias of FIELD_ALIASES[field]) {
    const key = normalizedKeyMap.get(normalizeHeader(alias));
    if (key && row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }

  return undefined;
};

const stringifyValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  return '';
};

const parseList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map(stringifyValue).filter(Boolean);
  }

  const rawValue = stringifyValue(value);
  if (!rawValue) {
    return [];
  }

  if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(stringifyValue).filter(Boolean);
      }
    } catch {
      // Fall through to separator parsing.
    }
  }

  return rawValue
    .split(/[|,;，；、]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseDurationSeconds = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  const rawValue = stringifyValue(value);
  if (!rawValue) {
    return undefined;
  }

  const numericValue = Number(rawValue);
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  const timeParts = rawValue.split(':').map((part) => Number(part));
  if (timeParts.length >= 2 && timeParts.length <= 3 && timeParts.every((part) => Number.isFinite(part))) {
    return timeParts.reduce((total, part) => total * 60 + part, 0);
  }

  return undefined;
};

const parseJsonArray = <T>(value: unknown): T[] | undefined => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  const rawValue = stringifyValue(value);
  if (!rawValue) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
};

const parseCsvRows = (content: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  return rows;
};

const parseCsvManifest = (content: string): { rows: RawManifestRow[]; errors: BenchmarkManifestParseError[] } => {
  const csvRows = parseCsvRows(content);
  if (csvRows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: 'CSV 为空。' }] };
  }

  const headers = csvRows[0].map((header) => header.trim());
  const headerIndex = createHeaderIndex(headers);
  const rows = csvRows.slice(1).map((values) => {
    const row: RawManifestRow = {};
    headers.forEach((header, index) => {
      row[headerIndex.get(normalizeHeader(header)) ?? header] = values[index]?.trim() ?? '';
    });
    return row;
  });

  return { rows, errors: [] };
};

const parseJsonlManifest = (content: string): { rows: RawManifestRow[]; errors: BenchmarkManifestParseError[] } => {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return { rows: [], errors: [{ row: 0, message: 'JSONL 为空。' }] };
  }

  if (trimmedContent.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmedContent) as unknown;
      if (Array.isArray(parsed)) {
        return {
          rows: parsed.filter((item): item is RawManifestRow => Boolean(item) && typeof item === 'object'),
          errors: [],
        };
      }
    } catch (error) {
      return {
        rows: [],
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'JSON 数组解析失败。' }],
      };
    }
  }

  const rows: RawManifestRow[] = [];
  const errors: BenchmarkManifestParseError[] = [];
  content.split(/\r?\n/).forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return;
    }

    try {
      const parsed = JSON.parse(trimmedLine) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        errors.push({ row: index + 1, message: '该行不是 JSON 对象。' });
        return;
      }
      rows.push(parsed as RawManifestRow);
    } catch (error) {
      errors.push({ row: index + 1, message: error instanceof Error ? error.message : 'JSONL 行解析失败。' });
    }
  });

  return { rows, errors };
};

const normalizeSample = (row: RawManifestRow, rowIndex: number): { sample?: BenchmarkSample; error?: string } => {
  const audioUrl = stringifyValue(getValue(row, 'audioUrl'));
  const fileName = stringifyValue(getValue(row, 'fileName'));
  const referenceText = stringifyValue(getValue(row, 'referenceText'));
  const id =
    stringifyValue(getValue(row, 'id')) ||
    fileName ||
    audioUrl ||
    `sample-${String(rowIndex + 1).padStart(4, '0')}`;

  if (!referenceText) {
    return { error: '缺少 referenceText / reference / transcript。' };
  }

  if (!audioUrl && !fileName) {
    return { error: '缺少 audioUrl 或 fileName。' };
  }

  if (audioUrl && !isValidHttpUrl(audioUrl)) {
    return { error: 'audioUrl 必须是 http:// 或 https:// 地址。' };
  }

  return {
    sample: {
      id,
      audioUrl: audioUrl || undefined,
      fileName: fileName || undefined,
      referenceText,
      language: stringifyValue(getValue(row, 'language')) || undefined,
      domain: stringifyValue(getValue(row, 'domain')) || undefined,
      durationSeconds: parseDurationSeconds(getValue(row, 'duration')),
      speaker: stringifyValue(getValue(row, 'speaker')) || undefined,
      noise: stringifyValue(getValue(row, 'noise')) || undefined,
      accent: stringifyValue(getValue(row, 'accent')) || undefined,
      tags: parseList(getValue(row, 'tags')),
      keywords: parseList(getValue(row, 'keywords')),
      names: parseList(getValue(row, 'names')),
      terms: parseList(getValue(row, 'terms')),
      referenceSegments: parseJsonArray<TranscriptionSegment>(getValue(row, 'referenceSegments')),
      speakerTurns: parseJsonArray<BenchmarkSpeakerTurn>(getValue(row, 'speakerTurns')),
    },
  };
};

export const parseBenchmarkManifest = (content: string, fileName = ''): BenchmarkManifestParseResult => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const parsedRows =
    extension === 'csv' || (!extension && content.trimStart().includes(','))
      ? parseCsvManifest(content)
      : parseJsonlManifest(content);
  const errors = [...parsedRows.errors];
  const samples: BenchmarkSample[] = [];
  const seenIds = new Set<string>();

  parsedRows.rows.forEach((row, index) => {
    const { sample, error } = normalizeSample(row, index);
    if (!sample) {
      errors.push({ row: index + 1, message: error || '样本解析失败。' });
      return;
    }

    if (seenIds.has(sample.id)) {
      errors.push({ row: index + 1, message: `样本 id 重复：${sample.id}。` });
      return;
    }

    seenIds.add(sample.id);
    samples.push(sample);
  });

  return { samples, errors };
};
