import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { HistoryItem } from '../types';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { SearchIcon } from './icons/SearchIcon';
import { EmptyState } from './EmptyState';
import { downloadHistoryExport, type HistoryExportFormat } from '../services/historyExport';
import { HistoryControls } from './history-panel/HistoryControls';
import { HistoryListItem } from './history-panel/HistoryListItem';
import {
  getHistoryLanguageFilters,
  getHistoryProviderFilters,
  getVisibleHistoryItems,
  HISTORY_FILTER_ALL,
  type HistoryFilterValue,
} from './history-panel/historyPanelUtils';

interface HistoryPanelProps {
  items: HistoryItem[];
  onDelete: (id: number) => boolean | Promise<boolean>;
  onDeleteMany: (ids: number[]) => Promise<number[]>;
  onRestore: (item: HistoryItem) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  items,
  onDelete,
  onDeleteMany,
  onRestore,
  onError,
  disabled,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<HistoryFilterValue>(HISTORY_FILTER_ALL);
  const [languageFilter, setLanguageFilter] = useState<HistoryFilterValue>(HISTORY_FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<HistoryExportFormat>('json');
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [deletingItemIds, setDeletingItemIds] = useState<number[]>([]);
  const copyResetTimerRef = useRef<number | null>(null);
  const deletingItemIdsRef = useRef<Set<number>>(new Set());

  const providers = useMemo(() => getHistoryProviderFilters(items), [items]);
  const languages = useMemo(() => getHistoryLanguageFilters(items), [items]);

  const visibleItems = useMemo(() => {
    return getVisibleHistoryItems(items, { query, providerFilter, languageFilter });
  }, [items, languageFilter, providerFilter, query]);

  useEffect(() => {
    const itemIds = new Set(items.map((item) => item.id));
    setSelectedIds((currentIds) => currentIds.filter((id) => itemIds.has(id)));
  }, [items]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const visibleItemIds = useMemo(() => new Set(visibleItems.map((item) => item.id)), [visibleItems]);
  const selectedVisibleIds = selectedIds.filter((id) => visibleItemIds.has(id));
  const isAllVisibleSelected = visibleItems.length > 0 && selectedVisibleIds.length === visibleItems.length;
  const hasActiveFilters =
    Boolean(query.trim()) || providerFilter !== HISTORY_FILTER_ALL || languageFilter !== HISTORY_FILTER_ALL;
  const hasHiddenSelection = selectedIds.length > selectedVisibleIds.length;
  const selectedLabel = hasHiddenSelection
    ? `${selectedVisibleIds.length} 当前 / ${selectedIds.length} 已选`
    : `${selectedIds.length} 已选`;
  const exportDisabled = selectedIds.length > 0 ? selectedVisibleIds.length === 0 : visibleItems.length === 0;
  const deletingItemIdSet = useMemo(() => new Set(deletingItemIds), [deletingItemIds]);
  const isDeletingAnyItem = deletingItemIds.length > 0;
  const isSelectionDisabled = disabled || isDeletingSelected || isDeletingAnyItem;
  const isExportDisabled = disabled || isDeletingSelected || isDeletingAnyItem || exportDisabled;

  const handleCopy = async (item: HistoryItem) => {
    if (disabled || isDeletingSelected || deletingItemIdsRef.current.has(item.id) || !item.transcription) return;
    try {
      await navigator.clipboard.writeText(item.transcription);
      setCopiedId(item.id);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedId((currentId) => (currentId === item.id ? null : currentId));
        copyResetTimerRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy from history:', err);
      onError('复制失败，请检查浏览器权限。');
    }
  };

  const handleRestore = (item: HistoryItem) => {
    if (disabled || isDeletingSelected || deletingItemIdsRef.current.has(item.id)) {
      return;
    }

    onRestore(item);
  };

  const handleToggleItem = (id: number) => {
    if (disabled || isDeletingSelected || deletingItemIdsRef.current.size > 0) {
      return;
    }

    setSelectedIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id],
    );
  };

