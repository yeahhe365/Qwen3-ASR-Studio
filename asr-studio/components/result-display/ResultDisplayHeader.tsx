import React from 'react';
import {
  getTranscriptSaveStatusLabel,
  isTranscriptSavePending,
  type TranscriptSaveState,
} from '../../services/transcriptSaveState';
import { LanguageIcon } from '../icons/LanguageIcon';

interface ResultDisplayHeaderProps {
  isLoading: boolean;
  hasResult: boolean;
  detectedLanguage: string;
  elapsedTime?: number | null;
  characterCount: number;
  lineCount: number;
  segmentCount: number;
  saveState?: TranscriptSaveState | null;
}

export const ResultDisplayHeader: React.FC<ResultDisplayHeaderProps> = ({
  isLoading,
  hasResult,
  detectedLanguage,
  elapsedTime,
  characterCount,
  lineCount,
  segmentCount,
  saveState,
}) => {
  const statusLabel = isLoading ? '处理中' : hasResult ? '已就绪' : '等待输入';
  const saveStateLabel = getTranscriptSaveStatusLabel(saveState);

  return (
    <div className="panel-header flex-col items-stretch sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="eyebrow">Transcript</p>
        <h2 className="panel-title mt-1">转写工作区</h2>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={`status-pill ${
            isLoading ? 'bg-brand-primary/10 text-brand-primary' : hasResult ? 'text-brand-primary' : ''
          }`}
        >
          {statusLabel}
        </span>
        {!isLoading && (
          <>
            {detectedLanguage && (
              <div className="status-pill font-medium">
                <LanguageIcon className="h-4 w-4 text-brand-primary" />
                <span>{detectedLanguage}</span>
              </div>
            )}
            {elapsedTime != null && (
              <div title="识别耗时" className="status-pill font-mono font-medium">
                <span>{elapsedTime.toFixed(2)}s</span>
              </div>
            )}
            {characterCount > 0 && <span className="status-pill font-mono">{characterCount} 字</span>}
            {lineCount > 0 && <span className="status-pill font-mono">{lineCount} 行</span>}
            {segmentCount > 0 && <span className="status-pill font-mono">{segmentCount} 段</span>}
            {saveStateLabel && (
              <span
                className={`status-pill ${
                  isTranscriptSavePending(saveState) ? 'text-amber-600 dark:text-amber-300' : 'text-brand-primary'
                }`}
              >
                {saveStateLabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
