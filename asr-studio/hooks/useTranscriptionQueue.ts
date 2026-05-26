import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelQueuedTranscriptionItems, createTranscriptionQueueItems } from '../services/transcriptionQueue';
import type { TranscriptionQueueItem } from '../types';

type UseTranscriptionQueueOptions = {
  abortCurrentRequest: () => void;
};

export function useTranscriptionQueue({ abortCurrentRequest }: UseTranscriptionQueueOptions) {
  const [queue, setQueue] = useState<TranscriptionQueueItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const isBatchProcessingRef = useRef(false);
  const shouldStopBatchRef = useRef(false);
  const queueRef = useRef<TranscriptionQueueItem[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const setQueueState = useCallback((nextQueue: TranscriptionQueueItem[]) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
  }, []);

  const updateQueueState = useCallback(
    (updater: (currentQueue: TranscriptionQueueItem[]) => TranscriptionQueueItem[]) => {
      const nextQueue = updater(queueRef.current);
      queueRef.current = nextQueue;
      setQueue(nextQueue);
      return nextQueue;
    },
    [],
  );

  const setBatchProcessingState = useCallback((nextIsBatchProcessing: boolean) => {
    isBatchProcessingRef.current = nextIsBatchProcessing;
    setIsBatchProcessing(nextIsBatchProcessing);
  }, []);

  const createQueue = useCallback(
    (files: File[]) => {
      setQueueState(createTranscriptionQueueItems(files));
    },
    [setQueueState],
  );

  const removeQueueItem = useCallback(
    (id: string) => {
      updateQueueState((currentQueue) =>
        currentQueue.filter((item) => !(item.id === id && item.status !== 'processing')),
      );
    },
    [updateQueueState],
  );

  const updateQueueItem = useCallback(
    (id: string, patch: Partial<TranscriptionQueueItem>) => {
      updateQueueState((currentQueue) =>
        currentQueue.map((queueItem) => (queueItem.id === id ? { ...queueItem, ...patch } : queueItem)),
      );
    },
    [updateQueueState],
  );

  const clearQueue = useCallback(() => {
    if (isBatchProcessingRef.current) {
      shouldStopBatchRef.current = true;
      abortCurrentRequest();
      updateQueueState(cancelQueuedTranscriptionItems);
      return;
    }

    setQueueState([]);
  }, [abortCurrentRequest, setQueueState, updateQueueState]);

  const getQueuedTranscriptionItems = useCallback(() => {
    return queueRef.current.filter((item) => item.status === 'pending' || item.status === 'error');
  }, []);

  const getCurrentQueueItem = useCallback((id: string) => {
    return queueRef.current.find((queueItem) => queueItem.id === id);
  }, []);

  const getQueueSnapshot = useCallback(() => {
    return queueRef.current;
  }, []);

  const requestBatchStop = useCallback(() => {
    shouldStopBatchRef.current = true;
  }, []);

  const resetBatchStop = useCallback(() => {
    shouldStopBatchRef.current = false;
  }, []);

  const isBatchStopRequested = useCallback(() => {
    return shouldStopBatchRef.current;
  }, []);

  return {
    queue,
    isBatchProcessing,
    isBatchProcessingRef,
    shouldStopBatchRef,
    setQueueState,
    createQueue,
    updateQueueState,
    setBatchProcessingState,
    removeQueueItem,
    updateQueueItem,
    clearQueue,
    getQueuedTranscriptionItems,
    getCurrentQueueItem,
    getQueueSnapshot,
    requestBatchStop,
    resetBatchStop,
    isBatchStopRequested,
  };
}
