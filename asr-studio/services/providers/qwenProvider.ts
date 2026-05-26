import { QWEN_ASR_API_URL, QWEN_ASR_MODEL, QWEN_INLINE_AUDIO_LIMIT_BYTES } from '../../constants';
import { Language, type TranscriptionResult } from '../../types';
import { estimateDataUrlByteSize, fileToBase64DataUrl, formatByteSize } from '../fileUtils';

type QwenAsrConfig = {
  apiKey: string;
};

type QwenChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      annotations?: Array<{
        type?: string;
        language?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
  };
};

const createAbortError = () => new DOMException('Aborted', 'AbortError');

const createSystemPrompt = (context: string, enableItn: boolean) => {
  const instructions = [
    '你是专业的语音识别助手。请只返回音频转写文本，不要添加解释、标题或 Markdown。',
    enableItn
      ? '启用 ITN：将数字、日期、时间、金额等内容尽量转换为常用书写形式。'
      : '不启用 ITN：尽量保留语音内容的原始表达。',
  ];

  if (context.trim()) {
    instructions.push(`可参考的上下文、专有名词或人名：${context.trim()}`);
  }

  return instructions.join('\n');
};

const parseDetectedLanguage = (result: QwenChatCompletionResponse, fallback: Language) => {
  const annotations = result.choices?.[0]?.message?.annotations;
  const languageAnnotation = annotations?.find((annotation) => annotation.language);

  return languageAnnotation?.language || (fallback === Language.AUTO ? '自动识别' : fallback);
};

const createAsrOptions = (language: Language, enableItn: boolean) => {
  return {
    ...(language === Language.AUTO ? {} : { language }),
    enable_itn: enableItn,
  };
};

const assertInlineAudioSize = (audioFile: File) => {
  const estimatedSize = estimateDataUrlByteSize(audioFile);
  if (estimatedSize > QWEN_INLINE_AUDIO_LIMIT_BYTES) {
    throw new Error(
      `Qwen 官方 API 的内联音频上限为 ${formatByteSize(QWEN_INLINE_AUDIO_LIMIT_BYTES)}（Base64 Data URL）。当前音频约 ${formatByteSize(estimatedSize)}，请压缩或裁剪后重试。`,
    );
  }
};

const parseQwenAsrResponse = (result: QwenChatCompletionResponse, fallbackLanguage: Language) => {
  if (result.error?.message) {
    throw new Error(result.error.message);
  }

  const transcription = result.choices?.[0]?.message?.content?.trim();
  if (!transcription) {
    throw new Error('Qwen 官方 API 返回了空识别结果。');
  }

  return {
    transcription,
    detectedLanguage: parseDetectedLanguage(result, fallbackLanguage),
  };
};

export const transcribeWithQwen = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  config: QwenAsrConfig,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error('Qwen 官方 API Key 未设置。请在设置中配置。');
  }

  assertInlineAudioSize(audioFile);
  if (signal.aborted) {
    throw createAbortError();
  }

  const audioDataUrl = await fileToBase64DataUrl(audioFile);
  if (signal.aborted) {
    throw createAbortError();
  }

  const response = await fetch(QWEN_ASR_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: QWEN_ASR_MODEL,
      messages: [
        {
          role: 'system',
          content: createSystemPrompt(context, enableItn),
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: audioDataUrl,
              },
            },
          ],
        },
      ],
      stream: false,
      asr_options: createAsrOptions(language, enableItn),
    }),
    signal,
  });

  const result = (await response.json().catch(() => null)) as QwenChatCompletionResponse | null;

  if (!response.ok) {
    const detail = result?.error?.message || `Qwen 官方 API 请求失败，状态码: ${response.status}`;
    throw new Error(detail);
  }

  if (!result) {
    throw new Error('Qwen 官方 API 返回了无效响应。');
  }

  return parseQwenAsrResponse(result, language);
};
