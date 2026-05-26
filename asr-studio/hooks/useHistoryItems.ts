import { useCallback, useEffect, useState } from 'react';
import { addHistoryItem, clearHistory, deleteHistoryItem, getHistory } from '../services/cacheService';
import { parseHistoryImportJson } from '../services/historyImport';
import type { HistoryItem, Notification } from '../types';

type Notify = (message: string, type: Notification['type']) => void;
type HistoryItemPatch = Partial<
  Pick<
    HistoryItem,
    | 'transcription'
    | 'detectedLanguage'
    | 'context'
    | 'segments'
    | 'provider'
    | 'language'
    | 'enableItn'
    | 'compressionLevel'
    | 'trimSilence'
    | 'enableLongAudioChunking'
  >
>;

export function useHistoryItems(notify: Notify) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const historyItems = await getHistory();
        if (isMounted) {
          setHistory(historyItems);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  const prependHistoryItem = useCallback(
    async (item: HistoryItem) => {
      try {
        await addHistoryItem(item);
        setHistory((prevHistory) => [item, ...prevHistory]);
        return true;
      } catch (error) {
        console.error('Failed to save history item:', error);
        notify('识别完成，但保存历史记录失败。', 'error');
        return false;
      }
    },
    [notify],
  );

  const removeHistoryItem = useCallback(
    async (id: number) => {
      try {
        await deleteHistoryItem(id);
        setHistory((prev) => prev.filter((item) => item.id !== id));
        notify('已删除历史记录', 'success');
        return true;
      } catch (error) {
        console.error('Failed to delete history item:', error);
        notify('删除历史记录失败。', 'error');
        return false;
      }
    },
    [notify],
  );

  const updateHistoryItem = useCallback(
    async (id: number, patch: HistoryItemPatch) => {
      const existingItem = history.find((item) => item.id === id);
      if (!existingItem) {
        notify('未找到要更新的历史记录。', 'error');
        return false;
      }

      try {
        const updatedItem: HistoryItem = {
          ...existingItem,
          ...patch,
        };
        await addHistoryItem(updatedItem);
        setHistory((prevHistory) => prevHistory.map((item) => (item.id === id ? updatedItem : item)));
        notify('已保存到历史记录', 'success');
        return true;
      } catch (error) {
        console.error('Failed to update history item:', error);
        notify('保存历史记录失败。', 'error');
        return false;
      }
    },
    [history, notify],
  );

  const removeHistoryItems = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) {
        return [];
      }

      const results = await Promise.allSettled(ids.map((id) => deleteHistoryItem(id)));
      const deletedIds = ids.filter((_, index) => results[index].status === 'fulfilled');
      const failedCount = ids.length - deletedIds.length;

      if (deletedIds.length > 0) {
        const deletedIdSet = new Set(deletedIds);
        setHistory((prev) => prev.filter((item) => !deletedIdSet.has(item.id)));
      }

      if (failedCount > 0) {
        console.error(
          'Failed to delete history items:',
          results.filter((result) => result.status === 'rejected'),
        );
        notify(
          deletedIds.length > 0
            ? `已删除 ${deletedIds.length} 条历史记录，${failedCount} 条删除失败。`
            : '批量删除历史记录失败。',
          'error',
        );
      } else {
        notify(`已删除 ${deletedIds.length} 条历史记录`, 'success');
      }

      return deletedIds;
    },
    [notify],
  );

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

  const importHistoryFile = useCallback(
    async (file: File) => {
      try {
        const importedItems = parseHistoryImportJson(await file.text(), {
          usedIds: new Set(history.map((item) => item.id)),
        });

        if (importedItems.length === 0) {
          notify('未找到可导入的历史记录。', 'error');
          return 0;
        }

        const results = await Promise.allSettled(importedItems.map((item) => addHistoryItem(item)));
        const savedItems = importedItems.filter((_, index) => results[index].status === 'fulfilled');
        const failedCount = importedItems.length - savedItems.length;

        if (savedItems.length > 0) {
          setHistory((prevHistory) => [...savedItems, ...prevHistory].sort((a, b) => b.timestamp - a.timestamp));
        }

        if (failedCount > 0) {
          notify(
            savedItems.length > 0
              ? `已导入 ${savedItems.length} 条历史记录，${failedCount} 条保存失败。`
              : '历史记录解析成功，但保存失败。',
            'error',
          );
        } else {
          notify(`已导入 ${savedItems.length} 条历史记录`, 'success');
        }

        return savedItems.length;
      } catch (error) {
        console.error('Failed to import history:', error);
        notify('导入历史记录失败，请确认 JSON 文件格式。', 'error');
        return 0;
      }
    },
    [history, notify],
  );

  return {
    history,
    prependHistoryItem,
    importHistoryFile,
    updateHistoryItem,
    removeHistoryItem,
    removeHistoryItems,
    removeAllHistory,
  };
}
