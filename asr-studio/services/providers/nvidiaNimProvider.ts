import { NVIDIA_NIM_TRANSCRIPTIONS_PATH, NVIDIA_NIM_TRANSLATIONS_PATH } from '../../constants';
import { Language, NvidiaNimTask, type TranscriptionResult } from '../../types';

type NvidiaNimAsrConfig = {
  baseUrl: string;
  apiKey: string;
  task?: NvidiaNimTask;
};

type NvidiaNimTranscriptionResponse = {
  text?: string;
  transcript?: string;
  language?: string;
  detected_language?: string;
  error?:
    | {
        message?: string;
      }
    | string;
  detail?: string | Array<{ msg?: string; message?: string }>;
  results?: Array<{
    text?: string;
    transcript?: string;
  }>;
};

const nvidiaNimLanguageMap: Partial<Record<Language, string>> = {
  [Language.CHINESE]: 'zh-CN',
  [Language.ENGLISH]: 'en-US',
  [Language.JAPANESE]: 'ja-JP',
  [Language.KOREAN]: 'ko-KR',
  [Language.SPANISH]: 'es-ES',
  [Language.FRENCH]: 'fr-FR',
  [Language.GERMAN]: 'de-DE',
  [Language.ARABIC]: 'ar-AR',
  [Language.ITALIAN]: 'it-IT',
  [Language.RUSSIAN]: 'ru-RU',
  [Language.PORTUGUESE]: 'pt-BR',
};

export const normalizeNvidiaNimBaseUrl = (baseUrl: string) => {
  return baseUrl.trim().replace(/\/+$/, '');
};

export const createNvidiaNimTranscriptionsUrl = (baseUrl: string) => {
  return createNvidiaNimAudioEndpointUrl(baseUrl, NvidiaNimTask.TRANSCRIBE);
};

export const getNvidiaNimEndpointPath = (task: NvidiaNimTask | undefined) => {
  return task === NvidiaNimTask.TRANSLATE ? NVIDIA_NIM_TRANSLATIONS_PATH : NVIDIA_NIM_TRANSCRIPTIONS_PATH;
};

export const createNvidiaNimAudioEndpointUrl = (baseUrl: string, task: NvidiaNimTask | undefined) => {
  const normalizedBaseUrl = normalizeNvidiaNimBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error(
      '请在设置中填写 NVIDIA NIM HTTP Base URL。NVIDIA 托管 Whisper Large v3 是 gRPC API，需要通过后端代理转成 HTTP 后才能在浏览器中调用。',
    );
  }

  return `${normalizedBaseUrl}${getNvidiaNimEndpointPath(task)}`;
};

const getNvidiaNimLanguage = (language: Language) => {
  if (language === Language.AUTO) {
    return 'multi';
  }

  return nvidiaNimLanguageMap[language] || language;
};

const createFormData = (audioFile: File, language: Language, task: NvidiaNimTask) => {
  const formData = new FormData();
  if (task === NvidiaNimTask.TRANSCRIBE) {
    formData.append('language', getNvidiaNimLanguage(language));
  }
  formData.append('file', audioFile, audioFile.name || 'audio.wav');
  return formData;
};

const extractErrorDetail = (result: NvidiaNimTranscriptionResponse | null) => {
  if (!result) {
    return null;
  }

  if (typeof result.error === 'string') {
    return result.error;
  }

  if (result.error?.message) {
    return result.error.message;
  }

  if (typeof result.detail === 'string') {
    return result.detail;
  }

  const detail = result.detail
    ?.map((item) => item.message || item.msg)
    .filter(Boolean)
    .join('; ');
  return detail || null;
};

const extractTranscription = (result: NvidiaNimTranscriptionResponse | string | null) => {
  if (!result) {
    return '';
  }

  if (typeof result === 'string') {
    return result.trim();
  }

  const transcription =
    result.text ||
    result.transcript ||
    result.results
      ?.map((item) => item.text || item.transcript || '')
      .filter(Boolean)
      .join('\n');

  return transcription?.trim() || '';
};

const parseDetectedLanguage = (result: NvidiaNimTranscriptionResponse | string | null, fallbackLanguage: Language) => {
  if (result && typeof result !== 'string') {
    const detectedLanguage = result.language || result.detected_language;
    if (detectedLanguage) {
      return detectedLanguage;
    }
  }

  return fallbackLanguage === Language.AUTO ? '自动识别' : fallbackLanguage;
};

const parseResponseBody = async (response: Response) => {
  const responseText = await response.text();
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as NvidiaNimTranscriptionResponse;
  } catch {
    return responseText;
  }
};

export const transcribeWithNvidiaNim = async (
  audioFile: File,
  _context: string,
  language: Language,
  _enableItn: boolean,
  config: NvidiaNimAsrConfig,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const apiKey = config.apiKey.trim();
  const task = config.task ?? NvidiaNimTask.TRANSCRIBE;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(createNvidiaNimAudioEndpointUrl(config.baseUrl, task), {
    method: 'POST',
    headers,
    body: createFormData(audioFile, language, task),
    signal,
  });

  const result = await parseResponseBody(response);

  if (!response.ok) {
    const detail =
      extractErrorDetail(typeof result === 'string' ? null : result) ||
      `NVIDIA NIM API 请求失败，状态码: ${response.status}`;
    throw new Error(detail);
  }

  const transcription = extractTranscription(result);
  if (!transcription) {
    throw new Error('NVIDIA NIM API 返回了空识别结果。');
  }

  return {
    transcription,
    detectedLanguage: task === NvidiaNimTask.TRANSLATE ? '英文翻译' : parseDetectedLanguage(result, language),
  };
};
