import type { AsrProviderConfig, Language, TranscriptionResult } from '../types';
import { transcribeWithConfiguredProvider } from './providerRegistry';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

const createAbortError = () => new DOMException('Aborted', 'AbortError');

const waitForRetryDelay = (delay: number, signal: AbortSignal) => {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(createAbortError());
    };

    const timeoutId = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, delay);

    signal.addEventListener('abort', handleAbort, { once: true });
  });
};

export const transcribeAudio = async (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  config: AsrProviderConfig,
  onProgress: (message: string) => void,
  signal: AbortSignal,
): Promise<TranscriptionResult> => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const attempt = i + 1;
      onProgress(attempt > 1 ? `正在进行第 ${attempt} 次尝试...` : '正在识别，请稍候...');
      onProgress('正在准备音频数据...');

      const result = await transcribeWithConfiguredProvider(audioFile, context, language, enableItn, config, signal);

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
      await waitForRetryDelay(delay, signal);
    }
  }

  throw new Error('Transcription failed after all retries.');
};
