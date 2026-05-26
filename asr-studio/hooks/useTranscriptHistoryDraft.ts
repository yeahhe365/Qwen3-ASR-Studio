import { useCallback, useMemo, useRef, useState } from 'react';
import type { AsrProvider, CompressionLevel, HistoryItem, Language, Notification, TranscriptionResult } from '../types';
import {
  createRestoredTranscriptSaveSnapshot,
  createTranscriptSaveSnapshot,
  isTranscriptSaveSnapshotDirty,
} from '../services/transcriptSnapshot';
import { getAudioSourceUrl } from '../services/remoteAudioFile';
import { normalizeSegments } from '../services/transcriptionSegments';

type Notify = (message: string, type: Notification['type']) => void;
type PrependHistoryItem = (item: HistoryItem) => Promise<boolean>;
type UpdateHistoryItem = (
  id: number,
  patch: Partial<
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
  >,
) => Promise<boolean>;

type TranscriptHistorySettings = {
  context: string;
  provider: AsrProvider;
  language: Language;
  enableItn: boolean;
  compressionLevel: CompressionLevel;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
};

type UseTranscriptHistoryDraftOptions = TranscriptHistorySettings & {
  notify: Notify;
  prependHistoryItem: PrependHistoryItem;
  updateHistoryItem: UpdateHistoryItem;
};

type SaveCurrentTranscriptOptions = {
  audioFile: File | null;
  transcription: string;
  detectedLanguage: string;
  segments: TranscriptionResult['segments'];
  canUpdateActiveHistory?: boolean;
};

const MANUAL_TRANSCRIPT_FILE_NAME = 'manual-transcript';

const createHistoryPatch = (
  transcription: string,
  detectedLanguage: string,
  segments: TranscriptionResult['segments'],
  settings: TranscriptHistorySettings,
) => ({
  transcription,
  detectedLanguage,
  context: settings.context,
  segments,
  provider: settings.provider,
  language: settings.language,
  enableItn: settings.enableItn,
  compressionLevel: settings.compressionLevel,
  trimSilence: settings.trimSilence,
  enableLongAudioChunking: settings.enableLongAudioChunking,
});

