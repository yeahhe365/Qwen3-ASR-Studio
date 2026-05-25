import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { AudioUploaderHandle } from '../components/AudioUploader';
import {
  clearCachedRecording,
  getCachedRecording,
  getCachedTranscription,
  getFileHash,
  setCachedTranscription,
} from '../services/cacheService';
import { compressAudio } from '../services/audioService';
import { transcribeAudio } from '../services/asrService';
import {
  startDoubaoRealtimeTranscription,
  type DoubaoRealtimeSession,
} from '../services/providers/doubaoRealtimeProvider';
import type {
  AsrProviderConfig,
  CompressionLevel,
  HistoryItem,
  Language,
  Notification,
} from '../types';
import { useElapsedTimer } from './useElapsedTimer';

type Notify = (message: string, type: Notification['type']) => void;
type PrependHistoryItem = (item: HistoryItem) => Promise<void>;

type TranscriptionResult = {
  transcription: string;
  detectedLanguage: string;
};

type PipTranscriptionResult = TranscriptionResult & {
  audioFile: File;
};

type UseTranscriptionFlowOptions = {
  context: string;
  language: Language;
  enableItn: boolean;
  autoCopy: boolean;
  compressionLevel: CompressionLevel;
  asrConfig: AsrProviderConfig;
  selectedDeviceId: string;
  notify: Notify;
  clearNotification: () => void;
  prependHistoryItem: PrependHistoryItem;
  audioUploaderRef: RefObject<AudioUploaderHandle>;
};

