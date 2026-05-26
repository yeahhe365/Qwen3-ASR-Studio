import { GEMINI_ASR_API_URL, GEMINI_INLINE_REQUEST_LIMIT_BYTES } from '../../constants';
import { Language, type TranscriptionResult } from '../../types';
import { getGeminiSupportedAudioMimeType } from '../audioService';
import {
  estimateBase64ByteSize,
  fileToBase64DataUrl,
  formatByteSize,
  getJsonByteSize,
  stripDataUrlPrefix,
} from '../fileUtils';

type GeminiAsrConfig = {
  apiKey: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
};

const createAbortError = () => new DOMException('Aborted', 'AbortError');

const createGeminiPrompt = (context: string, language: Language, enableItn: boolean) => {
  const instructions = [
    '你是专业的语音识别助手。请只返回音频转写文本，不要添加解释、标题或 Markdown。',
    language === Language.AUTO ? '目标语言：自动识别。' : `目标语言：${language}。`,
    enableItn
      ? '启用 ITN：将数字、日期、时间、金额等内容尽量转换为常用书写形式。'
      : '不启用 ITN：尽量保留语音内容的原始表达。',
  ];

  if (context.trim()) {
    instructions.push(`可参考的上下文、专有名词或人名：${context.trim()}`);
  }

  return instructions.join('\n');
};

const createGeminiRequestBody = (prompt: string, mimeType: string, audioData: string) => ({
  contents: [
    {
      role: 'user',
      parts: [
        {
          text: prompt,
        },
        {
          inlineData: {
            mimeType,
            data: audioData,
          },
        },
      ],
    },
  ],
});

const assertInlineRequestSize = (audioFile: File, prompt: string, mimeType: string) => {
  const requestOverheadSize = getJsonByteSize(createGeminiRequestBody(prompt, mimeType, ''));
  const estimatedSize = requestOverheadSize + estimateBase64ByteSize(audioFile.size);
  if (estimatedSize > GEMINI_INLINE_REQUEST_LIMIT_BYTES) {
    throw new Error(
      `Gemini API 的内联请求上限为 ${formatByteSize(GEMINI_INLINE_REQUEST_LIMIT_BYTES)}。当前请求约 ${formatByteSize(estimatedSize)}，请压缩或裁剪后重试。`,
    );
  }
};

const parseGeminiResponse = (
  result: GeminiGenerateContentResponse,
  fallbackLanguage: Language,
): TranscriptionResult => {
  if (result.error?.message) {
    throw new Error(result.error.message);
  }

  const transcription = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim() || '')
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!transcription) {
    throw new Error('Gemini API 返回了空识别结果。');
  }

  return {
    transcription,
    detectedLanguage: fallbackLanguage === Language.AUTO ? '自动识别' : fallbackLanguage,
  };
};

export const transcribeWithGemini = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  config: GeminiAsrConfig,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error('Gemini API Key 未设置。请在设置中配置。');
  }

  const mimeType = getGeminiSupportedAudioMimeType(audioFile);
  if (!mimeType) {
    throw new Error(
      'Gemini API 当前支持 WAV、MP3、AIFF、AAC、OGG、FLAC 音频。请先转换为 WAV，或在设置中启用压缩后重试。',
    );
  }

  const prompt = createGeminiPrompt(context, language, enableItn);
  assertInlineRequestSize(audioFile, prompt, mimeType);

  if (signal.aborted) {
    throw createAbortError();
  }

  const audioData = stripDataUrlPrefix(await fileToBase64DataUrl(audioFile));
  if (signal.aborted) {
    throw createAbortError();
  }

  const response = await fetch(GEMINI_ASR_API_URL, {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createGeminiRequestBody(prompt, mimeType, audioData)),
    signal,
  });

  const result = (await response.json().catch(() => null)) as GeminiGenerateContentResponse | null;

  if (!response.ok) {
    const detail = result?.error?.message || `Gemini API 请求失败，状态码: ${response.status}`;
    throw new Error(detail);
  }

  if (!result) {
    throw new Error('Gemini API 返回了无效响应。');
  }

  return parseGeminiResponse(result, language);
};
