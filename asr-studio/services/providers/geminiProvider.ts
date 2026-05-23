import { GEMINI_ASR_API_URL } from '../../constants';
import { Language } from '../../types';
import { fileToBase64DataUrl, stripDataUrlPrefix } from '../asrUtils';

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

const parseGeminiResponse = (
  result: GeminiGenerateContentResponse,
  fallbackLanguage: Language,
): { transcription: string; detectedLanguage: string } => {
  if (result.error?.message) {
    throw new Error(result.error.message);
  }

  const transcription = result.candidates?.[0]?.content?.parts
    ?.map(part => part.text?.trim() || '')
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
  signal: AbortSignal
): Promise<{ transcription: string; detectedLanguage: string }> => {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error('Gemini API Key 未设置。请在设置中配置。');
  }

  const audioData = stripDataUrlPrefix(await fileToBase64DataUrl(audioFile));
  const response = await fetch(GEMINI_ASR_API_URL, {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: createGeminiPrompt(context, language, enableItn),
            },
            {
              inlineData: {
                mimeType: audioFile.type || 'audio/wav',
                data: audioData,
              },
            },
          ],
        },
      ],
    }),
    signal,
  });

  const result = await response.json().catch(() => null) as GeminiGenerateContentResponse | null;

  if (!response.ok) {
    const detail = result?.error?.message || `Gemini API 请求失败，状态码: ${response.status}`;
    throw new Error(detail);
  }

  if (!result) {
    throw new Error('Gemini API 返回了无效响应。');
  }

  return parseGeminiResponse(result, language);
};
