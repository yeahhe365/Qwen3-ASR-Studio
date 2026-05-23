
import { Client } from "@gradio/client";
import { Language, ApiProvider } from "../types";
import { BAILIAN_API_URL } from "../constants";

const SPACE_ID = "Qwen/Qwen3-ASR-Demo";
let client: Promise<Client>;

async function getClient() {
  if (!client) {
    client = Client.connect(SPACE_ID);
  }
  return client;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;


const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:*/*;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

const transcribeWithBailian = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  apiKey: string,
  onProgress: (message: string) => void,
  signal: AbortSignal
): Promise<{ transcription: string; detectedLanguage: string }> => {
  if (!apiKey) {
    throw new Error('阿里云百炼 API Key 未设置。请在设置中配置。');
  }

  const formData = new FormData();
  formData.append('audio', audioFile);
  if (context) formData.append('context', context);
  formData.append('enableItn', String(enableItn));
  if (language !== Language.AUTO) {
    formData.append('language', language);
  }

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const attempt = i + 1;
      onProgress(attempt > 1 ? `正在进行第 ${attempt} 次尝试...` : '正在识别，请稍候...');
      
      onProgress('正在发送到百炼 API...');
      const response = await fetch(BAILIAN_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
        signal,
      });

      if (!response.ok) {
        let errorDetails = `API 请求失败，状态码: ${response.status}`;
        try {
          const errorJson = await response.json();
          errorDetails = errorJson.details || errorJson.error || errorDetails;
        } catch (e) {
          // ignore if response is not json
        }
        throw new Error(errorDetails);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        onProgress('识别成功！');
        return {
          transcription: result.data.text || '',
          detectedLanguage: result.data.language || '',
        };
      } else if (result.error) {
        throw new Error(result.details || result.error);
      } else {
        throw new Error('来自百炼 API 的响应格式无效');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onProgress('识别已取消。');
        throw error;
      }
      if (i === MAX_RETRIES - 1) {
        console.error(`Transcription failed after ${MAX_RETRIES} attempts.`, error);
        onProgress('识别失败。');
        throw error;
      }
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, i);
      console.warn(`Transcription attempt ${i + 1} failed. Retrying in ${delay / 1000}s...`, error);
      onProgress(`识别出错，将在 ${delay / 1000} 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Transcription failed after all retries.');
};

const transcribeWithModelScope = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  apiBaseUrl: string,
  onProgress: (message: string) => void,
  signal: AbortSignal
): Promise<{ transcription: string; detectedLanguage: string }> => {
  
  const fullApiUrl = apiBaseUrl;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const attempt = i + 1;
      onProgress(attempt > 1 ? `正在进行第 ${attempt} 次尝试...` : '正在识别，请稍候...');
      
      onProgress('正在准备音频数据...');
      const base64Data = await fileToBase64(audioFile);

      onProgress('正在发送到 API...');
      const response = await fetch(fullApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_file: {
            data: base64Data,
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size
          },
          context: context,
          language: language,
          enable_itn: enableItn,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`API 请求失败，状态码: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data) && result.data.length >= 1) {
        onProgress('识别成功！');
        
        let detectedLanguage = '';
        const detectedLangStr = result.data[1];

        if (typeof detectedLangStr === 'string' && detectedLangStr) {
          const langMatch = detectedLangStr.match(/(?:：|:)\s*(.*)/);
          detectedLanguage = langMatch ? langMatch[1].trim() : detectedLangStr.trim();
        }

        return {
          transcription: (result.data[0] as string) || '',
          detectedLanguage: detectedLanguage,
        };
      } else if (result.error) {
        throw new Error(result.details || result.error);
      } else {
        throw new Error('来自 API 的响应格式无效');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onProgress('识别已取消。');
        throw error;
      }
      if (i === MAX_RETRIES - 1) {
        console.error(`Transcription failed after ${MAX_RETRIES} attempts.`, error);
        onProgress('识别失败。');
        throw error;
      }
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, i);
      console.warn(`Transcription attempt ${i + 1} failed. Retrying in ${delay / 1000}s...`, error);
      onProgress(`识别出错，将在 ${delay / 1000} 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Transcription failed after all retries.');
};

export interface TranscriptionConfig {
  provider: ApiProvider;
  modelScopeApiUrl: string;
  bailianApiKey: string;
}

export const transcribeAudio = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  config: TranscriptionConfig,
  onProgress: (message: string) => void,
  signal: AbortSignal
): Promise<{ transcription: string; detectedLanguage: string }> => {
  if (config.provider === ApiProvider.BAILIAN) {
    return transcribeWithBailian(audioFile, context, language, enableItn, config.bailianApiKey, onProgress, signal);
  } else {
    return transcribeWithModelScope(audioFile, context, language, enableItn, config.modelScopeApiUrl, onProgress, signal);
  }
}

interface GradioFile {
  url: string;
  orig_name: string;
}

export const loadExample = async (
  exampleId: number,
  onProgress: (message: string) => void
): Promise<{ file: File; context: string }> => {
  const app = await getClient();
  let endpoint = '/lambda';
  if (exampleId === 1) endpoint = '/lambda_1';
  if (exampleId === 2) endpoint = '/lambda_2';

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const attempt = i + 1;
      onProgress(attempt > 1 ? `正在进行第 ${attempt} 次尝试加载示例...` : '正在加载示例...');
      
      const result = await app.predict(endpoint, {});

      if (result.data && Array.isArray(result.data) && result.data.length >= 2) {
        const fileData = result.data[0] as GradioFile;
        const context = result.data[1] as string;

        if (!fileData || !fileData.url) {
            throw new Error('Example file URL not found in API response.');
        }
        
        onProgress('正在下载示例文件...');
        const response = await fetch(fileData.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch example audio: ${response.statusText}`);
        }
        const blob = await response.blob();
        const file = new File([blob], fileData.orig_name || `example_${exampleId}.wav`, { type: blob.type });

        onProgress('示例加载成功！');
        return { file, context };
      } else {
        throw new Error('Invalid response format from example API');
      }
    } catch (error) {
      if (i === MAX_RETRIES - 1) {
        console.error(`Loading example failed after ${MAX_RETRIES} attempts.`, error);
        onProgress('加载示例失败。');
        throw error;
      }
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, i);
      console.warn(`Loading example attempt ${i + 1} failed. Retrying in ${delay / 1000}s...`, error);
      onProgress(`加载示例出错，将在 ${delay / 1000} 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Loading example failed after all retries.');
};
