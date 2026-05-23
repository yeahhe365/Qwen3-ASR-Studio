
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { LanguageIcon } from './icons/LanguageIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { EmptyState } from './EmptyState';

interface ResultDisplayProps {
  transcription: string;
  setTranscription: (value: string | ((prev: string) => string)) => void;
  detectedLanguage: string;
  isLoading: boolean;
  loadingStatus?: string;
  transcriptionMode: 'single' | 'notes';
  onModeChange: (mode: 'single' | 'notes') => void;
  onSaveNote: () => void;
  elapsedTime?: number | null;
}

export interface ResultDisplayHandle {
  insertText: (text: string) => void;
}

const loadingMessages = [
  "正在初始化模型...",
  "正在处理您的音频...",
  "执行神经网络分析...",
  "正在识别语音内容...",
  "生成最终转录文本...",
  "快好了...",
];

export const ResultDisplay = forwardRef<ResultDisplayHandle, ResultDisplayProps>(
  ({ transcription, setTranscription, detectedLanguage, isLoading, loadingStatus, transcriptionMode, onModeChange, onSaveNote, elapsedTime }, ref) => {
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      insertText: (textToInsert) => {
        const textarea = textareaRef.current;
        
        // This function is intended for notes mode.
        if (transcriptionMode === 'notes' && textarea) {
          // If the textarea is available, we insert at the cursor.
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentText = textarea.value;

          const newText = currentText.slice(0, start) + textToInsert + currentText.slice(end);
          setTranscription(newText);
          
          // Defer setting selection to after the component re-renders
          setTimeout(() => {
            if (textareaRef.current) {
              const newCursorPosition = start + textToInsert.length;
              textareaRef.current.selectionStart = newCursorPosition;
              textareaRef.current.selectionEnd = newCursorPosition;
              textareaRef.current.focus();
            }
          }, 0);
        } else if (transcriptionMode === 'notes') {
          // Fallback for notes mode when the textarea isn't rendered yet. Append to the end to prevent data loss.
          setTranscription(prev => prev + textToInsert);
        } else {
          // This path should not be hit based on App.tsx logic, but as a safeguard, we honor single-mode behavior.
          setTranscription(textToInsert);
        }
      },
    }));

    useEffect(() => {
      if (isLoading && !loadingStatus) {
        let messageIndex = 0;
        const interval = setInterval(() => {
          messageIndex = (messageIndex + 1) % loadingMessages.length;
          setLoadingMessage(loadingMessages[messageIndex]);
        }, 2500);

        return () => {
          clearInterval(interval);
          setLoadingMessage(loadingMessages[0]);
        };
      }
    }, [isLoading, loadingStatus]);

    const hasResult = transcription || (detectedLanguage && transcriptionMode === 'single');

    return (
      <div className="flex min-w-0 flex-grow flex-col rounded-lg border border-base-300 bg-base-200 shadow-sm md:min-h-0">
        <div className="flex flex-col gap-2 border-b border-base-300 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0">
          <div className="flex w-full min-w-0 items-center gap-1 rounded-lg bg-base-200 p-1 sm:w-auto">
            <button
              onClick={() => onModeChange('single')}
              className={`min-w-0 flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 sm:flex-none ${
                transcriptionMode === 'single' ? 'bg-brand-primary text-white shadow' : 'text-content-200 hover:bg-base-300'
              }`}
            >
              单次
            </button>
            <button
              onClick={() => onModeChange('notes')}
              className={`min-w-0 flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 sm:flex-none ${
                transcriptionMode === 'notes' ? 'bg-brand-primary text-white shadow' : 'text-content-200 hover:bg-base-300'
              }`}
            >
              笔记
            </button>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {transcriptionMode === 'single' && !isLoading && (
              <>
                {detectedLanguage && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-base-100 text-content-200 border border-base-300">
                    <LanguageIcon className="w-4 h-4 text-brand-primary" />
                    <span>{detectedLanguage}</span>
                  </div>
                )}
                {elapsedTime != null && (
                  <div title="识别耗时" className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-base-100 text-content-200 border border-base-300">
                      <span>耗时: {elapsedTime.toFixed(2)}s</span>
                  </div>
                )}
              </>
            )}
            {transcriptionMode === 'notes' && !isLoading && (
              <button
                onClick={onSaveNote}
                disabled={!transcription.trim()}
                title="保存笔记"
                className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors bg-brand-primary text-white hover:bg-brand-secondary disabled:bg-base-300 disabled:text-content-200 disabled:cursor-not-allowed"
              >
                保存
              </button>
            )}
          </div>
        </div>
        <div className="relative min-h-[220px] flex-grow overflow-y-auto rounded-b-lg bg-base-100 p-4 sm:min-h-[260px] sm:p-5">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-base-100/80 backdrop-blur-sm z-10">
              <LoaderIcon color="var(--color-brand-primary)" className="h-10" />
            </div>
          )}

          {transcriptionMode === 'notes' ? (
            <textarea
              ref={textareaRef}
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder="识别结果将显示并可在此处编辑..."
              className="w-full h-full min-h-[150px] md:min-h-full bg-transparent resize-none focus:outline-none text-content-100 text-base leading-relaxed placeholder:text-content-200"
              aria-label="识别结果笔记"
              disabled={isLoading}
            />
          ) : (
             !isLoading && (
              hasResult ? (
                <div className="text-content-100 whitespace-pre-wrap text-base leading-relaxed">
                  {transcription}
                </div>
              ) : (
                <EmptyState
                  icon={<LanguageIcon className="h-5 w-5" />}
                  title="识别结果将显示在这里"
                  description="先录音或上传音频，再点击识别开始处理。"
                  className="min-h-[200px] sm:min-h-[220px]"
                />
              )
            )
          )}
        </div>
      </div>
    );
  }
);
