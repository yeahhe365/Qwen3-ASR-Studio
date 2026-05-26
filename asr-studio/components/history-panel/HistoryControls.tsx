import React from 'react';
import type { HistoryItem } from '../../types';
import { getAsrProviderLabel } from '../../services/providerRegistry';
import type { HistoryExportFormat } from '../../services/historyExport';
import { CloseIcon } from '../icons/CloseIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { LoaderIcon } from '../icons/LoaderIcon';
import { getHistoryLanguageLabel, HISTORY_FILTER_ALL, type HistoryFilterValue } from './historyPanelUtils';

interface HistoryControlsProps {
  query: string;
  providerFilter: HistoryFilterValue;
  languageFilter: HistoryFilterValue;
  providers: NonNullable<HistoryItem['provider']>[];
  languages: string[];
  exportFormat: HistoryExportFormat;
  hasActiveFilters: boolean;
  hasSelection: boolean;
  isAllVisibleSelected: boolean;
  isClearSelectionDisabled: boolean;
  isDeleteSelectedDisabled: boolean;
  isDeletingSelected: boolean;
  isExportDisabled: boolean;
  isSelectAllDisabled: boolean;
  onClearFilters: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExport: () => void;
  onExportFormatChange: (format: HistoryExportFormat) => void;
  onLanguageFilterChange: (filter: HistoryFilterValue) => void;
  onProviderFilterChange: (filter: HistoryFilterValue) => void;
  onQueryChange: (query: string) => void;
  onToggleAllVisible: () => void;
}

export const HistoryControls: React.FC<HistoryControlsProps> = ({
  query,
  providerFilter,
  languageFilter,
  providers,
  languages,
  exportFormat,
  hasActiveFilters,
  hasSelection,
  isAllVisibleSelected,
  isClearSelectionDisabled,
  isDeleteSelectedDisabled,
  isDeletingSelected,
  isExportDisabled,
  isSelectAllDisabled,
  onClearFilters,
  onClearSelection,
  onDeleteSelected,
  onExport,
  onExportFormatChange,
  onLanguageFilterChange,
  onProviderFilterChange,
  onQueryChange,
  onToggleAllVisible,
}) => (
  <div className="space-y-2 px-3 pb-3">
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="搜索文件、转写、上下文"
        className="field-control min-w-0"
        aria-label="搜索历史记录"
      />
      <select
        value={providerFilter}
        onChange={(event) => onProviderFilterChange(event.target.value)}
        className="field-control"
        aria-label="按 Provider 筛选历史记录"
      >
        <option value={HISTORY_FILTER_ALL}>全部 Provider</option>
        {providers.map((provider) => (
          <option key={provider} value={provider}>
            {getAsrProviderLabel(provider)}
          </option>
        ))}
      </select>
      <select
        value={languageFilter}
        onChange={(event) => onLanguageFilterChange(event.target.value)}
        className="field-control"
        aria-label="按语言筛选历史记录"
      >
        <option value={HISTORY_FILTER_ALL}>全部语言</option>
        {languages.map((language) => (
          <option key={language} value={language}>
            {getHistoryLanguageLabel(language)}
          </option>
        ))}
      </select>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-medium text-content-200">
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={onToggleAllVisible}
          disabled={isSelectAllDisabled}
          className="h-4 w-4 rounded border-base-300 text-brand-primary focus:ring-brand-primary"
        />
        选择当前结果
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="secondary-action h-9 px-3"
            title="清除历史筛选"
            aria-label="清除历史筛选"
          >
            <CloseIcon className="h-4 w-4" />
            <span>清除筛选</span>
          </button>
        )}
        {hasSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isClearSelectionDisabled}
            className="secondary-action h-9 px-3"
            title="清除历史选择"
            aria-label="清除历史选择"
          >
            <CloseIcon className="h-4 w-4" />
            <span>清除选择</span>
          </button>
        )}
        <select
          value={exportFormat}
          onChange={(event) => onExportFormatChange(event.target.value as HistoryExportFormat)}
          className="field-control h-9 text-xs"
          aria-label="历史导出格式"
        >
          <option value="json">JSON</option>
          <option value="md">Markdown</option>
        </select>
        <button
          type="button"
          onClick={onExport}
          disabled={isExportDisabled}
          className="secondary-action h-9 px-3"
          title="导出历史记录"
          aria-label="导出历史记录"
        >
          <DownloadIcon className="h-4 w-4" />
          <span>导出</span>
        </button>
        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={isDeleteSelectedDisabled}
          className="secondary-action h-9 px-3 text-red-500 hover:bg-red-500/10"
          title="删除已选历史记录"
          aria-label="删除已选历史记录"
        >
          {isDeletingSelected ? <LoaderIcon className="h-4 w-4" /> : <DeleteIcon className="h-4 w-4" />}
          <span>{isDeletingSelected ? '删除中' : '删除已选'}</span>
        </button>
      </div>
    </div>
  </div>
);
