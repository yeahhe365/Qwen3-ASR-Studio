import React from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { CopyIcon } from './icons/CopyIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { RetryIcon } from './icons/RetryIcon';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import { StopIcon } from './icons/StopIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import type { TranscriptionQueueItem, TranscriptionQueueStatus } from '../types';
import { getTranscriptionQueueStats } from '../services/transcriptionQueue';

interface TranscriptionActionsProps {
  audioFile: File | null;
  copied: boolean;
  isLoading: boolean;
  isRecording: boolean;
  isRecordingBusy?: boolean;
  queue: TranscriptionQueueItem[];
  isBatchProcessing: boolean;
  disabled?: boolean;
  realtimeElapsedTime: number;
  transcription: string;
  onCancel: () => void;
  onCopy: () => void;
  onStartBatch: () => void;
  onClearQueue: () => void;
  onRemoveQueueItem: (id: string) => void;
  onRetry: () => void;
  onTranscribe: () => void;
}

const queueStatusLabels: Record<TranscriptionQueueStatus, string> = {
  pending: '等待中',
  processing: '识别中',
  done: '已完成',
  error: '失败，可重试',
  cancelled: '已取消',
};

const queueStatusClasses: Record<TranscriptionQueueStatus, string> = {
  pending: 'text-content-200',
  processing: 'text-brand-primary',
  done: 'text-green-600 dark:text-green-400',
  error: 'text-red-500',
  cancelled: 'text-content-200',
};

export const TranscriptionActions: React.FC<TranscriptionActionsProps> = ({
  audioFile,
  copied,
  isLoading,
  isRecording,
  isRecordingBusy = false,
  queue,
  isBatchProcessing,
  disabled = false,
  realtimeElapsedTime,
  transcription,
  onCancel,
  onCopy,
  onStartBatch,
  onClearQueue,
  onRemoveQueueItem,
  onRetry,
  onTranscribe,
}) => {
  const { totalCount, doneCount, pendingCount } = getTranscriptionQueueStats(queue);
  const secondaryActionsDisabled = disabled || isRecording || isRecordingBusy;
  const canTranscribe =
    !disabled && !isRecordingBusy && Boolean(audioFile || isRecording) && !isLoading && !isBatchProcessing;
  const canRetry = !secondaryActionsDisabled && !isBatchProcessing;
  const canStartBatch = !secondaryActionsDisabled && !isBatchProcessing && pendingCount > 0;
  const canClearQueue = !secondaryActionsDisabled;

  const handleTranscribeClick = () => {
    if (canTranscribe) {
      onTranscribe();
    }
  };

  const handleRetryClick = () => {
    if (canRetry) {
      onRetry();
    }
  };

  const handleStartBatchClick = () => {
    if (canStartBatch) {
      onStartBatch();
    }
  };

  const handleClearQueueClick = () => {
    if (canClearQueue) {
      onClearQueue();
    }
  };

  return (
    <div className="surface-panel p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={handleTranscribeClick}
          disabled={!canTranscribe}
          className="primary-action flex-1"
        >
          {isLoading ? (
            <>
              <LoaderIcon className="mr-2 h-5 w-5" />
              <span className="truncate">正在识别</span>
              <span className="ml-2 w-[56px] flex-shrink-0 text-left font-mono tabular-nums">
                {realtimeElapsedTime.toFixed(1)}s
              </span>
            </>
          ) : isRecording ? (
            <>
              <StopIcon className="mr-2 h-5 w-5" />
              <span className="truncate">停止并识别</span>
            </>
          ) : isRecordingBusy ? (
            <>
              <LoaderIcon className="mr-2 h-5 w-5" />
              <span className="truncate">录音处理中</span>
            </>
          ) : (
            <>
              <SoundWaveIcon className="mr-2 h-5 w-5" />
              <span className="truncate">开始识别</span>
            </>
          )}
        </button>

        {isLoading ? (
          <button
            type="button"
            onClick={onCancel}
            title="取消"
            aria-label="取消识别"
            className="flex min-h-12 items-center justify-center rounded-md bg-red-600 px-4 text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2 focus:ring-offset-base-100 sm:flex-shrink-0 sm:px-3"
          >
            <StopIcon className="h-5 w-5" />
          </button>
        ) : (
          transcription && (
            <div className={`grid gap-3 sm:flex sm:flex-shrink-0 ${audioFile ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <button
                type="button"
                onClick={onCopy}
                title={copied ? '已复制!' : '复制'}
                aria-label="复制识别结果"
                className="secondary-action min-h-12 px-4"
              >
                {copied ? <CheckIcon className="h-5 w-5 text-brand-primary" /> : <CopyIcon className="h-5 w-5" />}
              </button>
              {audioFile && (
                <button
                  type="button"
                  onClick={handleRetryClick}
                  disabled={!canRetry}
                  title="重试"
                  aria-label="重试识别"
                  className="secondary-action min-h-12 px-4"
                >
                  <RetryIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )
        )}
      </div>

      {totalCount > 0 && (
        <div className="mt-3 rounded-md border border-base-300 bg-base-100 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-content-100">批处理队列</p>
              <p className="mt-1 text-xs text-content-200">
                {doneCount}/{totalCount} 已完成，{pendingCount} 待处理
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartBatchClick}
                disabled={!canStartBatch}
                className="secondary-action h-9 px-3"
              >
                {isBatchProcessing ? <LoaderIcon className="h-4 w-4" /> : <SoundWaveIcon className="h-4 w-4" />}
                <span>{isBatchProcessing ? '处理中' : '开始队列'}</span>
              </button>
              <button
                type="button"
                onClick={handleClearQueueClick}
                disabled={!canClearQueue}
                className="secondary-action h-9 px-3 text-red-500"
              >
                <DeleteIcon className="h-4 w-4" />
                <span>{isBatchProcessing ? '取消队列' : '清空'}</span>
              </button>
            </div>
          </div>
          <div className="custom-scrollbar mt-3 max-h-44 space-y-1 overflow-y-auto">
            {queue.map((item) => {
              const canRemoveItem = !secondaryActionsDisabled && !(isBatchProcessing && item.status === 'processing');

              return (
                <div
                  key={item.id}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-2 hover:bg-base-200"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-content-100" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className={`mt-0.5 text-xs font-medium ${queueStatusClasses[item.status]}`}>
                      {item.message || queueStatusLabels[item.status]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (canRemoveItem) {
                        onRemoveQueueItem(item.id);
                      }
                    }}
                    disabled={!canRemoveItem}
                    className="icon-button h-8 w-8 text-content-200 disabled:opacity-40"
                    aria-label="移除此队列项"
                    title="移除"
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