  const handleToggleAllVisible = () => {
    if (isSelectionDisabled || visibleItems.length === 0) {
      return;
    }

    const visibleIds = visibleItems.map((item) => item.id);
    if (isAllVisibleSelected) {
      setSelectedIds((currentIds) => currentIds.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((currentIds) => Array.from(new Set([...currentIds, ...visibleIds])));
    }
  };

  const handleClearSelection = () => {
    if (!isSelectionDisabled) {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (disabled || isDeletingSelected || selectedVisibleIds.length === 0 || deletingItemIdsRef.current.size > 0) {
      return;
    }

    setIsDeletingSelected(true);
    try {
      const deletedIds = await onDeleteMany(selectedVisibleIds);
      const deletedIdSet = new Set(deletedIds);
      setSelectedIds((currentIds) => currentIds.filter((id) => !deletedIdSet.has(id)));
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (disabled || deletingItemIdsRef.current.has(id) || isDeletingSelected) {
      return;
    }

    deletingItemIdsRef.current.add(id);
    setDeletingItemIds(Array.from(deletingItemIdsRef.current));
    try {
      const deleted = await onDelete(id);
      if (deleted) {
        setSelectedIds((currentIds) => currentIds.filter((currentId) => currentId !== id));
      }
    } finally {
      deletingItemIdsRef.current.delete(id);
      setDeletingItemIds(Array.from(deletingItemIdsRef.current));
    }
  };

  const handleExport = () => {
    if (isExportDisabled) {
      return;
    }

    const selectedItems =
      selectedIds.length > 0 ? visibleItems.filter((item) => selectedVisibleIds.includes(item.id)) : visibleItems;
    if (selectedItems.length === 0) {
      onError(selectedIds.length > 0 ? '当前筛选结果中没有已选历史记录。' : '没有可导出的历史记录。');
      return;
    }

    downloadHistoryExport(selectedItems, exportFormat);
  };

  const handleClearFilters = () => {
    setQuery('');
    setProviderFilter(HISTORY_FILTER_ALL);
    setLanguageFilter(HISTORY_FILTER_ALL);
  };

  return (
    <div className="surface-panel w-full min-w-0 max-w-full overflow-hidden">
      <div className="panel-header flex-col items-stretch sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="eyebrow">Archive</p>
          <h3 className="panel-title mt-1">历史记录</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-pill font-mono">
            {visibleItems.length} / {items.length}
          </span>
          {selectedIds.length > 0 && <span className="status-pill font-mono">{selectedLabel}</span>}
        </div>
      </div>
      <HistoryControls
        query={query}
        providerFilter={providerFilter}
        languageFilter={languageFilter}
        providers={providers}
        languages={languages}
        exportFormat={exportFormat}
        hasActiveFilters={hasActiveFilters}
        hasSelection={selectedIds.length > 0}
        isAllVisibleSelected={isAllVisibleSelected}
        isClearSelectionDisabled={Boolean(isSelectionDisabled)}
        isDeleteSelectedDisabled={Boolean(
          disabled || isDeletingSelected || isDeletingAnyItem || selectedVisibleIds.length === 0,
        )}
        isDeletingSelected={isDeletingSelected}
        isExportDisabled={Boolean(isExportDisabled)}
        isSelectAllDisabled={Boolean(isSelectionDisabled || visibleItems.length === 0)}
        onClearFilters={handleClearFilters}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
        onExport={handleExport}
        onExportFormatChange={setExportFormat}
        onLanguageFilterChange={setLanguageFilter}
        onProviderFilterChange={setProviderFilter}
        onQueryChange={setQuery}
        onToggleAllVisible={handleToggleAllVisible}
      />
      <div className="h-72 sm:h-80 lg:h-96">
        {items.length === 0 ? (
          <EmptyState icon={<DatabaseIcon className="h-5 w-5" />} title="暂无历史记录" />
        ) : visibleItems.length === 0 ? (
          <EmptyState icon={<SearchIcon className="h-5 w-5" />} title="没有匹配记录" />
        ) : (
          <div className="custom-scrollbar h-full space-y-1 overflow-y-auto px-2 pb-2">
            {visibleItems.map((item) => (
              <HistoryListItem
                key={item.id}
                item={item}
                isActionDisabled={Boolean(disabled || isDeletingSelected)}
                isCopied={copiedId === item.id}
                isDeleting={deletingItemIdSet.has(item.id)}
                isSelectionDisabled={Boolean(isSelectionDisabled)}
                isSelected={selectedIds.includes(item.id)}
                onCopy={handleCopy}
                onDelete={(id) => {
                  void handleDeleteItem(id);
                }}
                onRestore={handleRestore}
                onToggle={handleToggleItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
