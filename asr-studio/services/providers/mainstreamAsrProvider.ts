import { Language, type MainstreamAsrModel, type TranscriptionResult, type TranscriptionSegment } from '../../types';
import { getAudioSourceUrl } from '../remoteAudioFile';
import { getMainstreamAsrModelDescriptor, type MainstreamAsrModelDescriptor } from './mainstreamAsrCatalog';

type MainstreamAsrConfig = {
  model: MainstreamAsrModel;
  apiKey: string;
  baseUrl: string;
};

type OpenAiCompatibleResponse = {
  text?: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id?: number | string;
    text?: string;
    start?: number | string;
    end?: number | string;
    speaker?: string | number;
    confidence?: number | string;
  }>;
  words?: Array<{
    word?: string;
    text?: string;
    start?: number | string;
    end?: number | string;
    speaker?: string | number;
    confidence?: number | string;
  }>;
  error?:
    | {
        message?: string;
      }
    | string;
  detail?: string | Array<{ msg?: string; message?: string }>;
};

type DeepgramResponse = {
  metadata?: {
    duration?: number;
  };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: Array<{
          word?: string;
          punctuated_word?: string;
          start?: number;
          end?: number;
          confidence?: number;
          speaker?: string | number;
        }>;
        paragraphs?: {
          transcript?: string;
          paragraphs?: Array<{
            text?: string;
            start?: number;
            end?: number;
          }>;
        };
      }>;
    }>;
    utterances?: Array<{
      transcript?: string;
      start?: number;
      end?: number;
      confidence?: number;
      speaker?: string | number;
    }>;
  };
  err_msg?: string;
  message?: string;
};

type AssemblyAiTranscriptResponse = {
  id?: string;
  status?: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  language_code?: string;
  error?: string;
  words?: Array<{
    text?: string;
    start?: number;
    end?: number;
    confidence?: number;
    speaker?: string | number;
  }>;
  utterances?: Array<{
    text?: string;
    start?: number;
    end?: number;
    confidence?: number;
    speaker?: string | number;
  }>;
};

type ElevenLabsResponse = {
  text?: string;
  language_code?: string;
  language?: string;
  words?: Array<{
    text?: string;
    word?: string;
    start?: number;
    end?: number;
    speaker_id?: string | number;
    speaker?: string | number;
    confidence?: number;
    type?: string;
  }>;
  error?:
    | {
        message?: string;
      }
    | string;
  detail?: string | { message?: string };
  message?: string;
};

type AssemblyAiCreateTranscriptResponse = AssemblyAiTranscriptResponse & {
  upload_url?: string;
};

const ASSEMBLYAI_POLL_INTERVAL_MS = 2500;
const ASSEMBLYAI_MAX_POLL_ATTEMPTS = 120;

const languageMap: Partial<Record<Language, string>> = {
  [Language.CHINESE]: 'zh',
  [Language.ENGLISH]: 'en',
  [Language.JAPANESE]: 'ja',
  [Language.KOREAN]: 'ko',
  [Language.SPANISH]: 'es',
  [Language.FRENCH]: 'fr',
  [Language.GERMAN]: 'de',
  [Language.ARABIC]: 'ar',
  [Language.ITALIAN]: 'it',
  [Language.RUSSIAN]: 'ru',
  [Language.PORTUGUESE]: 'pt',
};

const createAbortError = () => new DOMException('Aborted', 'AbortError');

const waitForPollInterval = (signal: AbortSignal) => {
  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(createAbortError());
    };
    const timeoutId = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, ASSEMBLYAI_POLL_INTERVAL_MS);

    signal.addEventListener('abort', handleAbort, { once: true });
  });
};

export const normalizeMainstreamAsrBaseUrl = (baseUrl: string) => {
  return baseUrl.trim().replace(/\/+$/, '');
};

export const resolveMainstreamAsrEndpoint = (descriptor: MainstreamAsrModelDescriptor, baseUrl: string) => {
  const normalizedBaseUrl = normalizeMainstreamAsrBaseUrl(baseUrl);
  return normalizedBaseUrl || descriptor.endpoint;
};

