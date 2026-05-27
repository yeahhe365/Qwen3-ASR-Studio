import { DOUBAO_ASR_MODEL, DOUBAO_ASR_QUERY_URL, DOUBAO_ASR_RESOURCE_ID, DOUBAO_ASR_SUBMIT_URL } from '../../constants';
import { Language, type TranscriptionResult, type TranscriptionSegment } from '../../types';
import { createRequestId, getClientUid } from '../clientIdentity';
import { fileToBase64DataUrl, getFileExtension, stripDataUrlPrefix } from '../fileUtils';
import { getAudioSourceUrl } from '../remoteAudioFile';

type DoubaoAsrConfig = {
  apiKey: string;
  accessKey: string;
};

type DoubaoAsrResponse = {
  result?: {
    text?: string;
    language?: string;
    utterances?: DoubaoUtterance[];
  };
  message?: string;
  error?: string;
};

type DoubaoUtterance = {
  text?: string;
  start_time?: number | string;
  end_time?: number | string;
  startTime?: number | string;
  endTime?: number | string;
  speaker?: number | string;
  speaker_id?: number | string;
  speakerId?: number | string;
  confidence?: number | string;
};

type DoubaoAudioFormat = 'raw' | 'wav' | 'mp3' | 'ogg';
type DoubaoAudioInput = { url: string } | { data: string };

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 80;
const SUCCESS_STATUS_CODE = '20000000';
const PROCESSING_STATUS_CODES = new Set(['20000001', '20000002']);
export const DOUBAO_SUPPORTED_AUDIO_FORMATS_LABEL = 'raw/wav/mp3/ogg';

const doubaoAudioExtensionToFormat: Record<string, DoubaoAudioFormat> = {
  mp3: 'mp3',
  oga: 'ogg',
  ogg: 'ogg',
  pcm: 'raw',
  raw: 'raw',
  wav: 'wav',
};

const doubaoAudioMimeTypeToFormat = new Map<string, DoubaoAudioFormat>([
  ['application/ogg', 'ogg'],
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/ogg', 'ogg'],
  ['audio/wav', 'wav'],
  ['audio/wave', 'wav'],
  ['audio/x-wav', 'wav'],
]);

const doubaoLanguageMap: Partial<Record<Language, string>> = {
  [Language.CHINESE]: 'zh-CN',
  [Language.ENGLISH]: 'en-US',
  [Language.JAPANESE]: 'ja-JP',
  [Language.KOREAN]: 'ko-KR',
  [Language.SPANISH]: 'es-MX',
  [Language.FRENCH]: 'fr-FR',
  [Language.GERMAN]: 'de-DE',
  [Language.ARABIC]: 'ar-SA',
  [Language.ITALIAN]: 'it-IT',
  [Language.RUSSIAN]: 'ru-RU',
  [Language.PORTUGUESE]: 'pt-BR',
};

const createAuthHeaders = (apiKey: string, accessKey: string) => {
  if (accessKey) {
    return {
      'X-Api-App-Key': apiKey,
      'X-Api-Access-Key': accessKey,
    };
  }

  return {
    'X-Api-Key': apiKey,
  };
};

const createDoubaoRequestBody = (
  uid: string,
  audioInput: DoubaoAudioInput,
  audioFormat: DoubaoAudioFormat,
  language: Language,
  enableItn: boolean,
) => {
  const detectedLanguage = getDoubaoLanguage(language);

  return {
    user: {
      uid,
    },
    audio: {
      ...audioInput,
      format: audioFormat,
      ...(detectedLanguage ? { language: detectedLanguage } : {}),
    },
    request: {
      model_name: DOUBAO_ASR_MODEL,
      enable_itn: enableItn,
      enable_punc: true,
      show_utterances: true,
    },
  };
};

