export const fileToBase64DataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const stripDataUrlPrefix = (dataUrl: string) => {
  const separatorIndex = dataUrl.indexOf(',');
  return separatorIndex >= 0 ? dataUrl.slice(separatorIndex + 1) : dataUrl;
};

export const getFileExtension = (file: File) => {
  const lastDotIndex = file.name.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === file.name.length - 1) {
    return '';
  }

  return file.name
    .slice(lastDotIndex + 1)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
};

export const estimateBase64ByteSize = (rawByteSize: number) => {
  const safeByteSize = Number.isFinite(rawByteSize) ? Math.max(0, rawByteSize) : 0;
  return Math.ceil(safeByteSize / 3) * 4;
};

export const estimateDataUrlByteSize = (file: File) => {
  const mimeType = file.type || 'application/octet-stream';
  return `data:${mimeType};base64,`.length + estimateBase64ByteSize(file.size);
};

export const getJsonByteSize = (value: unknown) => {
  return new TextEncoder().encode(JSON.stringify(value)).length;
};

export const formatByteSize = (bytes: number, options: { zeroLabel?: string } = {}) => {
  const { zeroLabel = '0 B' } = options;
  const safeBytes = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  if (safeBytes === 0) {
    return zeroLabel;
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(safeBytes) / Math.log(1024)), units.length - 1);
  const value = safeBytes / Math.pow(1024, exponent);
  const decimalPlaces = value >= 10 || exponent === 0 ? 0 : 1;

  return `${parseFloat(value.toFixed(decimalPlaces))} ${units[exponent]}`;
};
