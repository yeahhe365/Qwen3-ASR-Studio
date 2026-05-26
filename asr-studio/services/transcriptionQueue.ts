import type { TranscriptionQueueItem } from '../types';

let queueItemSequence = 0;

export const createTranscriptionQueueItems = (files: File[], timestamp = Date.now()): TranscriptionQueueItem[] => {
  return files.map((file, index) => {
    queueItemSequence += 1;

    return {
      id: `${timestamp}-${queueItemSequence}-${index}-${file.name}`,
      file,
      fileName: file.name,
      status: 'pending',
    };
  });
};

export const getTranscriptionQueueStats = (queue: TranscriptionQueueItem[]) => {
  return {
    totalCount: queue.length,
    doneCount: queue.filter((item) => item.status === 'done').length,
    pendingCount: queue.filter((item) => item.status === 'pending' || item.status === 'error').length,
    processingCount: queue.filter((item) => item.status === 'processing').length,
    errorCount: queue.filter((item) => item.status === 'error').length,
    cancelledCount: queue.filter((item) => item.status === 'cancelled').length,
  };
};

export const cancelQueuedTranscriptionItems = (queue: TranscriptionQueueItem[]) => {
  return queue.map((item) => {
    if (item.status === 'done' || item.status === 'cancelled') {
      return item;
    }

    return {
      ...item,
      status: 'cancelled' as const,
      message: '已取消',
    };
  });
};
