import { DOUBAO_ASR_API_URL, DOUBAO_ASR_MODEL, DOUBAO_ASR_RESOURCE_ID } from '../../constants';
import type { Language } from '../../types';
import { createRequestId, fileToBase64DataUrl, stripDataUrlPrefix } from '../asrUtils';

type DoubaoAsrConfig = {
  apiKey: string;
  accessKey: string;
};

type DoubaoAsrResponse = {
  result?: {
    text?: string;
  };
  message?: string;
  error?: string;
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
  apiKey: string,
  audioData: string,
  enableItn: boolean,
) => ({
  user: {
    uid: apiKey,
  },
  audio: {
    data: audioData,
  },
  request: {
    model_name: DOUBAO_ASR_MODEL,
    enable_itn: enableItn,
    enable_punc: true,
  },
});

const parseDoubaoResponse = (
  response: Response,
  result: DoubaoAsrResponse | null,
): { transcription: string; detectedLanguage: string } => {
  const statusCode = response.headers.get('X-Api-Status-Code');
  const apiMessage = response.headers.get('X-Api-Message');
  const logId = response.headers.get('X-Tt-Logid');

  if (statusCode && statusCode !== '20000000') {
    const detail = apiMessage || result?.message || result?.error || '未知错误';
    throw new Error(`豆包 API 请求失败 (${statusCode})：${detail}${logId ? `，LogId: ${logId}` : ''}`);
  }

  const transcription = result?.result?.text?.trim();
  if (!transcription) {
    throw new Error(`豆包 API 返回了空识别结果${logId ? `，LogId: ${logId}` : ''}。`);
  }

  return {
    transcription,
    detectedLanguage: '自动识别',
  };
};

export const transcribeWithDoubao = async (
  audioFile: File,
  _context: string,
  _language: Language,
  enableItn: boolean,
  config: DoubaoAsrConfig,
  signal: AbortSignal
): Promise<{ transcription: string; detectedLanguage: string }> => {
  const apiKey = config.apiKey.trim();
  const accessKey = config.accessKey.trim();

  if (!apiKey) {
    throw new Error('豆包 API Key 未设置。请在设置中配置。');
  }

  const audioData = stripDataUrlPrefix(await fileToBase64DataUrl(audioFile));
  const response = await fetch(DOUBAO_ASR_API_URL, {
    method: 'POST',
    headers: {
      ...createAuthHeaders(apiKey, accessKey),
      'Content-Type': 'application/json',
      'X-Api-Resource-Id': DOUBAO_ASR_RESOURCE_ID,
      'X-Api-Request-Id': createRequestId(),
      'X-Api-Sequence': '-1',
    },
    body: JSON.stringify(createDoubaoRequestBody(apiKey, audioData, enableItn)),
    signal,
  });

  const result = await response.json().catch(() => null) as DoubaoAsrResponse | null;

  if (!response.ok) {
    const statusCode = response.headers.get('X-Api-Status-Code');
    const detail = response.headers.get('X-Api-Message') || result?.message || result?.error || `HTTP ${response.status}`;
    throw new Error(`豆包 API 请求失败${statusCode ? ` (${statusCode})` : ''}：${detail}`);
  }

  return parseDoubaoResponse(response, result);
};
