import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { AudioRecorder, type AudioRecorderHandle, type AudioRecorderStatus } from './AudioRecorder';
import { AudioSourceInput, type AudioSourceInputHandle } from './AudioSourceInput';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { UploadIcon } from './icons/UploadIcon';

interface AudioInputPanelProps {
  onFileChange: (file: File | null) => void;
  onFilesChange: (files: File[]) => void;
  onRecordingChange: (isRecording: boolean) => void;
  onRecordingBusyChange: (isBusy: boolean) => void;
  disabled?: boolean;
  isRecording?: boolean;
  onRecordingError: (message: string) => void;
  theme: 'light' | 'dark';
  selectedDeviceId: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  allowRemoteUrl?: boolean;
}

export interface AudioInputPanelHandle {
  stopRecording: () => AudioRecorderStatus;
  startRecording: () => void;
  clearInput: () => void;
}

export const AudioInputPanel = forwardRef<AudioInputPanelHandle, AudioInputPanelProps>(
  (
    {
      onFileChange,
      onFilesChange,
      onRecordingChange,
      onRecordingBusyChange,
      disabled,
      isRecording,
      onRecordingError,
      theme,
      selectedDeviceId,
      echoCancellation,
      noiseSuppression,
      autoGainControl,
      allowRemoteUrl,
    },
    ref,
  ) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'record'>('record');
    const recorderRef = useRef<AudioRecorderHandle>(null);
    const sourceInputRef = useRef<AudioSourceInputHandle>(null);
    const inputLocked = disabled || isRecording;

    useImperativeHandle(ref, () => ({
      stopRecording: () => {
        return recorderRef.current?.stopRecording() ?? 'idle';
      },
      startRecording: () => {
        if (disabled || isRecording) {
          return;
        }

        recorderRef.current?.startRecording();
      },
      clearInput: () => {
        sourceInputRef.current?.clear();
      },
    }));

    const handleRecordTabClick = () => {
      if (!inputLocked) {
        setActiveTab('record');
      }
    };

    const handleUploadTabClick = () => {
      if (!inputLocked) {
        setActiveTab('upload');
      }
    };

    return (
      <div className="surface-panel w-full min-w-0 max-w-full overflow-hidden">
        <div className="panel-header flex-col items-stretch sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Input</p>
            <h2 className="panel-title mt-1">音频输入</h2>
          </div>
          <div
            role="tablist"
            aria-label="Audio input method"
            className="grid grid-cols-2 gap-1 rounded-md bg-base-100 p-1 ring-1 ring-base-300 sm:w-44"
          >
            <button
              type="button"
              onClick={handleRecordTabClick}
              disabled={inputLocked}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${activeTab === 'record' ? 'bg-content-100 text-base-200 shadow-sm' : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'}`}
              aria-selected={activeTab === 'record'}
              role="tab"
              title={inputLocked ? '录音或识别进行中' : undefined}
            >
              <MicrophoneIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">录音</span>
            </button>
            <button
              type="button"
              onClick={handleUploadTabClick}
              disabled={inputLocked}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${activeTab === 'upload' ? 'bg-content-100 text-base-200 shadow-sm' : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'}`}
              aria-selected={activeTab === 'upload'}
              role="tab"
              title={inputLocked ? '录音或识别进行中' : undefined}
            >
              <UploadIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">上传</span>
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className={activeTab === 'upload' ? 'block' : 'hidden'} role="tabpanel">
            <AudioSourceInput
              ref={sourceInputRef}
              onFileSelect={(file) => onFileChange(file)}
              onFilesSelect={onFilesChange}
              onError={onRecordingError}
              disabled={inputLocked}
              allowRemoteUrl={allowRemoteUrl}
            />
          </div>

          <div className={activeTab === 'record' ? 'block' : 'hidden'} role="tabpanel">
            <div className="relative flex w-full flex-col items-center justify-center text-center transition-all duration-300">
              <AudioRecorder
                ref={recorderRef}
                onFileChange={onFileChange}
                onRecordingChange={onRecordingChange}
                onRecordingBusyChange={onRecordingBusyChange}
                disabled={disabled}
                onRecordingError={onRecordingError}
                theme={theme}
                selectedDeviceId={selectedDeviceId}
                echoCancellation={echoCancellation}
                noiseSuppression={noiseSuppression}
                autoGainControl={autoGainControl}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