export const getDoubaoAudioFormat = (audioFile: File) => {
  const extension = getFileExtension(audioFile);
  const formatFromExtension = doubaoAudioExtensionToFormat[extension];
  if (formatFromExtension) {
    return formatFromExtension;
  }

  const mimeType = audioFile.type.split(';')[0]?.trim().toLowerCase();
  const formatFromMimeType = mimeType ? doubaoAudioMimeTypeToFormat.get(mimeType) : null;
  if (formatFromMimeType) {
    return formatFromMimeType;
  }

  throw new Error(
    `豆包录音文件标准版 2.0 仅支持 ${DOUBAO_SUPPORTED_AUDIO_FORMATS_LABEL} 格式。请提供支持的本地音频或带有效后缀的在线音频 URL。`,
  );
};

const getDoubaoLanguage = (language: Language) => {
  if (language === Language.AUTO) {
    return null;
  }

  return doubaoLanguageMap[language] || language;
};

const waitForPollInterval = (signal: AbortSignal) => {
  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timeoutId = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, POLL_INTERVAL_MS);

    signal.addEventListener('abort', handleAbort, { once: true });
  });
};

const getDoubaoStatus = (response: Response) => ({
  statusCode: response.headers.get('X-Api-Status-Code'),
  apiMessage: response.headers.get('X-Api-Message'),
  logId: response.headers.get('X-Tt-Logid'),
});

const createAbortError = () => new DOMException('Aborted', 'AbortError');

const parseFiniteNumber = (value: number | string | undefined) => {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsedValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const parseDoubaoMilliseconds = (value: number | string | undefined) => {
  const parsedValue = parseFiniteNumber(value);
  return parsedValue === undefined ? undefined : Math.max(0, parsedValue / 1000);
};

const parseDoubaoSeconds = (value: number | string | undefined) => {
  const parsedValue = parseFiniteNumber(value);
  return parsedValue === undefined ? undefined : Math.max(0, parsedValue);
};

const getDoubaoSpeaker = (utterance: DoubaoUtterance) => {
  const speaker = utterance.speaker ?? utterance.speaker_id ?? utterance.speakerId;
  return speaker === undefined || speaker === '' ? undefined : String(speaker);
};

const parseDoubaoUtteranceSegments = (utterances?: DoubaoUtterance[]): TranscriptionSegment[] => {
  if (!utterances?.length) {
    return [];
  }

  return utterances
    .map((utterance, index): TranscriptionSegment | null => {
      const text = utterance.text?.trim();
      if (!text) {
        return null;
      }

      return {
        id: `utterance-${index + 1}`,
        text,
        startTime:
          utterance.start_time !== undefined
            ? parseDoubaoMilliseconds(utterance.start_time)
            : parseDoubaoSeconds(utterance.startTime),
        endTime:
          utterance.end_time !== undefined
            ? parseDoubaoMilliseconds(utterance.end_time)
            : parseDoubaoSeconds(utterance.endTime),
        speaker: getDoubaoSpeaker(utterance),
        confidence: parseFiniteNumber(utterance.confidence),
      };
    })
    .filter((segment): segment is TranscriptionSegment => Boolean(segment));
};

const getDoubaoTranscription = (result: DoubaoAsrResponse | null) => {
  const text = result?.result?.text?.trim();
  if (text) {
    return text;
  }

  return parseDoubaoUtteranceSegments(result?.result?.utterances)
    .map((segment) => segment.text)
    .join('\n')
    .trim();
};

const parseDoubaoResponse = (response: Response, result: DoubaoAsrResponse | null): TranscriptionResult => {
  const { statusCode, apiMessage, logId } = getDoubaoStatus(response);

  if (statusCode && statusCode !== SUCCESS_STATUS_CODE) {
    const detail = apiMessage || result?.message || result?.error || '未知错误';
    throw new Error(`豆包 API 请求失败 (${statusCode})：${detail}${logId ? `，LogId: ${logId}` : ''}`);
  }

  const transcription = getDoubaoTranscription(result);
  if (!transcription) {
    throw new Error(`豆包 API 返回了空识别结果${logId ? `，LogId: ${logId}` : ''}。`);
  }

  const segments = parseDoubaoUtteranceSegments(result?.result?.utterances);

  return {
    transcription,
    detectedLanguage: result?.result?.language || '自动识别',
    ...(segments.length ? { segments } : {}),
  };
};

const assertSubmitAccepted = async (response: Response) => {
  const result = (await response.json().catch(() => null)) as DoubaoAsrResponse | null;
  const { statusCode, apiMessage } = getDoubaoStatus(response);

  if (!response.ok || (statusCode && statusCode !== SUCCESS_STATUS_CODE)) {
    const detail = apiMessage || result?.message || result?.error || `HTTP ${response.status}`;
    throw new Error(`豆包标准版 2.0 提交失败${statusCode ? ` (${statusCode})` : ''}：${detail}`);
  }
};

const queryDoubaoResult = async (apiKey: string, accessKey: string, requestId: string, signal: AbortSignal) => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await waitForPollInterval(signal);
    }

    const response = await fetch(DOUBAO_ASR_QUERY_URL, {
      method: 'POST',
      headers: {
        ...createAuthHeaders(apiKey, accessKey),
        'Content-Type': 'application/json',
        'X-Api-Resource-Id': DOUBAO_ASR_RESOURCE_ID,
        'X-Api-Request-Id': requestId,
      },
      body: '{}',
      signal,
    });

    const result = (await response.json().catch(() => null)) as DoubaoAsrResponse | null;
    const { statusCode, apiMessage } = getDoubaoStatus(response);

    if (!response.ok) {
      const detail = apiMessage || result?.message || result?.error || `HTTP ${response.status}`;
      throw new Error(`豆包标准版 2.0 查询失败${statusCode ? ` (${statusCode})` : ''}：${detail}`);
    }

    if (!statusCode || statusCode === SUCCESS_STATUS_CODE) {
      return parseDoubaoResponse(response, result);
    }

    if (PROCESSING_STATUS_CODES.has(statusCode)) {
      continue;
    }

    const detail = apiMessage || result?.message || result?.error || '未知错误';
    throw new Error(`豆包标准版 2.0 查询失败 (${statusCode})：${detail}`);
  }

  throw new Error('豆包标准版 2.0 查询超时，请稍后重试。');
};

