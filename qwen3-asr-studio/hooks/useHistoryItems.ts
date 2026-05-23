import { useCallback, useEffect, useState } from 'react';
import { addHistoryItem, clearHistory, deleteHistoryItem, getHistory } from '../services/cacheService';
import type { HistoryItem, Notification } from '../types';

type Notify = (message: string, type: Notification['type']) => void;

export function useHistoryItems(notify: Notify) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyItems = await getHistory();
        setHistory(historyItems);
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };

    loadHistory();
  }, []);

  const prependHistoryItem = useCallback(async (item: HistoryItem) => {
    try {
      await addHistoryItem(item);
      setHistory(prevHistory => [item, ...prevHistory]);
    } catch (error) {
      console.error('Failed to save history item:', error);
    }
  }, []);

  const removeHistoryItem = useCallback(async (id: number) => {
    try {
      await deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      notify('已删除历史记录', 'success');
    } catch (error) {
      console.error('Failed to delete history item:', error);
      notify('删除历史记录失败。', 'error');
    }
  }, [notify]);

  const removeAllHistory = useCallback(async () => {
    try {
      await clearHistory();
      setHistory([]);
      notify('所有历史记录已清除', 'success');
      return true;
    } catch (error) {
      console.error('Failed to clear history:', error);
      notify('清除历史记录失败。', 'error');
      return false;
    }
  }, [notify]);

  return {
    history,
    prependHistoryItem,
    removeHistoryItem,
    removeAllHistory,
  };
}
