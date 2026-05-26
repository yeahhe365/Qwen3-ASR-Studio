import React from 'react';
import type { TranscriptExportFormat } from '../../services/transcriptionExport';
import {
  getTranscriptSaveButtonLabel,
  getTranscriptSaveButtonTitle,
  type TranscriptSaveState,
} from '../../services/transcriptSaveState';
import { CheckIcon } from '../icons/CheckIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { LoaderIcon } from '../icons/LoaderIcon';
import { SaveIcon } from '../icons/SaveIcon';
import type { ResultViewMode } from './resultDisplayUtils';

interface ResultToolbarProps {
  viewMode: ResultViewMode;
  segmentCount: number;
  searchTerm: string;
  matchCount: number;
  exportFormat: TranscriptExportFormat;
  canExport: boolean;
  canSave: boolean;
  isSaving: boolean;
  saveState?: TranscriptSaveState | null;
  onViewModeChange: (viewMode: ResultViewMode) => void;
  onSearchTermChange: (searchTerm: string) => void;
  onExportFormatChange: (format: TranscriptExportFormat) => void;
  onExport: () => void;
  onSave: () => void;
}

export const ResultToolbar: React.FC<ResultToolbarProps> = ({
  viewMode,
  segmentCount,
  searchTerm,
  matchCount,
  exportFormat,
  canExport,
  canSave,
  isSaving,
  saveState,
  onViewModeChange,
  onSearchTermChange,
  onExportFormatChange,
  onExport,
  onSave,
}) => {
  const saveButtonLabel = getTranscriptSaveButtonLabel(saveState);
  const saveButtonTitle = getTranscriptSaveButtonTitle(saveState);
  const SaveButtonIcon = saveState === 'saved' ? CheckIcon : SaveIcon;

  return (
    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="inline-grid grid-cols-2 gap-1 rounded-md bg-base-200 p-1 ring-1 ring-base-300">
          <button
            type="button"
            onClick={() => onViewModeChange('text')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === 'text'
                ? 'bg-content-100 text-base-200 shadow-sm'
                : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'
            }`}
          >
            文本
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('segments')}
            disabled={segmentCount === 0}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              viewMode === 'segments'
                ? 'bg-content-100 text-base-200 shadow-sm'
                : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'
            }`}
          >
            分段
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-px w-6 bg-base-300" />
          <span className="eyebrow">Result View</span>
          <span className="h-px w-6 bg-base-300" />
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="搜索转写文本"
          className="field-control h-9 min-w-0 text-xs sm:w-44"
          aria-label="搜索转写文本"
        />
        {searchTerm.trim() && <span className="status-pill font-mono">{matchCount} 匹配</span>}
        <select
          value={exportFormat}
          onChange={(event) => onExportFormatChange(event.target.value as TranscriptExportFormat)}
          className="field-control h-9 min-w-0 text-xs"
          aria-label="导出格式"
        >
          <option value="txt">TXT</option>
          <option value="md">Markdown</option>
          <option value="json">JSON</option>
          <option value="srt">SRT</option>
          <option value="vtt">VTT</option>
        </select>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className="secondary-action h-9 px-3"
          title="导出转写结果"
          aria-label="导出转写结果"
        >
          <DownloadIcon className="h-4 w-4" />
          <span className="hidden sm:inline">导出</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="secondary-action h-9 px-3"
          title={saveButtonTitle}
          aria-label={saveButtonTitle}
        >
          {isSaving ? <LoaderIcon className="h-4 w-4" /> : <SaveButtonIcon className="h-4 w-4" />}
          <span className="hidden sm:inline">{isSaving ? '保存中' : saveButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};
