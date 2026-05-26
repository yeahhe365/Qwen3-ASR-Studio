import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { setCachedRecording } from '../services/cacheService';
import { createTimestampedAudioFile, formatAudioTime } from '../services/audioFileUtils';
import { stopMediaStreamTracks } from '../services/mediaStreamUtils';
import type { Theme } from '../types';
import {
  getAudioRecorderButtonAriaLabel,
  getAudioRecorderButtonClassName,
  getAudioRecorderButtonTitle,
  getAudioRecorderStatusDotClassName,
  getAudioRecorderStatusLabel,
  isAudioRecorderBusy,
  isAudioRecorderRecording,
  type AudioRecorderStatus,
} from './audio-recorder/audioRecorderState';
import { AudioRecorderButtonContent } from './audio-recorder/AudioRecorderButtonContent';

interface AudioRecorderProps {
  onFileChange: (file: File | null) => void;
  onRecordingChange: (isRecording: boolean) => void;
  onRecordingBusyChange: (isBusy: boolean) => void;
  disabled?: boolean;
  onRecordingError: (message: string) => void;
  theme: Theme;
  selectedDeviceId: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export type { AudioRecorderStatus } from './audio-recorder/audioRecorderState';

export interface AudioRecorderHandle {
  stopRecording: () => AudioRecorderStatus;
  startRecording: () => void;
}

export const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(
  (
    {
      onFileChange,
      onRecordingChange,
      onRecordingBusyChange,
      disabled,
      onRecordingError,
      theme,
      selectedDeviceId,
      echoCancellation,
      noiseSuppression,
      autoGainControl,
    },
    ref,
  ) => {
    const [recordingStatus, setRecordingStatusState] = useState<AudioRecorderStatus>('idle');
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const shouldDiscardRecordingRef = useRef(false);
    const cancelPendingStartRef = useRef(false);
    const startRequestIdRef = useRef(0);
    const recordingStatusRef = useRef<AudioRecorderStatus>('idle');
    const isMountedRef = useRef(true);

    const setRecordingStatus = useCallback((nextStatus: AudioRecorderStatus) => {
      recordingStatusRef.current = nextStatus;
      setRecordingStatusState(nextStatus);
    }, []);

    useEffect(() => {
      onRecordingChange(isAudioRecorderRecording(recordingStatus));
      onRecordingBusyChange(isAudioRecorderBusy(recordingStatus));
    }, [onRecordingBusyChange, onRecordingChange, recordingStatus]);

    const stopTimer = () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };

    const startTimer = () => {
      stopTimer();
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    };

    const cleanupAudio = useCallback(() => {
      sourceRef.current?.disconnect();
      sourceRef.current = null;
      analyserRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
      audioContextRef.current = null;
    }, []);

    const cleanupStream = useCallback(() => {
      stopMediaStreamTracks(streamRef.current);
      streamRef.current = null;
    }, []);

    const cleanupRecordingResources = useCallback(() => {
      stopTimer();
      cleanupAudio();
      cleanupStream();
    }, [cleanupAudio, cleanupStream]);

    useEffect(() => {
      return () => {
        isMountedRef.current = false;
        shouldDiscardRecordingRef.current = true;
        cancelPendingStartRef.current = true;
        startRequestIdRef.current += 1;

        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch (error) {
            console.error('Failed to stop recorder during cleanup:', error);
          }
        }

        cleanupRecordingResources();
        onRecordingChange(false);
        onRecordingBusyChange(false);
      };
    }, [cleanupRecordingResources, onRecordingBusyChange, onRecordingChange]);

    const handleStopRecording = useCallback(() => {
      const currentStatus = recordingStatusRef.current;

      if (currentStatus === 'requesting') {
        cancelPendingStartRef.current = true;
        startRequestIdRef.current += 1;
        shouldDiscardRecordingRef.current = true;
        audioChunksRef.current = [];
        cleanupRecordingResources();
        setRecordingStatus('idle');
        return 'requesting';
      }

      if (currentStatus !== 'recording' || !mediaRecorderRef.current) {
        return currentStatus;
      }

      if (mediaRecorderRef.current.state !== 'inactive') {
        setRecordingStatus('stopping');
        mediaRecorderRef.current.stop();
      } else {
        setRecordingStatus('idle');
      }
      stopTimer();
      cleanupAudio();
      return 'recording';
    }, [cleanupAudio, cleanupRecordingResources, setRecordingStatus]);