const getApiLanguage = (language: Language) => {
  return language === Language.AUTO ? null : languageMap[language] || language;
};

const appendQuery = (url: string, params: Record<string, string | number | boolean | null | undefined>) => {
  const nextUrl = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      nextUrl.searchParams.set(key, String(value));
    }
  }
  return nextUrl.toString();
};

const createAuthHeaders = (descriptor: MainstreamAsrModelDescriptor, apiKey: string) => {
  if (descriptor.authHeader === 'xi-api-key') {
    return { 'xi-api-key': apiKey };
  }

  if (descriptor.authHeader === 'api-key') {
    return { 'api-key': apiKey };
  }

  if (descriptor.authHeader === 'token') {
    return { Authorization: `Token ${apiKey}` };
  }

  if (descriptor.authHeader === 'plain-authorization') {
    return { Authorization: apiKey };
  }

  return { Authorization: `Bearer ${apiKey}` };
};

const parseResponseBody = async <T>(response: Response) => {
  const responseText = await response.text();
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return responseText as T;
  }
};

const parseFiniteNumber = (value: number | string | undefined) => {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsedValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const parseMilliseconds = (value: number | string | undefined) => {
  const parsedValue = parseFiniteNumber(value);
  return parsedValue === undefined ? undefined : Math.max(0, parsedValue / 1000);
};

const getErrorDetail = (body: unknown) => {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    return body.trim() || null;
  }

  if (typeof body !== 'object') {
    return null;
  }

  const record = body as {
    error?: string | { message?: string };
    detail?: string | { message?: string } | Array<{ message?: string; msg?: string }>;
    message?: string;
    err_msg?: string;
  };

  if (typeof record.error === 'string') {
    return record.error;
  }

  if (record.error?.message) {
    return record.error.message;
  }

  if (typeof record.detail === 'string') {
    return record.detail;
  }

  if (Array.isArray(record.detail)) {
    return (
      record.detail
        .map((item) => item.message || item.msg)
        .filter(Boolean)
        .join('; ') || null
    );
  }

  if (record.detail?.message) {
    return record.detail.message;
  }

  return record.message || record.err_msg || null;
};

