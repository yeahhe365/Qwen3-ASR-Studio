export const sanitizeExportFileName = (name: string) => {
  const sanitized = name
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^[.-]+|[.-]+$/g, '');

  return /[\p{L}\p{N}]/u.test(sanitized) ? sanitized : 'export';
};

export const formatExportTimestamp = (timestamp = Date.now()) => {
  const candidateDate = new Date(timestamp);
  const date = Number.isFinite(candidateDate.getTime()) ? candidateDate : new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join('-');
};

type CreateExportFileNameOptions = {
  prefix: string;
  extension: string;
  sourceName?: string;
  timestamp?: number;
};

export const createExportFileName = ({ prefix, extension, sourceName, timestamp }: CreateExportFileNameOptions) => {
  const baseName = sourceName
    ? sanitizeExportFileName(sourceName)
    : `${sanitizeExportFileName(prefix)}-${formatExportTimestamp(timestamp)}`;
  const safeExtension =
    extension
      .trim()
      .replace(/^\.+/, '')
      .replace(/[^a-z0-9]+/gi, '')
      .toLowerCase() || 'txt';

  return `${baseName}.${safeExtension}`;
};
