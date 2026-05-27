import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { AudioInputPanelHandle } from '../components/AudioInputPanel';
import {
  clearCachedRecording,
  getCachedRecording,
  getCachedTranscription,
  getFileHash,
  setCachedTranscription,
} from '../services/cacheService';
import {
  compressAudio,
  getAudioProcessingFallbackReason,
  getEffectiveCompressionLevel,
} from '../services/audioService';
import { AsrProvider, CompressionLevel } from '../types';
import type { AsrProviderConfig, HistoryItem, Language, Notification, TranscriptionResult } from '../types';
import { getProviderReadinessError } from '../services/providerRegistry';
import { createRemoteAudioFile, getAudioSourceUrl } from '../services/remoteAudioFile';
import { createTranscriptionCacheKey, createTranscriptionCacheSource } from '../services/transcriptionCacheKey';
import { createAbortError, isAbortError, transcribePreparedAudio } from '../services/transcriptionProcessing';
import { normalizeSegments } from '../services/transcriptionSegments';
import { useElapsedTimer } from './useElapsedTimer';
import { useTranscriptHistoryDraft } from './useTranscriptHistoryDraft';
import { useTranscriptionQueue } from './useTranscriptionQueue';

type Notify = (message: string, type: Notification['type']) => void;
type PrependHistoryItem = (item: HistoryItem) => Promise<boolean>;
type UpdateHistoryItem = (
  id: number,
  patch: Partial<
    Pick<
      HistoryItem,
      | 'transcription'
      | 'detectedLanguage'
      | 'context'
      | 'segments'
      | 'provider'
      | 'language'
      | 'enableItn'
      | 'compressionLevel'
      | 'trimSilence'
      | 'enableLongAudioChunking'
      | 'nvidiaNimTask'
      | 'mainstreamAsrModel'
    >
  >,
) => Promise<boolean>;

type UseTranscriptionFlowOptions = {
  context: string;
  language: Language;
  enableItn: boolean;
  autoCopy: boolean;
  compressionLevel: CompressionLevel;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
  asrConfig: AsrProviderConfig;
  notify: Notify;
  clearNotification: () => void;
  prependHistoryItem: PrependHistoryItem;
  updateHistoryItem: UpdateHistoryItem;
  audioInputPanelRef: RefObject<AudioInputPanelHandle>;
};

