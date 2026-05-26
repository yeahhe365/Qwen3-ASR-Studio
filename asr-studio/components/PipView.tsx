import React, { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/asrService';
import { CompressionLevel } from '../types';
import type { AsrProviderConfig, Language } from '../types';
import { compressAudio, getEffectiveCompressionLevel } from '../services/audioService';
import { createTimestampedAudioFile } from '../services/audioFileUtils';
import { stopMediaStreamTracks } from '../services/mediaStreamUtils';
import { CloseIcon } from './icons/CloseIcon';
import { PipStatusIcon } from './pip-view/PipStatusIcon';
import { PipViewStyles } from './pip-view/PipViewStyles';
import {
  canCancelPipRecording,
  canStartPipRecording,
  getPipMessageClassName,
  getPipPrimaryButtonClassName,
  getPipPrimaryButtonLabel,
  getPipPrimaryButtonTitle,
  isPipBusy,
  isPipPrimaryButtonDisabled,
  type PipViewStatus,
} from './pip-view/pipViewState';

interface PipViewProps {
  onTranscriptionResult: (result: { transcription: string; detectedLanguage: string; audioFile: File }) => void;
  onBusyChange?: (isBusy: boolean) => void;
  disabled?: boolean;
  context: string;
  language: Language;
  enableItn: boolean;
  selectedDeviceId: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  asrConfig: AsrProviderConfig;
}

export const PipView: React.FC<PipViewProps> = ({
  onTranscriptionResult,
  onBusyChange,
  disabled = false,
  context,
  language,
  enableItn,
  selectedDeviceId,
  echoCancellation,
  noiseSuppression,
  autoGainControl,
  asrConfig,
}) => {
  const [status, setStatus] = useState<PipViewStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldDiscardRecordingRef = useRef(false);
  const cancelPendingStartRef = useRef(false);
  const startRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (status === 'success' && inputRef.current) {
      inputRef.current.select();
    }
  }, [status]);

  useEffect(() => {
    onBusyChange?.(isPipBusy(status));
  }, [onBusyChange, status]);

  useEffect(() => {
    return () => {
      onBusyChange?.(false);
    };
  }, [onBusyChange]);

  const cleanupStream = useCallback(() => {
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
  }, []);

  const cleanupRecordingResources = useCallback(
    (preserveDiscardFlag = false) => {
      audioChunksRef.current = [];
      cleanupStream();
      mediaRecorderRef.current = null;
      if (!preserveDiscardFlag) {
        shouldDiscardRecordingRef.current = false;
      }
    },
    [cleanupStream],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      cancelPendingStartRef.current = true;
      startRequestIdRef.current += 1;

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        shouldDiscardRecordingRef.current = true;
        try {
          recorder.stop();
        } catch (err) {
          console.error('Failed to stop PiP recorder during cleanup:', err);
        }
      }

      cleanupRecordingResources(true);
    };
  }, [cleanupRecordingResources]);

  const handleTranscription = useCallback(
    async (audioFile: File) => {
      const controller = new AbortController();
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;

      setStatus('processing');
      setMessage('正在识别...');
      try {
        const effectiveCompressionLevel = getEffectiveCompressionLevel(
          asrConfig.provider,
          audioFile,
          CompressionLevel.ORIGINAL,
        );
        const fileToTranscribe = await compressAudio(audioFile, effectiveCompressionLevel);
        const result = await transcribeAudio(
          fileToTranscribe,
          context,
          language,
          enableItn,
          asrConfig,
          () => {},
          controller.signal,
        );

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        if (result.transcription) {
          setMessage(result.transcription);
          onTranscriptionResult({
            transcription: result.transcription,
            detectedLanguage: result.detectedLanguage,
            audioFile,
          });
          setStatus('success');
        } else {
          setMessage('未能识别到任何内容');
          setStatus('error');
        }
      } catch (err) {
        if (!isMountedRef.current || controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          if (isMountedRef.current) {
            setMessage('');
            setStatus('idle');
          }
          return;
        }

        console.error('Transcription error:', err);
        const msg = err instanceof Error ? err.message : '转录过程中发生未知错误';
        setMessage(msg);
        setStatus('error');
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [asrConfig, context, language, enableItn, onTranscriptionResult],
  );

  const stopRecording = useCallback(() => {
    if (status === 'requesting') {
      cancelPendingStartRef.current = true;
      startRequestIdRef.current += 1;
      shouldDiscardRecordingRef.current = true;
      cleanupRecordingResources();
      setStatus('idle');
      setMessage('');
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [cleanupRecordingResources, status]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();

    const recorder = mediaRecorderRef.current;
    cancelPendingStartRef.current = true;
    startRequestIdRef.current += 1;
    shouldDiscardRecordingRef.current = true;
    audioChunksRef.current = [];

    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (err) {
        console.error('Failed to stop PiP recorder after cancel:', err);
        cleanupRecordingResources();
      }
    } else if (recorder) {
      cleanupRecordingResources(true);
    } else {
      cleanupRecordingResources();
    }

    setStatus('idle');
    setMessage('');
  }, [cleanupRecordingResources]);

  const handleRecordingError = useCallback(
    (recorder: MediaRecorder) => {
      shouldDiscardRecordingRef.current = true;
      cleanupRecordingResources(true);

      if (isMountedRef.current) {
        setMessage('录音过程中发生错误，请重新尝试。');
        setStatus('error');
      }

      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
          return;
        } catch (err) {
          console.error('Failed to stop PiP recorder after error:', err);
        }
      }

      cleanupRecordingResources();
    },
    [cleanupRecordingResources],
  );

  const startRecording = async () => {
    if (disabled) {
      setMessage('主窗口识别进行中');
      setStatus('idle');
      return;
    }

    if (!navigator.mediaDevices) {
      setMessage('您的浏览器不支持录音功能。');
      setStatus('error');
      return;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    const requestId = startRequestIdRef.current + 1;
    startRequestIdRef.current = requestId;
    cancelPendingStartRef.current = false;
    setMessage('正在准备麦克风...');
    setStatus('requesting');
    shouldDiscardRecordingRef.current = false;
    audioChunksRef.current = [];

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId === 'default' ? undefined : { exact: selectedDeviceId },
          echoCancellation,
          noiseSuppression,
          autoGainControl,
        },
      });

      if (!isMountedRef.current || requestId !== startRequestIdRef.current || cancelPendingStartRef.current) {
        stopMediaStreamTracks(stream);
        if (isMountedRef.current && requestId === startRequestIdRef.current) {
          setMessage('');
          setStatus('idle');
        }
        return;
      }

      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const shouldDiscard = shouldDiscardRecordingRef.current;
        const audioChunks = audioChunksRef.current;
        const mimeType = recorder.mimeType || 'audio/webm';
        cleanupRecordingResources();

        if (shouldDiscard || !isMountedRef.current) {
          return;
        }

        if (audioChunks.length === 0) {
          setMessage('未捕获到音频，请重试');
          setStatus('error');
          return;
        }

        const audioFile = createTimestampedAudioFile(audioChunks, mimeType, 'pip-recording');
        handleTranscription(audioFile);
      };

      recorder.onerror = () => {
        handleRecordingError(recorder);
      };

      recorder.start();
      cancelPendingStartRef.current = false;
      setMessage('正在聆听...');
      setStatus('recording');
    } catch (err) {
      if (stream && stream !== streamRef.current) {
        stopMediaStreamTracks(stream);
      }

      if (!isMountedRef.current || requestId !== startRequestIdRef.current || cancelPendingStartRef.current) {
        return;
      }

      console.error('Error accessing microphone:', err);
      cleanupRecordingResources();

      if (isMountedRef.current) {
        setMessage('麦克风访问被拒绝或不可用。');
        setStatus('error');
      }
    }
  };

  const handleClick = () => {
    if (canCancelPipRecording(status)) {
      stopRecording();
    } else if (canStartPipRecording(status, disabled)) {
      startRecording();
    }
  };

  return (
    <div className="workspace-shell flex h-screen w-full items-center p-4 font-sans text-content-100">
      <PipViewStyles />
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={handleClick}
          disabled={isPipPrimaryButtonDisabled(status, disabled)}
          className={getPipPrimaryButtonClassName(status)}
          aria-label={getPipPrimaryButtonLabel(status, disabled)}
          title={getPipPrimaryButtonTitle(status, disabled)}
        >
          <PipStatusIcon status={status} />
        </button>
        {canCancelPipRecording(status) && (
          <button
            onClick={handleCancel}
            title="取消"
            aria-label="取消录音"
            className="flex h-11 w-11 items-center justify-center rounded-md bg-base-300 text-content-100 transition-colors duration-300 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-base-100"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={message}
        placeholder={disabled ? '主窗口识别进行中' : '点击录音'}
        className={getPipMessageClassName(status)}
      />
    </div>
  );
};
