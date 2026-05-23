
import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export interface FileUploadHandle {
  clear: () => void;
}

export const FileUpload = forwardRef<FileUploadHandle, FileUploadProps>(({ onFileSelect, disabled }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }));

  const handleFileSelect = useCallback((selectedFile: File | undefined) => {
    // Removed strict MIME type check to allow more flexible uploads.
    // The backend will handle the ultimate validation.
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    handleFileSelect(droppedFile);
  }, [disabled, handleFileSelect]);

  const onButtonClick = () => {
    inputRef.current?.click();
  };
  
  const dropzoneBaseClasses = "relative flex flex-col items-center justify-center w-full p-5 sm:p-7 transition-all duration-200 border border-dashed rounded-xl cursor-pointer";
  const dropzoneDisabledClasses = "bg-base-300 opacity-60 cursor-not-allowed";
  const dropzoneIdleClasses = "border-base-300 bg-base-100 hover:border-brand-primary hover:bg-base-200";
  const dropzoneDraggingClasses = "border-brand-primary bg-base-200 ring-2 ring-brand-primary/30";

  return (
    <div
      className={`${dropzoneBaseClasses} ${disabled ? dropzoneDisabledClasses : isDragging ? dropzoneDraggingClasses : dropzoneIdleClasses}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.opus,.aac,.webm"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center text-center">
        <UploadIcon className="mb-3 h-11 w-11 rounded-xl border border-base-300 bg-base-200 p-2 text-content-200 shadow-sm sm:h-12 sm:w-12" />
        <p className="font-semibold text-content-100 text-sm sm:text-base">
          点击上传或拖拽文件
        </p>
        <p className="mt-1 text-xs text-content-200 sm:text-sm">支持 WAV, MP3, FLAC 等格式</p>
      </div>
    </div>
  );
});
