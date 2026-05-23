import { AsrProvider, type AsrProviderConfig, type Language } from '../types';
import { transcribeWithDoubao } from './providers/doubaoProvider';
import { transcribeWithQwen } from './providers/qwenProvider';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

export const transcribeAudio = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  config: AsrProviderConfig,
  onProgress: (message: string) => void,
  signal: AbortSignal
): Promise<{ transcription: string; detectedLanguage: string }> => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const attempt = i + 1;
      onProgress(attempt > 1 ? `正在进行第 ${attempt} 次尝试...` : '正在识别，请稍候...');
      onProgress('正在准备音频数据...');

      const result = config.provider === AsrProvider.DOUBAO
        ? await transcribeWithDoubao(
            audioFile,
            context,
            language,
            enableItn,
            {
              apiKey: config.doubaoApiKey,
              accessKey: config.doubaoAccessKey,
            },
            signal
          )
        : await transcribeWithQwen(
            audioFile,
            context,
            language,
            enableItn,
            {
              apiKey: config.qwenApiKey,
            },
            signal
          );

      onProgress('识别成功！');
      return result;
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