export function useTranscriptionFlow({
  context,
  language,
  enableItn,
  autoCopy,
  compressionLevel,
  trimSilence,
  enableLongAudioChunking,
  asrConfig,
  notify,
  clearNotification,
  prependHistoryItem,
  updateHistoryItem,
  audioInputPanelRef,
}: UseTranscriptionFlowOptions) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [segments, setSegments] = useState<TranscriptionResult['segments']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);
  const [transcribeAfterRecording, setTranscribeAfterRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);
  const realtimeElapsedTime = useElapsedTimer(isLoading);

  const abortCurrentRequest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const setLoadingState = useCallback((nextIsLoading: boolean) => {
    isLoadingRef.current = nextIsLoading;
    setIsLoading(nextIsLoading);
  }, []);

  const {
    queue,
    isBatchProcessing,
    isBatchProcessingRef,
    setQueueState,
    createQueue,
    updateQueueState,
    setBatchProcessingState,
    removeQueueItem,
    updateQueueItem,
    clearQueue,
    getQueuedTranscriptionItems,
    getCurrentQueueItem,
    getQueueSnapshot,
    requestBatchStop,
    resetBatchStop,
    isBatchStopRequested,
  } = useTranscriptionQueue({ abortCurrentRequest });

  const {
    activeHistoryItemId,
    createHistoryItem,
    markHistoryItemSaved,
    resetHistoryDraft,
    saveCurrentTranscript,
    restoreHistoryDraft,
    getIsTranscriptionDirty,
  } = useTranscriptHistoryDraft({
    context,
    provider: asrConfig.provider,
    language,
    enableItn,
    compressionLevel,
    trimSilence,
    enableLongAudioChunking,
    nvidiaNimTask: asrConfig.nvidiaNimTask,
    mainstreamAsrModel: asrConfig.mainstreamAsrModel,
    notify,
    prependHistoryItem,
    updateHistoryItem,
  });

  const resetTranscriptionResult = useCallback(() => {
    setElapsedTime(null);
    setTranscription('');
    setDetectedLanguage('');
    setSegments([]);
    resetHistoryDraft();
  }, [resetHistoryDraft]);

  useEffect(() => {
    let isMounted = true;

    const loadCachedRecording = async () => {
      try {
        const cachedRecording = await getCachedRecording();
        if (isMounted && cachedRecording) {
          setAudioFile(cachedRecording);
        }
      } catch (error) {
        console.error('Failed to load cached recording:', error);
      }
    };

    loadCachedRecording();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const handleFileChange = useCallback(
    (file: File | null) => {
      clearNotification();
      setQueueState([]);
      setAudioFile(file);
      resetTranscriptionResult();

      if (file === null) {
        clearCachedRecording().catch(console.error);
        audioInputPanelRef.current?.clearInput();
      }
    },
    [audioInputPanelRef, clearNotification, resetTranscriptionResult, setQueueState],
  );

  const handleFilesChange = useCallback(
    (files: File[]) => {
      clearNotification();
      const validFiles = files.filter(Boolean);
      if (validFiles.length === 0) {
        return;
      }

      if (validFiles.length === 1) {
        handleFileChange(validFiles[0]);
        return;
      }

      createQueue(validFiles);
      setAudioFile(validFiles[0]);
      resetTranscriptionResult();
      notify(`已加入 ${validFiles.length} 个音频到批处理队列`, 'success');
    },
    [clearNotification, createQueue, handleFileChange, notify, resetTranscriptionResult],
  );

  const transcribeNow = useCallback(
    async (file: File, bypassCache = false, onProgress?: (message: string) => void) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      clearNotification();
      const readinessError = getProviderReadinessError(asrConfig, file);
      if (readinessError) {
        notify(readinessError, 'error');
        return false;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const isCurrentRequest = () => abortControllerRef.current === controller && !controller.signal.aborted;
      const guardCurrentRequest = () => {
        if (!isCurrentRequest()) {
          throw createAbortError();
        }
      };
      const setCurrentLoadingMessage = (message: string) => {
        if (!isCurrentRequest()) {
          return;
        }
        setLoadingMessage(message);
        onProgress?.(message);
      };
      setLoadingState(true);
      const localStartTime = Date.now();
      resetTranscriptionResult();

      try {
        const audioSourceUrl = getAudioSourceUrl(file);
        const fileHash = audioSourceUrl ? '' : await getFileHash(file);
        guardCurrentRequest();
        const cacheKey = createTranscriptionCacheKey({
          source: createTranscriptionCacheSource(fileHash, audioSourceUrl),
          config: asrConfig,
          language,
          enableItn,
          compressionLevel,
          trimSilence,
          enableLongAudioChunking,
          context,
        });
        const cachedResult = bypassCache ? null : await getCachedTranscription(cacheKey);
        guardCurrentRequest();

        let finalResult: TranscriptionResult;
        let cacheWriteFailed = false;

        if (cachedResult) {
          finalResult = {
            transcription: cachedResult.transcription,
            detectedLanguage: cachedResult.detectedLanguage,
            segments: normalizeSegments(cachedResult.transcription, cachedResult.segments),
            provider: cachedResult.provider || asrConfig.provider,
            createdAt: cachedResult.createdAt,
          };

          if (autoCopy && cachedResult.transcription) {
            try {
              await navigator.clipboard.writeText(cachedResult.transcription);
              if (isCurrentRequest()) {
                notify('识别结果已从缓存加载并复制', 'success');
              }
            } catch (copyError) {
              console.error('Failed to auto-copy cached result:', copyError);
              if (isCurrentRequest()) {
                notify('从缓存加载成功，但自动复制失败', 'error');
              }
            }
          } else {
            notify('识别结果已从缓存加载', 'success');
          }
          guardCurrentRequest();
        } else {
          let fileToTranscribe = file;
          if (audioSourceUrl) {
            const loadingMessage = '正在提交远程音频 URL...';
            setCurrentLoadingMessage(loadingMessage);
          } else {
            const effectiveCompressionLevel = getEffectiveCompressionLevel(asrConfig.provider, file, compressionLevel);
            const isAutoConverted =
              compressionLevel === CompressionLevel.ORIGINAL && effectiveCompressionLevel !== CompressionLevel.ORIGINAL;
            const loadingMessage =
              asrConfig.provider === AsrProvider.NVIDIA_NIM
                ? '正在转换为 NIM 兼容音频...'
                : isAutoConverted
                  ? '正在转换为 Gemini 兼容音频...'
                  : '正在压缩音频（如果需要）...';

            setCurrentLoadingMessage(loadingMessage);
            fileToTranscribe = await compressAudio(file, effectiveCompressionLevel);
            guardCurrentRequest();
            const compressionFallbackReason = getAudioProcessingFallbackReason(fileToTranscribe);
            if (compressionFallbackReason) {
              setCurrentLoadingMessage(compressionFallbackReason);
            }
          }

          const setProgress = (message: string) => {
            setCurrentLoadingMessage(message);
          };
          const providerResult = await transcribePreparedAudio({
            file: fileToTranscribe,
            audioSourceUrl,
            controller,
            context,
            language,
            enableItn,
            trimSilence,
            enableLongAudioChunking,
            asrConfig,
            setProgress,
          });
          guardCurrentRequest();
          finalResult = {
            ...providerResult,
            segments: normalizeSegments(providerResult.transcription, providerResult.segments),
            provider: asrConfig.provider,
            createdAt: Date.now(),
          };

          if (finalResult.transcription) {
            try {
              await setCachedTranscription(cacheKey, finalResult);
            } catch (cacheError) {
              console.error('Failed to cache transcription result:', cacheError);
              cacheWriteFailed = true;
            }
          }
          guardCurrentRequest();

          if (autoCopy && finalResult.transcription) {
            try {
              await navigator.clipboard.writeText(finalResult.transcription);
              if (isCurrentRequest()) {
                notify(
                  cacheWriteFailed ? '识别成功并已复制，但写入缓存失败。' : '识别结果已复制到剪贴板',
                  cacheWriteFailed ? 'error' : 'success',
                );
              }
            } catch (copyError) {
              console.error('Failed to auto-copy new result:', copyError);
              if (isCurrentRequest()) {
                notify(cacheWriteFailed ? '识别成功，但自动复制和缓存写入失败。' : '识别成功，但自动复制失败', 'error');
              }
            }
          } else if (cacheWriteFailed && isCurrentRequest()) {
            notify('识别成功，但写入缓存失败。', 'error');
          }
          guardCurrentRequest();
        }

        setTranscription(finalResult.transcription);
        setDetectedLanguage(finalResult.detectedLanguage);
        setSegments(finalResult.segments || []);

        if (finalResult.transcription) {
          const historyItem = createHistoryItem(file, finalResult);
          const savedToHistory = await prependHistoryItem(historyItem);
          guardCurrentRequest();
          markHistoryItemSaved(historyItem, savedToHistory);
        }
        return true;
      } catch (error) {
        if (isAbortError(error)) {
          if (abortControllerRef.current === controller) {
            notify('识别已取消', 'success');
          }
        } else {
          console.error('Transcription error:', error);
          const errorMessage = error instanceof Error ? error.message : '转录过程中发生未知错误。';
          if (isCurrentRequest()) {
            notify(errorMessage, 'error');
          }
        }
        return false;
      } finally {
        if (abortControllerRef.current === controller) {
          setLoadingState(false);
          setLoadingMessage('');
          setElapsedTime((Date.now() - localStartTime) / 1000);
          abortControllerRef.current = null;
        }
      }
    },
    [
      asrConfig,
      autoCopy,
      compressionLevel,
      context,
      createHistoryItem,
      clearNotification,
      enableItn,
      enableLongAudioChunking,
      language,
      notify,
      prependHistoryItem,
      markHistoryItemSaved,
      resetTranscriptionResult,
      trimSilence,
      setLoadingState,
    ],
  );

  const handleTranscribe = useCallback(async () => {
    if ((isRecording || isRecordingBusy) && audioInputPanelRef.current) {
      const stoppedStatus = audioInputPanelRef.current.stopRecording();
      const shouldTranscribeStoppedRecording = stoppedStatus === 'recording' || isRecording;
      setTranscribeAfterRecording(shouldTranscribeStoppedRecording);
      if (shouldTranscribeStoppedRecording) {
        setAudioFile(null);
      }
      return;
    }

    if (!audioFile) {
      notify('请先上传或录制一段音频。', 'error');
      return;
    }

    if (isLoadingRef.current || isBatchProcessingRef.current) {
      return;
    }

    await transcribeNow(audioFile, false);
  }, [audioFile, audioInputPanelRef, isRecording, isRecordingBusy, notify, transcribeNow]);

  const handleKeyboardRecordingRelease = useCallback(() => {
    const stoppedStatus = audioInputPanelRef.current?.stopRecording() ?? 'idle';

    if (stoppedStatus === 'recording') {
      setTranscribeAfterRecording(true);
      setAudioFile(null);
      return;
    }

    if (stoppedStatus === 'requesting') {
      setTranscribeAfterRecording(false);
    }
  }, [audioInputPanelRef]);

  const handleBatchTranscribe = useCallback(async () => {
    if (isLoadingRef.current || isBatchProcessingRef.current || isRecording || isRecordingBusy) {
      return;
    }

    const queuedItems = getQueuedTranscriptionItems();
    if (queuedItems.length === 0) {
      notify('批处理队列为空。', 'error');
      return;
    }

    resetBatchStop();
    setBatchProcessingState(true);

    try {
      for (const item of queuedItems) {
        const currentItem = getCurrentQueueItem(item.id);
        if (!currentItem || (currentItem.status !== 'pending' && currentItem.status !== 'error')) {
          continue;
        }

        if (isBatchStopRequested()) {
          updateQueueState((currentQueue) =>
            currentQueue.map((queueItem) =>
              queueItem.id === item.id ? { ...queueItem, status: 'cancelled', message: '已取消' } : queueItem,
            ),
          );
          continue;
        }

        updateQueueState((currentQueue) =>
          currentQueue.map((queueItem) =>
            queueItem.id === item.id ? { ...queueItem, status: 'processing', message: '识别中' } : queueItem,
          ),
        );
        setAudioFile(item.file);
        const succeeded = await transcribeNow(item.file, false, (message) => {
          updateQueueItem(item.id, { message });
        });
        updateQueueState((currentQueue) =>
          currentQueue.map((queueItem) =>
            queueItem.id === item.id
              ? {
                  ...queueItem,
                  status: isBatchStopRequested() ? 'cancelled' : succeeded ? 'done' : 'error',
                  message: isBatchStopRequested() ? '已取消' : succeeded ? '已完成' : '识别失败',
                }
              : queueItem,
          ),
        );
      }
    } finally {
      setBatchProcessingState(false);
    }

    const finalQueue = getQueueSnapshot();
    const completedCount = finalQueue.filter((item) => item.status === 'done').length;
    const failedCount = finalQueue.filter((item) => item.status === 'error').length;
    const cancelledCount = finalQueue.filter((item) => item.status === 'cancelled').length;

    if (isBatchStopRequested()) {
      notify('批处理已取消', 'success');
    } else if (failedCount > 0) {
      notify(`批处理完成：${completedCount} 成功，${failedCount} 失败`, 'error');
    } else if (cancelledCount > 0) {
      notify(`批处理完成：${completedCount} 成功，${cancelledCount} 取消`, 'success');
    } else {
      notify(`批处理完成：${completedCount} 个音频已识别`, 'success');
    }
  }, [
    getCurrentQueueItem,
    getQueueSnapshot,
    getQueuedTranscriptionItems,
    isBatchStopRequested,
    isRecording,
    isRecordingBusy,
    notify,
    resetBatchStop,
    setBatchProcessingState,
    transcribeNow,
    updateQueueItem,
    updateQueueState,
  ]);

  const handleCancel = useCallback(() => {
    requestBatchStop();
    abortCurrentRequest();
  }, [abortCurrentRequest, requestBatchStop]);

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

  const handleTranscriptionChange = useCallback((nextTranscription: string) => {
    setTranscription(nextTranscription);
    setSegments(normalizeSegments(nextTranscription));
  }, []);

  const handleSaveTranscriptionToHistory = useCallback(
    async (canUpdateActiveHistory = true) => {
      const { saved, segments: nextSegments } = await saveCurrentTranscript({
        audioFile,
        transcription,
        detectedLanguage,
        segments,
        canUpdateActiveHistory,
      });
      if (saved) {
        setSegments(nextSegments);
      }
      return saved;
    },
    [audioFile, detectedLanguage, saveCurrentTranscript, segments, transcription],
  );

  const handleRetry = useCallback(() => {
    if (!audioFile || isLoadingRef.current || isBatchProcessingRef.current || isRecording || isRecordingBusy) {
      return;
    }

    void transcribeNow(audioFile, true);
  }, [audioFile, isRecording, isRecordingBusy, transcribeNow]);

  const restoreHistoryItem = useCallback(
    (item: HistoryItem) => {
      const restoredAudioFile = item.audioUrl ? createRemoteAudioFile(item.audioUrl) : item.audioFile || null;
      setAudioFile(restoredAudioFile);
      setQueueState([]);
      setElapsedTime(null);
      setTranscription(item.transcription);
      setDetectedLanguage(item.detectedLanguage);
      setSegments(restoreHistoryDraft(item));
      notify(restoredAudioFile ? '已从历史记录恢复' : '已恢复历史文本，原始音频不可用', 'success');
      return true;
    },
    [notify, restoreHistoryDraft, setQueueState],
  );

  const handleRecordingChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, []);

  const handleRecordingBusyChange = useCallback((recordingBusy: boolean) => {
    setIsRecordingBusy(recordingBusy);
  }, []);

  useEffect(() => {
    if (transcribeAfterRecording && audioFile && !isRecording && !isRecordingBusy) {
      setTranscribeAfterRecording(false);
      void transcribeNow(audioFile);
    }
  }, [audioFile, isRecording, isRecordingBusy, transcribeAfterRecording, transcribeNow]);

  return {
    audioFile,
    transcription,
    segments,
    detectedLanguage,
    isLoading,
    loadingMessage,
    isRecording,
    isRecordingBusy,
    queue,
    isBatchProcessing,
    copied,
    elapsedTime,
    realtimeElapsedTime,
    activeHistoryItemId,
    isTranscriptionDirty: getIsTranscriptionDirty(transcription, detectedLanguage),
    handleCancel,
    handleCopy,
    handleBatchTranscribe,
    handleFilesChange,
    handleTranscriptionChange,
    handleSaveTranscriptionToHistory,
    handleFileChange,
    handleRecordingChange,
    handleRecordingBusyChange,
    handleRetry,
    removeQueueItem,
    clearQueue,
    handleTranscribe,
    handleKeyboardRecordingRelease,
    restoreHistoryItem,
  };
}
