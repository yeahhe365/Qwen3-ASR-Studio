import { useCallback, useEffect, useState } from 'react';
import { addNoteItem, deleteNoteItem, getNotes } from '../services/cacheService';
import type { NoteItem, Notification } from '../types';

type Notify = (message: string, type: Notification['type']) => void;

export function useNotes(notify: Notify) {
  const [notes, setNotes] = useState<NoteItem[]>([]);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const noteItems = await getNotes();
        setNotes(noteItems);
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };

    loadNotes();
  }, []);

  const saveNote = useCallback(async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      notify('笔记内容不能为空', 'error');
      return false;
    }

    const newNote: NoteItem = {
      id: Date.now(),
      content: trimmedContent,
      timestamp: Date.now(),
    };

    try {
      await addNoteItem(newNote);
      setNotes(prev => [newNote, ...prev]);
      notify('笔记已保存', 'success');
      return true;
    } catch (error) {
      console.error('Failed to save note:', error);
      notify('保存笔记失败。', 'error');
      return false;
    }
  }, [notify]);

  const removeNote = useCallback(async (id: number) => {
    try {
      await deleteNoteItem(id);
      setNotes(prev => prev.filter(item => item.id !== id));
      notify('已删除笔记', 'success');
    } catch (error) {
      console.error('Failed to delete note:', error);
      notify('删除笔记失败。', 'error');
    }
  }, [notify]);

  return {
    notes,
    saveNote,
    removeNote,
  };
}
