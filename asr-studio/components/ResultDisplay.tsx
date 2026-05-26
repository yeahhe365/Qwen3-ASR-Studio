import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { EmptyState } from './EmptyState';
import type { AsrProvider, TranscriptionSegment } from '../types';
import { ResultDisplayHeader } from './result-display/ResultDisplayHeader';
import { ResultSegmentsView } from './result-display/ResultSegmentsView';
import { ResultToolbar } from './result-display/ResultToolbar';
import { countMatches, type ResultViewMode } from './result-display/resultDisplayUtils';
import { downloadTranscriptExport, type TranscriptExportFormat } from '../services/transcriptionExport';
import { isTranscriptSavePending, type TranscriptSaveState } from '../services/transcriptSaveState';

interface ResultDisplayProps {
  transcription: string;
  detectedLanguage: string;
  isLoading: boolean;
  loadingStatus?: string;
  elapsedTime?: number | null;
  segments?: TranscriptionSegment[];
  sourceFileName?: string;
  provider?: AsrProvider;
  saveState?: TranscriptSaveState | null;
  disabled?: boolean;
  onTranscriptionChange: (value: string) => void;
  onSaveTranscription: () => Promise<boolean>;
}

const loadingMessages = [
  '正在初始化模型...',
  '正在处理您的音频...',
  '执行神经网络分析...',
  '正在识别语音内容...',
  '生成最终转录文本...',
  '快好了...',
];

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  transcription,
  detectedLanguage,
  isLoading,
  loadingStatus,
  elapsedTime,
  segments,
  sourceFileName,
  provider,
  saveState,
  disabled = false,
  onTranscriptionChange,
  onSaveTranscription,
}) => {
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [exportFormat, setExportFormat] = useState<TranscriptExportFormat>('txt');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ResultViewMode>('text');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading || loadingStatus) {
      setLoadingMessage(loadingMessages[0]);
      return undefined;
    }

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 2500);

    return () => {
      clearInterval(interval);
    };
  }, [isLoading, loadingStatus]);

  useEffect(() => {
    if (viewMode === 'segments' && !segments?.length) {
      setViewMode('text');
    }
  }, [segments?.length, viewMode]);

  const hasResult = Boolean(transcription || detectedLanguage);
  const characterCount = transcription.length;
  const lineCount = transcription ? transcription.split(/\r\n|\r|\n/).length : 0;
  const segmentCount = segments?.length || 0;
  const canExport = Boolean(transcription) && !disabled;
  const canSave = Boolean(transcription) && !disabled && !isSaving && isTranscriptSavePending(saveState);
  const matchCount = useMemo(() => countMatches(transcription, searchTerm), [searchTerm, transcription]);
  const visibleSegments = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const resultSegments = segments?.filter((segment) => segment.text.trim()) || [];
    if (!normalizedSearchTerm) {
      return resultSegments;
    }

    return resultSegments.filter((segment) => segment.text.toLowerCase().includes(normalizedSearchTerm));
  }, [searchTerm, segments]);

  const handleExport = () => {
    if (!canExport) {
      return;
    }

    downloadTranscriptExport(exportFormat, {
      transcription,
      detectedLanguage,
      segments,
      fileName: sourceFileName,
      provider,
    });
  };

  const handleSave = async () => {
    if (!canSave || isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await onSaveTranscription();
    } finally {
      isSavingRef.current = false;
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleTranscriptionTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!disabled) {
      onTranscriptionChange(event.target.value);
    }
  };

  return (
    <div className="surface-panel flex w-full min-w-0 max-w-full flex-grow flex-col overflow-hidden md:min-h-0">
      <ResultDisplayHeader
        isLoading={isLoading}
        hasResult={hasResult}
        detectedLanguage={detectedLanguage}
        elapsedTime={elapsedTime}
        characterCount={characterCount}
        lineCount={lineCount}
        segmentCount={segmentCount}
        saveState={saveState}
      />
      <div className="custom-scrollbar relative min-h-[300px] flex-grow overflow-y-auto bg-base-100 p-4 sm:min-h-[420px] sm:p-5 xl:min-h-0">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex h-full flex-col items-center justify-center bg-base-100/85 px-6 text-center backdrop-blur-sm">
            <LoaderIcon color="var(--color-brand-primary)" className="h-10" />
            <p className="mt-4 text-sm font-semibold text-content-100">{loadingStatus || loadingMessage}</p>
            {elapsedTime != null && (
              <p className="mt-1 font-mono text-xs text-content-200">{elapsedTime.toFixed(1)}s</p>
            )}
          </div>
        )}

        {!isLoading &&
          (hasResult ? (
            <div className="mx-auto max-w-4xl">
              <ResultToolbar
                viewMode={viewMode}
                segmentCount={segmentCount}
                searchTerm={searchTerm}
                matchCount={matchCount}
                exportFormat={exportFormat}
                canExport={canExport}
                canSave={canSave}
                isSaving={isSaving}
                saveState={saveState}
                onViewModeChange={setViewMode}
                onSearchTermChange={setSearchTerm}
                onExportFormatChange={setExportFormat}
                onExport={handleExport}
                onSave={handleSave}
              />
              {viewMode === 'segments' && segmentCount > 0 ? (
                <ResultSegmentsView segments={visibleSegments} searchTerm={searchTerm} />
              ) : (
                <textarea
                  value={transcription}
                  onChange={handleTranscriptionTextChange}
                  readOnly={disabled}
                  aria-readonly={disabled}
                  className="custom-scrollbar min-h-[260px] w-full resize-y rounded-md border border-base-300 bg-base-200/60 p-4 text-[15px] leading-7 text-content-100 outline-none transition-colors placeholder:text-content-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 read-only:cursor-not-allowed read-only:bg-base-200/80 sm:min-h-[360px] sm:p-5 sm:text-base sm:leading-8"
                  placeholder="（无识别文本）"
                  spellCheck={false}
                />
              )}
            </div>
          ) : (
            <EmptyState
              icon={<DocumentTextIcon className="h-5 w-5" />}
              title="等待识别结果"
              className="min-h-[240px] sm:min-h-[320px]"
            />
          ))}
      </div>
    </div>
  );
};
