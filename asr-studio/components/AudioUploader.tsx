
import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { FileUpload, type FileUploadHandle } from './FileUpload';
import { AudioRecorder, type AudioRecorderHandle } from './AudioRecorder';
import { UploadIcon } from './icons/UploadIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface AudioUploaderProps {
  onFileChange: (file: File | null) => void;
  onRecordingChange: (isRecording: boolean) => void;
  disabled?: boolean;
  onRecordingError: (message: string) => void;
  theme: 'light' | 'dark';
  selectedDeviceId: string;
}

export interface AudioUploaderHandle {
  stopRecording: () => void;
  startRecording: () => void;
  clearInput: () => void;
}

export const AudioUploader = forwardRef<AudioUploaderHandle, AudioUploaderProps>(({ onFileChange, onRecordingChange, disabled, onRecordingError, theme, selectedDeviceId }, ref) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('record');
  const recorderRef = useRef<AudioRecorderHandle>(null);
  const uploaderRef = useRef<FileUploadHandle>(null);

  useImperativeHandle(ref, () => ({
    stopRecording: () => {
      recorderRef.current?.stopRecording();
    },
    startRecording: () => {
      recorderRef.current?.startRecording();
    },
    clearInput: () => {
      uploaderRef.current?.clear();
    }
  }));

  const handleFileSelect = (selectedFile: File) => {
    onFileChange(selectedFile);
  };
  
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-base-300 bg-base-200 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-content-100">音频输入</h2>
          <p className="mt-0.5 text-xs text-content-200">录音或上传文件后开始识别。</p>
        </div>
        <div
          role="tablist"
          aria-label="Audio input method"
          className="grid grid-cols-2 gap-1 rounded-lg border border-base-300 bg-base-100 p-1 shadow-sm sm:w-48"
        >
          <button
            onClick={() => setActiveTab('record')}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${activeTab === 'record' ? 'bg-base-200 text-content-100 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'}`}
            aria-selected={activeTab === 'record'}
            role="tab"
          >
            <MicrophoneIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">录音</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-base-200 text-content-100 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'}`}
            aria-selected={activeTab === 'upload'}
            role="tab"
          >
            <UploadIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">上传</span>
          </button>
        </div>
      </div>
    
      <div>
        <div className={activeTab === 'upload' ? 'block' : 'hidden'} role="tabpanel">
          <FileUpload 
            ref={uploaderRef}
            onFileSelect={handleFileSelect} 
            disabled={disabled} 
          />
        </div>
        
        <div className={activeTab === 'record' ? 'block' : 'hidden'} role="tabpanel">
          <div className="relative flex flex-col items-center justify-center w-full text-center transition-all duration-300">
            <AudioRecorder 
              ref={recorderRef}
              onFileChange={onFileChange}
              onRecordingChange={onRecordingChange}
              disabled={disabled}
              onRecordingError={onRecordingError}
              theme={theme}
              selectedDeviceId={selectedDeviceId}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
