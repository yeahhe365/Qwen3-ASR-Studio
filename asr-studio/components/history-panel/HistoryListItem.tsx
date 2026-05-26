import React from 'react';
import type { HistoryItem } from '../../types';
import { getAsrProviderLabel } from '../../services/providerRegistry';
import { CheckIcon } from '../icons/CheckIcon';
import { CopyIcon } from '../icons/CopyIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { LanguageIcon } from '../icons/LanguageIcon';
import { LoaderIcon } from '../icons/LoaderIcon';
import { RestoreIcon } from '../icons/RestoreIcon';
import { formatHistoryTimestamp, getHistoryPreviewText } from './historyPanelUtils';

interface HistoryListItemProps {
  item: HistoryItem;
  isActionDisabled: boolean;
  isCopied: boolean;
  isDeleting: boolean;
  isSelectionDisabled: boolean;
  isSelected: boolean;
  onCopy: (item: HistoryItem) => void;
  onDelete: (id: number) => void;
  onRestore: (item: HistoryItem) => void;
  onToggle: (id: number) => void;
}

export const HistoryListItem: React.FC<HistoryListItemProps> = ({
  item,
  isActionDisabled,
  isCopied,
  isDeleting,
  isSelectionDisabled,
  isSelected,
  onCopy,
  onDelete,
  onRestore,
  onToggle,
}) => (
  <div className="grid min-w-0 gap-3 rounded-md border border-transparent px-2 py-3 transition-colors hover:border-base-300 hover:bg-base-100 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => onToggle(item.id)}
      disabled={isSelectionDisabled || isDeleting}
      className="mt-1 h-4 w-4 rounded border-base-300 text-brand-primary focus:ring-brand-primary sm:mt-0"
      aria-label={`选择 ${item.fileName}`}
    />
    <div className="min-w-0">
      <p className="max-h-12 overflow-hidden break-words text-sm leading-6 text-content-100">
        {getHistoryPreviewText(item.transcription)}
      </p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-200">
        <span className="min-w-0 max-w-full truncate" title={item.fileName}>
          {item.fileName}
        </span>
        {item.detectedLanguage && (
          <span className="flex items-center gap-1">
            <LanguageIcon className="h-3 w-3" /> {item.detectedLanguage}
          </span>
        )}
        {item.provider && <span>{getAsrProviderLabel(item.provider)}</span>}
        {item.segments?.length ? <span>{item.segments.length} 段</span> : null}
        <span>{formatHistoryTimestamp(item.timestamp)}</span>
      </div>
    </div>
    <div className="flex items-center gap-1 sm:justify-end">
      <button
        type="button"
        onClick={() => onRestore(item)}
        disabled={isActionDisabled || isDeleting}
        title="恢复"
        aria-label="恢复此条历史记录"
        className="icon-button h-8 w-8 disabled:opacity-50"
      >
        <RestoreIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onCopy(item)}
        disabled={isActionDisabled || isDeleting || !item.transcription}
        title={isCopied ? '已复制' : '复制'}
        aria-label="复制识别结果"
        className={`icon-button h-8 w-8 transition-colors duration-200 disabled:opacity-50 ${
          isCopied ? 'text-brand-primary' : ''
        }`}
      >
        {isCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        disabled={isActionDisabled || isDeleting}
        title="删除"
        aria-label="删除此条历史记录"
        className="icon-button h-8 w-8 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
      >
        {isDeleting ? <LoaderIcon className="h-4 w-4" /> : <DeleteIcon className="h-4 w-4" />}
      </button>
    </div>
  </div>
);