const createSegmentsFromOpenAiCompatible = (result: OpenAiCompatibleResponse): TranscriptionSegment[] => {
  const segments =
    result.segments
      ?.map((segment, index): TranscriptionSegment | null => {
        const text = segment.text?.trim();
        if (!text) {
          return null;
        }

        return {
          id: String(segment.id ?? `segment-${index + 1}`),
          text,
          startTime: parseFiniteNumber(segment.start),
          endTime: parseFiniteNumber(segment.end),
          speaker: segment.speaker === undefined || segment.speaker === '' ? undefined : String(segment.speaker),
          confidence: parseFiniteNumber(segment.confidence),
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || [];

  if (segments.length) {
    return segments;
  }

  return (
    result.words
      ?.map((word, index): TranscriptionSegment | null => {
        const text = (word.word || word.text || '').trim();
        if (!text) {
          return null;
        }

        return {
          id: `word-${index + 1}`,
          text,
          startTime: parseFiniteNumber(word.start),
          endTime: parseFiniteNumber(word.end),
          speaker: word.speaker === undefined || word.speaker === '' ? undefined : String(word.speaker),
          confidence: parseFiniteNumber(word.confidence),
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || []
  );
};

const createSegmentsFromDeepgram = (result: DeepgramResponse): TranscriptionSegment[] => {
  const utteranceSegments =
    result.results?.utterances
      ?.map((utterance, index): TranscriptionSegment | null => {
        const text = utterance.transcript?.trim();
        if (!text) {
          return null;
        }

        return {
          id: `utterance-${index + 1}`,
          text,
          startTime: utterance.start,
          endTime: utterance.end,
          speaker: utterance.speaker === undefined || utterance.speaker === '' ? undefined : String(utterance.speaker),
          confidence: utterance.confidence,
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || [];

  if (utteranceSegments.length) {
    return utteranceSegments;
  }

  const alternative = result.results?.channels?.[0]?.alternatives?.[0];
  const paragraphSegments =
    alternative?.paragraphs?.paragraphs
      ?.map((paragraph, index): TranscriptionSegment | null => {
        const text = paragraph.text?.trim();
        if (!text) {
          return null;
        }

        return {
          id: `paragraph-${index + 1}`,
          text,
          startTime: paragraph.start,
          endTime: paragraph.end,
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || [];

  if (paragraphSegments.length) {
    return paragraphSegments;
  }

  return (
    alternative?.words
      ?.map((word, index): TranscriptionSegment | null => {
        const text = (word.punctuated_word || word.word || '').trim();
        if (!text) {
          return null;
        }

        return {
          id: `word-${index + 1}`,
          text,
          startTime: word.start,
          endTime: word.end,
          speaker: word.speaker === undefined || word.speaker === '' ? undefined : String(word.speaker),
          confidence: word.confidence,
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || []
  );
};

const createSegmentsFromAssemblyAi = (result: AssemblyAiTranscriptResponse): TranscriptionSegment[] => {
  const utteranceSegments =
    result.utterances
      ?.map((utterance, index): TranscriptionSegment | null => {
        const text = utterance.text?.trim();
        if (!text) {
          return null;
        }

        return {
          id: `utterance-${index + 1}`,
          text,
          startTime: parseMilliseconds(utterance.start),
          endTime: parseMilliseconds(utterance.end),
          speaker: utterance.speaker === undefined || utterance.speaker === '' ? undefined : String(utterance.speaker),
          confidence: utterance.confidence,
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || [];

  if (utteranceSegments.length) {
    return utteranceSegments;
  }

  return (
    result.words
      ?.map((word, index): TranscriptionSegment | null => {
        const text = word.text?.trim();
        if (!text) {
          return null;
        }

        return {
          id: `word-${index + 1}`,
          text,
          startTime: parseMilliseconds(word.start),
          endTime: parseMilliseconds(word.end),
          speaker: word.speaker === undefined || word.speaker === '' ? undefined : String(word.speaker),
          confidence: word.confidence,
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || []
  );
};

const createSegmentsFromElevenLabs = (result: ElevenLabsResponse): TranscriptionSegment[] => {
  return (
    result.words
      ?.map((word, index): TranscriptionSegment | null => {
        const text = (word.text || word.word || '').trim();
        if (!text || word.type === 'spacing') {
          return null;
        }

        const speaker = word.speaker_id ?? word.speaker;

        return {
          id: `word-${index + 1}`,
          text,
          startTime: word.start,
          endTime: word.end,
          speaker: speaker === undefined || speaker === '' ? undefined : String(speaker),
          confidence: word.confidence,
        };
      })
      .filter((segment): segment is TranscriptionSegment => Boolean(segment)) || []
  );
};

const getDeepgramTranscript = (result: DeepgramResponse) => {
  const alternative = result.results?.channels?.[0]?.alternatives?.[0];
  return (
    alternative?.paragraphs?.transcript?.trim() ||
    alternative?.transcript?.trim() ||
    result.results?.utterances
      ?.map((utterance) => utterance.transcript?.trim() || '')
      .filter(Boolean)
      .join('\n')
      .trim() ||
    ''
  );
};

const createOpenAiCompatibleFormData = (
  audioFile: File,
  descriptor: MainstreamAsrModelDescriptor,
  context: string,
  language: Language,
) => {
  const formData = new FormData();
  formData.append('file', audioFile, audioFile.name || 'audio.wav');
  formData.append('model', descriptor.modelName);
  formData.append('response_format', 'verbose_json');

  const apiLanguage = getApiLanguage(language);
  if (apiLanguage && descriptor.supportsLanguage) {
    formData.append('language', apiLanguage);
  }

  if (context.trim() && descriptor.supportsPrompt) {
    formData.append('prompt', context.trim());
  }

  return formData;
};

const transcribeWithOpenAiCompatible = async (
  audioFile: File,
  context: string,
  language: Language,
  descriptor: MainstreamAsrModelDescriptor,
  endpoint: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: createOpenAiCompatibleFormData(audioFile, descriptor, context, language),
    signal,
  });
  const result = await parseResponseBody<OpenAiCompatibleResponse | string>(response);

  if (!response.ok) {
    throw new Error(getErrorDetail(result) || `${descriptor.label} 请求失败，状态码: ${response.status}`);
  }

  if (!result) {
    throw new Error(`${descriptor.label} 返回了无效响应。`);
  }

  const transcription = typeof result === 'string' ? result.trim() : result.text?.trim();
  if (!transcription) {
    throw new Error(`${descriptor.label} 返回了空识别结果。`);
  }

  const segments = typeof result === 'string' ? [] : createSegmentsFromOpenAiCompatible(result);
  return {
    transcription,
    detectedLanguage:
      typeof result === 'string'
        ? language === Language.AUTO
          ? '自动识别'
          : language
        : result.language || (language === Language.AUTO ? '自动识别' : language),
    ...(segments.length ? { segments } : {}),
  };
};

const transcribeWithDeepgram = async (
  audioFile: File,
  language: Language,
  enableItn: boolean,
  descriptor: MainstreamAsrModelDescriptor,
  endpoint: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const apiLanguage = getApiLanguage(language);
  const response = await fetch(
    appendQuery(endpoint, {
      model: descriptor.modelName,
      smart_format: enableItn,
      paragraphs: true,
      utterances: true,
      detect_language: language === Language.AUTO,
      language: apiLanguage && descriptor.supportsLanguage ? apiLanguage : undefined,
    }),
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': audioFile.type || 'application/octet-stream',
      },
      body: audioFile,
      signal,
    },
  );
  const result = await parseResponseBody<DeepgramResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorDetail(result) || `${descriptor.label} 请求失败，状态码: ${response.status}`);
  }

  if (!result) {
    throw new Error(`${descriptor.label} 返回了无效响应。`);
  }

  const transcription = getDeepgramTranscript(result);
  if (!transcription) {
    throw new Error(`${descriptor.label} 返回了空识别结果。`);
  }

  const segments = createSegmentsFromDeepgram(result);
  return {
    transcription,
    detectedLanguage: language === Language.AUTO ? '自动识别' : language,
    ...(segments.length ? { segments } : {}),
  };
};

const createAssemblyAiTranscript = async (
  audioUrl: string,
  language: Language,
  enableItn: boolean,
  descriptor: MainstreamAsrModelDescriptor,
  endpoint: string,
  headers: Record<string, string>,
  signal: AbortSignal,
) => {
  const apiLanguage = getApiLanguage(language);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speech_model: descriptor.modelName,
      punctuate: true,
      format_text: enableItn,
      speaker_labels: true,
      ...(apiLanguage && descriptor.supportsLanguage ? { language_code: apiLanguage } : {}),
      ...(language === Language.AUTO ? { language_detection: true } : {}),
    }),
    signal,
  });
  const result = await parseResponseBody<AssemblyAiCreateTranscriptResponse>(response);

  if (!response.ok || !result?.id) {
    throw new Error(getErrorDetail(result) || `${descriptor.label} 提交失败，状态码: ${response.status}`);
  }

  return result.id;
};

const pollAssemblyAiTranscript = async (
  transcriptId: string,
  descriptor: MainstreamAsrModelDescriptor,
  endpoint: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<AssemblyAiTranscriptResponse> => {
  for (let attempt = 0; attempt < ASSEMBLYAI_MAX_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await waitForPollInterval(signal);
    }

    const response = await fetch(`${normalizeMainstreamAsrBaseUrl(endpoint)}/${transcriptId}`, {
      method: 'GET',
      headers,
      signal,
    });
    const result = await parseResponseBody<AssemblyAiTranscriptResponse>(response);

    if (!response.ok || !result) {
      throw new Error(getErrorDetail(result) || `${descriptor.label} 查询失败，状态码: ${response.status}`);
    }

    if (result.status === 'completed') {
      return result;
    }

    if (result.status === 'error') {
      throw new Error(result.error || `${descriptor.label} 转写失败。`);
    }
  }

  throw new Error(`${descriptor.label} 查询超时，请稍后重试。`);
};

const transcribeWithAssemblyAi = async (
  audioFile: File,
  language: Language,
  enableItn: boolean,
  descriptor: MainstreamAsrModelDescriptor,
  endpoint: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  let audioUrl = getAudioSourceUrl(audioFile);

  if (!audioUrl) {
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers,
      body: audioFile,
      signal,
    });
    const uploadResult = await parseResponseBody<{ upload_url?: string }>(uploadResponse);

    if (!uploadResponse.ok || !uploadResult?.upload_url) {
      throw new Error(getErrorDetail(uploadResult) || `${descriptor.label} 上传失败，状态码: ${uploadResponse.status}`);
    }

    audioUrl = uploadResult.upload_url;
  }

  const transcriptId = await createAssemblyAiTranscript(
    audioUrl,
    language,
    enableItn,
    descriptor,
    endpoint,
    headers,
    signal,
  );
  const result = await pollAssemblyAiTranscript(transcriptId, descriptor, endpoint, headers, signal);
  const transcription = result.text?.trim();
  if (!transcription) {
    throw new Error(`${descriptor.label} 返回了空识别结果。`);
  }

  const segments = createSegmentsFromAssemblyAi(result);
  return {
    transcription,
    detectedLanguage: result.language_code || (language === Language.AUTO ? '自动识别' : language),
    ...(segments.length ? { segments } : {}),
  };
};

const transcribeWithElevenLabs = async (
  audioFile: File,
  language: Language,
  descriptor: MainstreamAsrModelDescriptor,
  endpoint: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const formData = new FormData();
  formData.append('file', audioFile, audioFile.name || 'audio.wav');
  formData.append('model_id', descriptor.modelName);

  const apiLanguage = getApiLanguage(language);
  if (apiLanguage && descriptor.supportsLanguage) {
    formData.append('language_code', apiLanguage);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
    signal,
  });
  const result = await parseResponseBody<ElevenLabsResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorDetail(result) || `${descriptor.label} 请求失败，状态码: ${response.status}`);
  }

  if (!result) {
    throw new Error(`${descriptor.label} 返回了无效响应。`);
  }

  const transcription = result.text?.trim();
  if (!transcription) {
    throw new Error(`${descriptor.label} 返回了空识别结果。`);
  }

  const segments = createSegmentsFromElevenLabs(result);
  return {
    transcription,
    detectedLanguage: result.language_code || result.language || (language === Language.AUTO ? '自动识别' : language),
    ...(segments.length ? { segments } : {}),
  };
};

export const transcribeWithMainstreamAsr = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  config: MainstreamAsrConfig,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const descriptor = getMainstreamAsrModelDescriptor(config.model);
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error(`${descriptor.label} API Key 未设置。请在设置中配置。`);
  }

  if (descriptor.requiresEnglish && language !== Language.AUTO && language !== Language.ENGLISH) {
    throw new Error(`${descriptor.label} 仅适合英文音频。请把目标语言改为英文，或切换到多语言模型。`);
  }

  const endpoint = resolveMainstreamAsrEndpoint(descriptor, config.baseUrl);
  const headers = createAuthHeaders(descriptor, apiKey);

  if (signal.aborted) {
    throw createAbortError();
  }

  if (descriptor.transport === 'deepgram') {
    return transcribeWithDeepgram(audioFile, language, enableItn, descriptor, endpoint, headers, signal);
  }

  if (descriptor.transport === 'assemblyai') {
    return transcribeWithAssemblyAi(audioFile, language, enableItn, descriptor, endpoint, headers, signal);
  }

  if (descriptor.transport === 'elevenlabs') {
    return transcribeWithElevenLabs(audioFile, language, descriptor, endpoint, headers, signal);
  }

  return transcribeWithOpenAiCompatible(audioFile, context, language, descriptor, endpoint, headers, signal);
};
