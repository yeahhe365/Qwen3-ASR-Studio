import { formatByteSize, getFileExtension } from './fileUtils';

const getTimestampLabel = (date = new Date()) => {
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
  const year = safeDate.getFullYear();
  const month = (safeDate.getMonth() + 1).toString().padStart(2, '0');
  const day = safeDate.getDate().toString().padStart(2, '0');
  const hours = safeDate.getHours().toString().padStart(2, '0');
  const minutes = safeDate.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}`;
};

const audioMimeTypeToExtension = new Map([
  ['audio/aac', 'aac'],
  ['audio/flac', 'flac'],
  ['audio/mp4', 'm4a'],
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/ogg', 'ogg'],
  ['audio/opus', 'opus'],
  ['audio/wav', 'wav'],
  ['audio/wave', 'wav'],
  ['audio/webm', 'webm'],
  ['audio/x-m4a', 'm4a'],
  ['audio/x-wav', 'wav'],
]);

const supportedAudioInputExtensions = new Set(['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav', 'webm']);

export const isSupportedAudioInputFile = (file: File) => {
  const normalizedMimeType = file.type.split(';')[0]?.trim().toLowerCase();
  if (normalizedMimeType?.startsWith('audio/')) {
    return true;
  }

  return supportedAudioInputExtensions.has(getFileExtension(file));
};

export const filterSupportedAudioInputFiles = (files: File[]) => {
  return files.filter(isSupportedAudioInputFile);
};

export const getExtensionFromMimeType = (mimeType: string, fallback = 'webm') => {
  const normalizedMimeType = mimeType.split(';')[0]?.trim().toLowerCase();
  if (!normalizedMimeType) {
    return fallback;
  }

  const mappedExtension = audioMimeTypeToExtension.get(normalizedMimeType);
  if (mappedExtension) {
    return mappedExtension;
  }

  return normalizedMimeType.split('/')[1]?.replace(/[^a-z0-9]+/g, '') || fallback;
};

export const createTimestampedAudioFile = (
  chunks: BlobPart[],
  mimeType: string,
  prefix: string,
  recordedAt = new Date(),
) => {
  const audioBlob = new Blob(chunks, { type: mimeType });
  const fileExtension = getExtensionFromMimeType(mimeType);
  return new File([audioBlob], `${prefix}-${getTimestampLabel(recordedAt)}.${fileExtension}`, { type: mimeType });
};

export const formatAudioFileSize = (bytes: number) => {
  return formatByteSize(bytes, { zeroLabel: '0 Bytes' });
};

export const formatAudioTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