export function useTranscriptHistoryDraft({
  context,
  provider,
  language,
  enableItn,
  compressionLevel,
  trimSilence,
  enableLongAudioChunking,
  notify,
  prependHistoryItem,
  updateHistoryItem,
}: UseTranscriptHistoryDraftOptions) {
  const [activeHistoryItemId, setActiveHistoryItemId] = useState<number | null>(null);
  const [savedTranscriptSnapshot, setSavedTranscriptSnapshot] = useState<string | null>(null);
  const historyIdRef = useRef(0);

  const settings = useMemo(
    () => ({
      context,
      provider,
      language,
      enableItn,
      compressionLevel,
      trimSilence,
      enableLongAudioChunking,
    }),
    [compressionLevel, context, enableItn, enableLongAudioChunking, language, provider, trimSilence],
  );

  const createHistoryId = useCallback(() => {
    historyIdRef.current = Math.max(Date.now(), historyIdRef.current + 1);
    return historyIdRef.current;
  }, []);

  const createHistoryItem = useCallback(
    (file: File, result: TranscriptionResult): HistoryItem => ({
      id: createHistoryId(),
      fileName: file.name,
      transcription: result.transcription,
      detectedLanguage: result.detectedLanguage,
      context,
      timestamp: Date.now(),
      audioFile: file,
      audioUrl: getAudioSourceUrl(file),
      segments: result.segments,
      provider,
      language,
      enableItn,
      compressionLevel,
      trimSilence,
      enableLongAudioChunking,
    }),
    [compressionLevel, context, createHistoryId, enableItn, enableLongAudioChunking, language, provider, trimSilence],
  );

  const createCurrentHistoryItem = useCallback(
    (
      audioFile: File | null,
      transcription: string,
      detectedLanguage: string,
      nextSegments: TranscriptionResult['segments'],
    ): HistoryItem => ({
      id: createHistoryId(),
      fileName: audioFile?.name || MANUAL_TRANSCRIPT_FILE_NAME,
      transcription,
      detectedLanguage,
      context,
      timestamp: Date.now(),
      audioFile: audioFile || undefined,
      audioUrl: audioFile ? getAudioSourceUrl(audioFile) : undefined,
      segments: nextSegments,
      provider,
      language,
      enableItn,
      compressionLevel,
      trimSilence,
      enableLongAudioChunking,
    }),
    [compressionLevel, context, createHistoryId, enableItn, enableLongAudioChunking, language, provider, trimSilence],
  );

  const resetHistoryDraft = useCallback(() => {
    setActiveHistoryItemId(null);
    setSavedTranscriptSnapshot(null);
  }, []);

  const markHistoryItemSaved = useCallback((historyItem: HistoryItem, saved: boolean) => {
    setActiveHistoryItemId(saved ? historyItem.id : null);
    setSavedTranscriptSnapshot(saved ? createTranscriptSaveSnapshot(historyItem) : null);
  }, []);

  const saveCurrentTranscript = useCallback(
    async ({
      audioFile,
      transcription,
      detectedLanguage,
      segments,
      canUpdateActiveHistory = true,
    }: SaveCurrentTranscriptOptions) => {
      if (!transcription) {
        return { saved: false, segments };
      }

      const nextSegments = normalizeSegments(transcription, segments);
      if (activeHistoryItemId && canUpdateActiveHistory) {
        const saved = await updateHistoryItem(
          activeHistoryItemId,
          createHistoryPatch(transcription, detectedLanguage, nextSegments, settings),
        );

        if (saved) {
          setSavedTranscriptSnapshot(
            createTranscriptSaveSnapshot(createHistoryPatch(transcription, detectedLanguage, nextSegments, settings)),
          );
        }

        return { saved, segments: nextSegments };
      }

      const historyItem = createCurrentHistoryItem(audioFile, transcription, detectedLanguage, nextSegments);
      const saved = await prependHistoryItem(historyItem);
      if (saved) {
        setActiveHistoryItemId(historyItem.id);
        setSavedTranscriptSnapshot(createTranscriptSaveSnapshot(historyItem));
        notify('已保存到历史记录', 'success');
      }

      return { saved, segments: nextSegments };
    },
    [activeHistoryItemId, createCurrentHistoryItem, notify, prependHistoryItem, settings, updateHistoryItem],
  );

  const restoreHistoryDraft = useCallback(
    (item: HistoryItem) => {
      const nextSegments = normalizeSegments(item.transcription, item.segments);
      setActiveHistoryItemId(item.id);
      setSavedTranscriptSnapshot(
        createRestoredTranscriptSaveSnapshot(item, {
          provider,
          language,
          enableItn,
          compressionLevel,
          trimSilence,
          enableLongAudioChunking,
        }),
      );
      return nextSegments;
    },
    [compressionLevel, enableItn, enableLongAudioChunking, language, provider, trimSilence],
  );

  const getIsTranscriptionDirty = useCallback(
    (transcription: string, detectedLanguage: string) =>
      isTranscriptSaveSnapshotDirty(
        {
          transcription,
          detectedLanguage,
          context,
          provider,
          language,
          enableItn,
          compressionLevel,
          trimSilence,
          enableLongAudioChunking,
        },
        savedTranscriptSnapshot,
      ),
    [
      compressionLevel,
      context,
      enableItn,
      enableLongAudioChunking,
      language,
      provider,
      savedTranscriptSnapshot,
      trimSilence,
    ],
  );

  return {
    activeHistoryItemId,
    createHistoryItem,
    markHistoryItemSaved,
    resetHistoryDraft,
    saveCurrentTranscript,
    restoreHistoryDraft,
    getIsTranscriptionDirty,
  };
}