export const transcribeWithDoubao = async (
  audioFile: File,
  _context: string,
  language: Language,
  enableItn: boolean,
  config: DoubaoAsrConfig,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const apiKey = config.apiKey.trim();
  const accessKey = config.accessKey.trim();

  if (!apiKey) {
    throw new Error('豆包 API Key 未设置。请在设置中配置。');
  }

  const audioSourceUrl = getAudioSourceUrl(audioFile);
  const audioFormat = getDoubaoAudioFormat(audioFile);
  const audioInput: DoubaoAudioInput = audioSourceUrl
    ? { url: audioSourceUrl }
    : { data: stripDataUrlPrefix(await fileToBase64DataUrl(audioFile)) };

  if (signal.aborted) {
    throw createAbortError();
  }

  const requestId = createRequestId();
  const response = await fetch(DOUBAO_ASR_SUBMIT_URL, {
    method: 'POST',
    headers: {
      ...createAuthHeaders(apiKey, accessKey),
      'Content-Type': 'application/json',
      'X-Api-Resource-Id': DOUBAO_ASR_RESOURCE_ID,
      'X-Api-Request-Id': requestId,
      'X-Api-Sequence': '-1',
    },
    body: JSON.stringify(createDoubaoRequestBody(getClientUid(), audioInput, audioFormat, language, enableItn)),
    signal,
  });

  await assertSubmitAccepted(response);
  return queryDoubaoResult(apiKey, accessKey, requestId, signal);
};
