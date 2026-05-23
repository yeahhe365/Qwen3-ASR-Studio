import { QWEN_ASR_API_URL, QWEN_ASR_MODEL } from '../../constants';
import { Language } from '../../types';
import { fileToBase64DataUrl } from '../asrUtils';

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
  const languageAnnotation = annotations?.find(annotation => annotation.language);

  return languageAnnotation?.language || (fallback === Language.AUTO ? '自动识别' : fallback);
};

const createAsrOptions = (language: Language, enableItn: boolean) => {
  return {
    ...(language === Language.AUTO ? {} : { language }),
    enable_itn: enableItn,
  };
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
  signal: AbortSignal
): Promise<{ transcription: string; detectedLanguage: string }> => {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error('Qwen 官方 API Key 未设置。请在设置中配置。');
  }

  const audioDataUrl = await fileToBase64DataUrl(audioFile);
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
      asr_options: createAsrOptions(language, enableItn),
    }),
    signal,
  });

  const result = await response.json().catch(() => null) as QwenChatCompletionResponse | null;

  if (!response.ok) {
    const detail = result?.error?.message || `Qwen 官方 API 请求失败，状态码: ${response.status}`;
    throw new Error(detail);
  }

  if (!result) {
    throw new Error('Qwen 官方 API 返回了无效响应。');
  }

  return parseQwenAsrResponse(result, language);
};
