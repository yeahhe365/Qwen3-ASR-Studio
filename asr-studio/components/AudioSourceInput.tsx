import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { filterSupportedAudioInputFiles } from '../services/audioFileUtils';
import { createRemoteAudioFile, parseHttpUrl } from '../services/remoteAudioFile';
import { UploadIcon } from './icons/UploadIcon';

interface AudioSourceInputProps {
  onFileSelect: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  allowRemoteUrl?: boolean;
  remoteUrlOnly?: boolean;
}

export interface AudioSourceInputHandle {
  clear: () => void;
}

export const AudioSourceInput = forwardRef<AudioSourceInputHandle, AudioSourceInputProps>(
  ({ onFileSelect, onFilesSelect, onError, disabled, allowRemoteUrl, remoteUrlOnly }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const [remoteUrl, setRemoteUrl] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        setRemoteUrl('');
      },
    }));

    useEffect(() => {
      if (disabled) {
        setIsDragging(false);
      }
    }, [disabled]);

    const handleFilesSelect = useCallback(
      (fileList: FileList | null | undefined) => {
        if (disabled) {
          return;
        }

        const files = Array.from(fileList || []);
        if (files.length === 0) {
          return;
        }

        const supportedFiles = filterSupportedAudioInputFiles(files);
        const skippedCount = files.length - supportedFiles.length;

        if (supportedFiles.length === 0) {
          onError('未找到支持的音频文件。请上传 WAV / MP3 / FLAC / M4A / OGG / WebM 等格式。');
          return;
        }

        if (skippedCount > 0) {
          onError(`已跳过 ${skippedCount} 个非音频或不支持的文件。`);
        }

        if (supportedFiles.length === 1 || !onFilesSelect) {
          onFileSelect(supportedFiles[0]);
          return;
        }

        onFilesSelect(supportedFiles);
      },
      [disabled, onError, onFileSelect, onFilesSelect],
    );

    const onDragEnter = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) {
          setIsDragging(true);
        }
      },
      [disabled],
    );

    const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
    }, []);

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
    }, []);

    const onDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (disabled) {
          return;
        }

        handleFilesSelect(event.dataTransfer.files);
      },
      [disabled, handleFilesSelect],
    );

    const openFilePicker = useCallback(() => {
      if (disabled) {
        return;
      }

      inputRef.current?.click();
    }, [disabled]);

    const handleDropzoneKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        openFilePicker();
      },
      [openFilePicker],
    );

    const handleRemoteUrlSubmit = () => {
      if (disabled) {
        return;
      }

      const normalizedUrl = remoteUrl.trim();
      if (!normalizedUrl) {
        return;
      }

      if (!parseHttpUrl(normalizedUrl)) {
        onError('请输入有效的音频 URL。');
        return;
      }

      onFileSelect(createRemoteAudioFile(normalizedUrl));
    };

    const dropzoneBaseClasses =
      'surface-inset relative flex w-full cursor-pointer flex-col items-center justify-center p-5 text-center transition-all duration-200';
    const dropzoneDisabledClasses = 'opacity-60 cursor-not-allowed';
    const dropzoneIdleClasses = 'hover:border-brand-primary/50 hover:bg-base-100';
    const dropzoneDraggingClasses = 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20';

    return (
      <div className="space-y-3">
        {!remoteUrlOnly && (
          <div
            className={`${dropzoneBaseClasses} ${disabled ? dropzoneDisabledClasses : isDragging ? dropzoneDraggingClasses : dropzoneIdleClasses}`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={openFilePicker}
            onKeyDown={handleDropzoneKeyDown}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label="上传一个或多个音频文件"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.opus,.aac,.webm"
              className="hidden"
              onChange={(event) => {
                handleFilesSelect(event.target.files);
                event.target.value = '';
              }}
              disabled={disabled}
            />
            <div className="flex flex-col items-center justify-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary">
                <UploadIcon className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-content-100">上传音频</p>
              <p className="mt-1 text-xs text-content-200">可多选 WAV / MP3 / FLAC / M4A / OGG / WebM</p>
            </div>
          </div>
        )}

        {(remoteUrlOnly || allowRemoteUrl) && (
          <div className="surface-inset p-4">
            <label htmlFor="remote-audio-url" className="eyebrow">
              可选远程音频 URL
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="remote-audio-url"
                type="url"
                value={remoteUrl}
                onChange={(event) => setRemoteUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleRemoteUrlSubmit();
                  }
                }}
                disabled={disabled}
                placeholder="https://example.com/audio.wav"
                className="field-control min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={handleRemoteUrlSubmit}
                disabled={disabled || !remoteUrl.trim()}
                className="secondary-action"
              >
                使用 URL
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-content-200">
              豆包默认会把本地文件转为 base64 提交；也可填写服务端可访问的 WAV、MP3、OGG 等在线音频 URL。
            </p>
          </div>
        )}
      </div>
    );
  },
);
