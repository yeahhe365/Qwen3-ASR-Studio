type RemoteAudioFile = File & {
  sourceUrl?: string;
};

const REMOTE_AUDIO_FALLBACK_FILE_NAME = 'remote-audio';

export const parseHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

export const isValidHttpUrl = (value: string) => {
  return Boolean(parseHttpUrl(value));
};

const normalizeHostname = (hostname: string) => {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
};

const isPrivateIpv4Address = (hostname: string) => {
  const octets = hostname.split('.');
  if (octets.length !== 4) {
    return false;
  }

  const numbers = octets.map((octet) => {
    if (!/^\d+$/.test(octet)) {
      return Number.NaN;
    }
    return Number(octet);
  });

  if (numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  const [first, second, third] = numbers;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
    (first === 203 && second === 0 && third === 113)
  );
};

const isPrivateIpv6Address = (hostname: string) => {
  if (!hostname.includes(':')) {
    return false;
  }

  return (
    hostname === '::' ||
    hostname === '::1' ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fe80:')
  );
};

export const isServerAccessibleHttpUrl = (value: string) => {
  const url = parseHttpUrl(value);
  if (!url) {
    return false;
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return false;
  }

  return !isPrivateIpv4Address(hostname) && !isPrivateIpv6Address(hostname);
};

export const getFileNameFromRemoteAudioUrl = (sourceUrl: string) => {
  const url = parseHttpUrl(sourceUrl);
  if (!url) {
    return REMOTE_AUDIO_FALLBACK_FILE_NAME;
  }

  if (!url.pathname || url.pathname.endsWith('/')) {
    return REMOTE_AUDIO_FALLBACK_FILE_NAME;
  }

  const rawFileName = url.pathname.split('/').filter(Boolean).pop();
  if (!rawFileName) {
    return REMOTE_AUDIO_FALLBACK_FILE_NAME;
  }

  try {
    const decodedFileName = decodeURIComponent(rawFileName).trim();
    return decodedFileName || REMOTE_AUDIO_FALLBACK_FILE_NAME;
  } catch {
    return rawFileName.trim() || REMOTE_AUDIO_FALLBACK_FILE_NAME;
  }
};

export const getAudioSourceUrl = (file: File) => {
  return (file as RemoteAudioFile).sourceUrl;
};

export const createRemoteAudioFile = (sourceUrl: string) => {
  const normalizedUrl = sourceUrl.trim();
  const fileName = getFileNameFromRemoteAudioUrl(normalizedUrl);

  const file = new File([''], fileName, { type: '' }) as RemoteAudioFile;
  Object.defineProperty(file, 'sourceUrl', {
    value: normalizedUrl,
    enumerable: true,
  });

  return file;
};