    const handleStartRecording = async () => {
      if (disabled) {
        return;
      }

      if (recordingStatusRef.current !== 'idle') {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        onRecordingError('您的浏览器不支持录音功能。');
        return;
      }

      let stream: MediaStream | null = null;
      const requestId = startRequestIdRef.current + 1;
      startRequestIdRef.current = requestId;
      cancelPendingStartRef.current = false;
      shouldDiscardRecordingRef.current = false;
      setRecordingStatus('requesting');
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
            setRecordingStatus('idle');
          }
          return;
        }

        streamRef.current = stream;

        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
          onRecordingError('您的浏览器不支持音频分析功能。');
          cleanupStream();
          setRecordingStatus('idle');
          return;
        }

        const audioContext = new AudioContextConstructor();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
        analyserRef.current = analyser;

        source.connect(analyser);

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const shouldDiscard = shouldDiscardRecordingRef.current || !isMountedRef.current;
          const mimeType = recorder.mimeType || 'audio/webm';
          const chunks = audioChunksRef.current;

          audioChunksRef.current = [];
          cleanupStream();
          mediaRecorderRef.current = null;

          if (shouldDiscard) {
            shouldDiscardRecordingRef.current = false;
            if (isMountedRef.current) {
              setRecordingStatus('idle');
            }
            return;
          }

          if (chunks.length === 0) {
            onRecordingError('未捕获到音频，请重试。');
            setRecordingStatus('idle');
            return;
          }

          const audioFile = createTimestampedAudioFile(chunks, mimeType, 'recording');

          setCachedRecording(audioFile).catch((err) => {
            console.error('Failed to cache recording:', err);
          });

          onFileChange(audioFile);
          setRecordingStatus('idle');
        };

        recorder.onerror = () => {
          shouldDiscardRecordingRef.current = true;
          audioChunksRef.current = [];
          cleanupRecordingResources();
          mediaRecorderRef.current = null;
          if (!isMountedRef.current) {
            return;
          }

          setRecordingStatus('idle');
          onRecordingError('录音过程中发生错误，请重新尝试。');
        };

        recorder.start();
        setRecordingStatus('recording');
        startTimer();
      } catch (err) {
        if (stream && stream !== streamRef.current) {
          stopMediaStreamTracks(stream);
        }

        if (!isMountedRef.current || requestId !== startRequestIdRef.current || cancelPendingStartRef.current) {
          return;
        }

        console.error('Error accessing microphone:', err);
        setRecordingStatus('idle');
        cancelPendingStartRef.current = false;
        shouldDiscardRecordingRef.current = false;
        audioChunksRef.current = [];
        cleanupRecordingResources();
        onRecordingError('麦克风访问被拒绝或不可用。');
      }
    };

    useImperativeHandle(ref, () => ({
      stopRecording: handleStopRecording,
      startRecording: handleStartRecording,
    }));

    return (
      <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-3">
        <div className="flex min-w-0 flex-col items-stretch">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
            <p className="surface-inset px-3 py-1 font-mono text-lg font-semibold tabular-nums text-content-100">
              {formatAudioTime(recordingTime)}
            </p>
            <span className="status-pill">
              <span className={getAudioRecorderStatusDotClassName(recordingStatus)} />
              {getAudioRecorderStatusLabel(recordingStatus)}
            </span>
          </div>
          <button
            type="button"
            onClick={recordingStatus === 'idle' ? handleStartRecording : handleStopRecording}
            disabled={disabled || recordingStatus === 'stopping'}
            title={getAudioRecorderButtonTitle(recordingStatus)}
            aria-label={getAudioRecorderButtonAriaLabel(recordingStatus)}
            className={getAudioRecorderButtonClassName(recordingStatus)}
          >
            <AudioRecorderButtonContent status={recordingStatus} />
          </button>
        </div>
        <div className="flex min-w-0 flex-col justify-center text-left">
          <div className="surface-inset h-20 w-full overflow-hidden">
            <LiveAudioWaveform
              analyser={analyserRef.current}
              isRecording={isAudioRecorderRecording(recordingStatus)}
              theme={theme}
            />
          </div>
        </div>
      </div>
    );
  },
);