export function useTranscriptionFlow({
  context,
  language,
  enableItn,
  autoCopy,
  compressionLevel,
  asrConfig,
  selectedDeviceId,
  notify,
  clearNotification,
  prependHistoryItem,
  audioUploaderRef,
}: UseTranscriptionFlowOptions) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribeAfterRecording, setTranscribeAfterRecording] = useState(false);
  const [isRealtimeTranscribing, setIsRealtimeTranscribing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const realtimeSessionRef = useRef<DoubaoRealtimeSession | null>(null);
  const realtimeStartTimeRef = useRef<number | null>(null);
  const realtimeElapsedTime = useElapsedTimer(isLoading);

  const createHistoryItem = useCallback((file: File, result: TranscriptionResult): HistoryItem => ({
    id: Date.now(),
    fileName: file.name,
    transcription: result.transcription,
    detectedLanguage: result.detectedLanguage,
    context,
    timestamp: Date.now(),
    audioFile: file,
  }), [context]);

  useEffect(() => {
    const loadCachedRecording = async () => {
      try {
        const cachedRecording = await getCachedRecording();
        if (cachedRecording) {
          setAudioFile(cachedRecording);
        }
      } catch (error) {
        console.error('Failed to load cached recording:', error);
      }
    };

    loadCachedRecording();
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleFileChange = useCallback((file: File | null) => {
    clearNotification();
    setAudioFile(file);
    setElapsedTime(null);

    setTranscription('');
    setDetectedLanguage('');

    if (file === null) {
      clearCachedRecording().catch(console.error);
      audioUploaderRef.current?.clearInput();
    }
  }, [audioUploaderRef, clearNotification]);

  const transcribeNow = useCallback(async (file: File, bypassCache = false) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    clearNotification();
    setIsLoading(true);
    setElapsedTime(null);
    const localStartTime = Date.now();

    setTranscription('');
    setDetectedLanguage('');

    try {
      const hash = await getFileHash(file);
      const cacheKey = [
        hash,
        asrConfig.provider,
        language,
        enableItn,
        context.trim(),
      ].join(':');
      const cachedResult = bypassCache ? null : await getCachedTranscription(cacheKey);

      let finalResult: TranscriptionResult;

      if (cachedResult) {
        finalResult = {
          transcription: cachedResult.transcription,
          detectedLanguage: cachedResult.detectedLanguage,
        };

        if (autoCopy && cachedResult.transcription) {
          try {
            await navigator.clipboard.writeText(cachedResult.transcription);
            notify('识别结果已从缓存加载并复制', 'success');
          } catch (copyError) {
            console.error('Failed to auto-copy cached result:', copyError);
            notify('从缓存加载成功，但自动复制失败', 'error');
          }
        } else {
          notify('识别结果已从缓存加载', 'success');
        }
      } else {
        setLoadingMessage('正在压缩音频（如果需要）...');
        const fileToTranscribe = await compressAudio(file, compressionLevel);
        finalResult = await transcribeAudio(
          fileToTranscribe,
          context,
          language,
          enableItn,
          asrConfig,
          setLoadingMessage,
          controller.signal
        );

        if (finalResult.transcription) {
          await setCachedTranscription(cacheKey, finalResult);
        }

        if (autoCopy && finalResult.transcription) {
          try {
            await navigator.clipboard.writeText(finalResult.transcription);
            notify('识别结果已复制到剪贴板', 'success');
          } catch (copyError) {
            console.error('Failed to auto-copy new result:', copyError);
            notify('识别成功，但自动复制失败', 'error');
          }
        }
      }

      setTranscription(finalResult.transcription);
      setDetectedLanguage(finalResult.detectedLanguage);

      if (finalResult.transcription) {
        await prependHistoryItem(createHistoryItem(file, finalResult));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        notify('识别已取消', 'success');
      } else {
        console.error('Transcription error:', error);
        const errorMessage = error instanceof Error ? error.message : '转录过程中发生未知错误。';
        notify(errorMessage, 'error');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      setElapsedTime((Date.now() - localStartTime) / 1000);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [
    asrConfig,
    autoCopy,
    compressionLevel,
    context,
    createHistoryItem,
    clearNotification,
    enableItn,
    language,
    notify,
    prependHistoryItem,
  ]);

  const handleTranscribe = useCallback(async () => {
    if (isRecording && audioUploaderRef.current) {
      setTranscribeAfterRecording(true);
      audioUploaderRef.current.stopRecording();
      return;
    }

    if (!audioFile) {
      notify('请先上传或录制一段音频。', 'error');
      return;
    }

    await transcribeNow(audioFile, false);
  }, [audioFile, audioUploaderRef, isRecording, notify, transcribeNow]);

  const stopRealtimeTranscription = useCallback(async () => {
    const session = realtimeSessionRef.current;
    if (!session) {
      return;
    }

    realtimeSessionRef.current = null;
    setIsLoading(true);
    setIsRealtimeTranscribing(false);
    setLoadingMessage('正在结束实时识别...');

    try {
      const result = await session.stop();
      const finalResult = {
        transcription: result.transcription,
        detectedLanguage: '自动识别',
      };

      if (result.audioFile) {
        setAudioFile(result.audioFile);
        await prependHistoryItem(createHistoryItem(result.audioFile, finalResult));
      }

      if (autoCopy && result.transcription) {
        try {
          await navigator.clipboard.writeText(result.transcription);
          notify('实时识别结果已复制到剪贴板', 'success');
        } catch (copyError) {
          console.error('Failed to auto-copy realtime result:', copyError);
          notify('实时识别完成，但自动复制失败', 'error');
        }
      } else {
        notify('实时识别已完成', 'success');
      }

      setTranscription(result.transcription);
      setDetectedLanguage(finalResult.detectedLanguage);
    } catch (error) {
      console.error('Realtime transcription stop error:', error);
      const errorMessage = error instanceof Error ? error.message : '结束实时识别时发生未知错误。';
      notify(errorMessage, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      const startedAt = realtimeStartTimeRef.current;
      setElapsedTime(startedAt ? (Date.now() - startedAt) / 1000 : null);
      realtimeStartTimeRef.current = null;
    }
  }, [autoCopy, createHistoryItem, notify, prependHistoryItem]);

  const handleRealtimeTranscribe = useCallback(async () => {
    if (realtimeSessionRef.current) {
      await stopRealtimeTranscription();
      return;
    }

    clearNotification();
    setTranscription('');
    setDetectedLanguage('');
    setElapsedTime(null);
    setLoadingMessage('正在启动实时识别...');
    setIsLoading(true);
    realtimeStartTimeRef.current = Date.now();

    try {
      const session = await startDoubaoRealtimeTranscription(
        enableItn,
        selectedDeviceId,
        {
          apiKey: asrConfig.doubaoApiKey,
          accessKey: asrConfig.doubaoAccessKey,
        },
        {
          onStatus: setLoadingMessage,
          onPartialResult: (text) => {
            setTranscription(text);
            setDetectedLanguage('自动识别');
          },
          onFinalResult: (text) => {
            setTranscription(text);
            setDetectedLanguage(text ? '自动识别' : '');
          },
          onError: (error) => {
            console.error('Realtime transcription error:', error);
            notify(error.message, 'error');
          },
        },
      );

      realtimeSessionRef.current = session;
      setIsRealtimeTranscribing(true);
      setLoadingMessage('实时识别中...');
    } catch (error) {
      console.error('Realtime transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : '启动实时识别时发生未知错误。';
      notify(errorMessage, 'error');
      setIsLoading(false);
      setLoadingMessage('');
      realtimeStartTimeRef.current = null;
    }
  }, [
    asrConfig.doubaoAccessKey,
    asrConfig.doubaoApiKey,
    clearNotification,
    enableItn,
    notify,
    selectedDeviceId,
    stopRealtimeTranscription,
  ]);

  const handleCancel = useCallback(() => {
    if (realtimeSessionRef.current) {
      void stopRealtimeTranscription();
      return;
    }

    abortControllerRef.current?.abort();
  }, [stopRealtimeTranscription]);

  const handleCopy = useCallback(async () => {
    if (!transcription) {
      return;
    }

    try {
      await navigator.clipboard.writeText(transcription);
      setCopied(true);
      notify('识别结果已复制到剪贴板', 'success');
    } catch (error) {
      console.error('Failed to copy text:', error);
      notify('复制失败，请检查浏览器权限。', 'error');
    }
  }, [notify, transcription]);

  const handleRetry = useCallback(() => {
    if (audioFile) {
      void transcribeNow(audioFile, true);
    }
  }, [audioFile, transcribeNow]);

  const handleTranscriptionResultFromPip = useCallback(async (result: PipTranscriptionResult) => {
    setAudioFile(result.audioFile);
    setTranscription(result.transcription);
    setDetectedLanguage(result.detectedLanguage);

    if (!result.transcription) {
      return;
    }

    notify('输入法模式识别成功', 'success');
    await prependHistoryItem(createHistoryItem(result.audioFile, result));
  }, [createHistoryItem, notify, prependHistoryItem]);

  const restoreHistoryItem = useCallback((item: HistoryItem) => {
    if (!item.audioFile) {
      notify('无法恢复音频文件，可能已丢失。', 'error');
      return false;
    }

    setAudioFile(item.audioFile);
    setTranscription(item.transcription);
    setDetectedLanguage(item.detectedLanguage);
    notify('已从历史记录恢复', 'success');
    return true;
  }, [notify]);

  const handleRecordingChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, []);

  useEffect(() => {
    if (transcribeAfterRecording && audioFile && !isRecording) {
      setTranscribeAfterRecording(false);
      void transcribeNow(audioFile);
    }
  }, [audioFile, isRecording, transcribeAfterRecording, transcribeNow]);

  return {
    audioFile,
    transcription,
    setTranscription,
    detectedLanguage,
    isLoading,
    loadingMessage,
    isRecording,
    isRealtimeTranscribing,
    copied,
    elapsedTime,
    realtimeElapsedTime,
    handleCancel,
    handleCopy,
    handleFileChange,
    handleRecordingChange,
    handleRealtimeTranscribe,
    handleRetry,
    handleTranscribe,
    handleTranscriptionResultFromPip,
    restoreHistoryItem,
  };
}
