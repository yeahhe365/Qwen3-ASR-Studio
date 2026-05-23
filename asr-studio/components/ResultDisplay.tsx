
import React, { useEffect, useState } from 'react';
import { LanguageIcon } from './icons/LanguageIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { EmptyState } from './EmptyState';

interface ResultDisplayProps {
  transcription: string;
  detectedLanguage: string;
  isLoading: boolean;
  loadingStatus?: string;
  elapsedTime?: number | null;
}

const loadingMessages = [
  '正在初始化模型...',
  '正在处理您的音频...',
  '执行神经网络分析...',
  '正在识别语音内容...',
  '生成最终转录文本...',
  '快好了...',
];

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ transcription, detectedLanguage, isLoading, loadingStatus, elapsedTime }) => {
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

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

  const hasResult = transcription || detectedLanguage;

  return (
    <div className="flex min-w-0 flex-grow flex-col rounded-xl border border-base-300 bg-base-200 shadow-sm md:min-h-0">
      <div className="flex flex-col gap-2 border-b border-base-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-sm font-semibold text-content-100">识别结果</h2>
          <p className="mt-0.5 text-xs text-content-200">转录文本、语言和耗时会显示在这里。</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {!isLoading && (
            <>
              {detectedLanguage && (
                <div className="flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs font-medium text-content-200 shadow-sm">
                  <LanguageIcon className="h-4 w-4 text-brand-primary" />
                  <span>{detectedLanguage}</span>
                </div>
              )}
              {elapsedTime != null && (
                <div title="识别耗时" className="flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-xs font-medium text-content-200 shadow-sm">
                  <span>耗时: {elapsedTime.toFixed(2)}s</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="relative min-h-[240px] flex-grow overflow-y-auto rounded-b-xl bg-base-100 p-4 sm:min-h-[300px] sm:p-5">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex h-full flex-col items-center justify-center bg-base-100/80 text-center backdrop-blur-sm">
            <LoaderIcon color="var(--color-brand-primary)" className="h-10" />
          </div>
        )}

        {!isLoading && (
          hasResult ? (
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-content-100">
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
        )}
      </div>
    </div>
  );
};
