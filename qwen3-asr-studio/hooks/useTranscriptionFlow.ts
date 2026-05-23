import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { AudioUploaderHandle } from '../components/AudioUploader';
import type { ResultDisplayHandle } from '../components/ResultDisplay';
import {
  clearCachedRecording,
  getCachedRecording,
  getCachedTranscription,
  getFileHash,
  setCachedTranscription,
} from '../services/cacheService';
import { compressAudio } from '../services/audioService';
import { loadExample, transcribeAudio } from '../services/gradioService';
import type {
  ApiProvider,
  CompressionLevel,
  HistoryItem,
  Language,
  NoteItem,
  Notification,
  TranscriptionMode,
} from '../types';
import { useElapsedTimer } from './useElapsedTimer';

type Notify = (message: string, type: Notification['type']) => void;
type SaveNote = (content: string) => Promise<boolean>;
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
  apiProvider: ApiProvider;
  modelScopeApiUrl: string;
  bailianApiKey: string;
  notify: Notify;
  clearNotification: () => void;
  saveNote: SaveNote;
  prependHistoryItem: PrependHistoryItem;
  audioUploaderRef: RefObject<AudioUploaderHandle>;
  resultDisplayRef: RefObject<ResultDisplayHandle>;
};

const shouldAddInlineSeparator = (value: string) => value.length > 0 && !/[\s\n]$/.test(value);

export function useTranscriptionFlow({
  context,
  language,
  enableItn,
  autoCopy,
  compressionLevel,
  apiProvider,
  modelScopeApiUrl,
  bailianApiKey,
  notify,
  clearNotification,
  saveNote,
  prependHistoryItem,
  audioUploaderRef,
  resultDisplayRef,
}: UseTranscriptionFlowOptions) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribeAfterRecording, setTranscribeAfterRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>('single');
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
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

  const insertTranscription = useCallback((value: string, detectedValue: string) => {
    if (transcriptionMode === 'single') {
      setTranscription(value);
      setDetectedLanguage(detectedValue);
      return;
    }

    const prefix = shouldAddInlineSeparator(transcription) ? ' ' : '';
    resultDisplayRef.current?.insertText(prefix + value);
    setDetectedLanguage('');
  }, [resultDisplayRef, transcription, transcriptionMode]);

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

    if (transcriptionMode === 'single') {
      setTranscription('');
      setDetectedLanguage('');
    }

    if (file === null) {
      clearCachedRecording().catch(console.error);
      audioUploaderRef.current?.clearInput();
    }
  }, [audioUploaderRef, clearNotification, transcriptionMode]);

  const handleLoadExample = useCallback(async (exampleId: number) => {
    clearNotification();
    setIsLoading(true);
    setAudioFile(null);
    setTranscription('');
    setDetectedLanguage('');
    setElapsedTime(null);

    try {
      const { file } = await loadExample(exampleId, setLoadingMessage);
      setAudioFile(file);
    } catch (error) {
      console.error('Example loading error:', error);
      const errorMessage = error instanceof Error ? error.message : '加载示例音频失败。';
      notify(errorMessage, 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [clearNotification, notify]);

  const transcribeNow = useCallback(async (file: File, bypassCache = false) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    clearNotification();
    setIsLoading(true);
    setElapsedTime(null);
    const localStartTime = Date.now();

    if (transcriptionMode === 'single') {
      setTranscription('');
      setDetectedLanguage('');
    }

    try {
      const hash = await getFileHash(file);
      const cachedResult = bypassCache ? null : await getCachedTranscription(hash);

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
          { provider: apiProvider, modelScopeApiUrl, bailianApiKey },
          setLoadingMessage,
          controller.signal
        );

        if (finalResult.transcription) {
          await setCachedTranscription(hash, finalResult);
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

      insertTranscription(finalResult.transcription, finalResult.detectedLanguage);

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
    apiProvider,
    autoCopy,
    bailianApiKey,
    compressionLevel,
    context,
    createHistoryItem,
    clearNotification,
    enableItn,
    insertTranscription,
    language,
    modelScopeApiUrl,
    notify,
    prependHistoryItem,
    transcriptionMode,
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

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

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
    insertTranscription(result.transcription, result.detectedLanguage);

    if (!result.transcription) {
      return;
    }

    notify('输入法模式识别成功', 'success');
    await prependHistoryItem(createHistoryItem(result.audioFile, result));
  }, [createHistoryItem, insertTranscription, notify, prependHistoryItem]);

  const handleModeChange = useCallback((newMode: TranscriptionMode) => {
    if (newMode !== transcriptionMode) {
      setTranscription('');
      setDetectedLanguage('');
      setTranscriptionMode(newMode);
    }
  }, [transcriptionMode]);

  const handleSaveNote = useCallback(async () => {
    const saved = await saveNote(transcription);
    if (saved) {
      setTranscription('');
    }
  }, [saveNote, transcription]);

  const restoreHistoryItem = useCallback((item: HistoryItem) => {
    if (!item.audioFile) {
      notify('无法恢复音频文件，可能已丢失。', 'error');
      return false;
    }

    setAudioFile(item.audioFile);
    setTranscription(item.transcription);
    setDetectedLanguage(item.detectedLanguage);
    setTranscriptionMode('single');
    notify('已从历史记录恢复', 'success');
    return true;
  }, [notify]);

  const restoreNoteItem = useCallback((item: NoteItem) => {
    setTranscriptionMode('notes');
    setTranscription(prev => {
      const prefix = shouldAddInlineSeparator(prev) ? '\n\n' : '';
      return prev + prefix + item.content;
    });
    notify('已从笔记恢复内容', 'success');
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
    transcriptionMode,
    copied,
    elapsedTime,
    realtimeElapsedTime,
    handleCancel,
    handleCopy,
    handleFileChange,
    handleLoadExample,
    handleModeChange,
    handleRecordingChange,
    handleRetry,
    handleSaveNote,
    handleTranscribe,
    handleTranscriptionResultFromPip,
    restoreHistoryItem,
    restoreNoteItem,
  };
}
