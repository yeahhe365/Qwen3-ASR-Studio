import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createRestoredTranscriptSaveSnapshot,
  createTranscriptSaveSnapshot,
  isTranscriptSaveSnapshotDirty,
} from '../services/transcriptSnapshot.ts';
import { AsrProvider, CompressionLevel, Language, type HistoryItem } from '../types.ts';

const baseSnapshotInput = {
  transcription: 'hello world',
  detectedLanguage: 'en',
  context: 'names: Jones',
  provider: AsrProvider.QWEN,
  language: Language.ENGLISH,
  enableItn: true,
  compressionLevel: CompressionLevel.MEDIUM,
  trimSilence: true,
  enableLongAudioChunking: true,
};

describe('transcript save snapshots', () => {
  test('creates stable snapshots for saved transcript state', () => {
    assert.equal(createTranscriptSaveSnapshot(baseSnapshotInput), createTranscriptSaveSnapshot(baseSnapshotInput));
  });

  test('treats metadata changes as dirty even when text is unchanged', () => {
    const savedSnapshot = createTranscriptSaveSnapshot(baseSnapshotInput);

    assert.equal(isTranscriptSaveSnapshotDirty(baseSnapshotInput, savedSnapshot), false);
    assert.equal(
      isTranscriptSaveSnapshotDirty(
        {
          ...baseSnapshotInput,
          context: 'names: Jones, Lee',
        },
        savedSnapshot,
      ),
      true,
    );
    assert.equal(
      isTranscriptSaveSnapshotDirty(
        {
          ...baseSnapshotInput,
          provider: AsrProvider.GEMINI,
        },
        savedSnapshot,
      ),
      true,
    );
  });

  test('does not show dirty state for empty transcripts', () => {
    assert.equal(
      isTranscriptSaveSnapshotDirty(
        {
          ...baseSnapshotInput,
          transcription: '',
          context: 'changed',
        },
        createTranscriptSaveSnapshot(baseSnapshotInput),
      ),
      false,
    );
  });

  test('normalizes legacy history metadata when creating restore snapshots', () => {
    const legacyHistoryItem: HistoryItem = {
      id: 1,
      fileName: 'legacy.wav',
      transcription: baseSnapshotInput.transcription,
      detectedLanguage: baseSnapshotInput.detectedLanguage,
      context: baseSnapshotInput.context,
      timestamp: 1000,
      provider: 'legacy-provider' as AsrProvider,
      language: 'legacy-language' as Language,
      compressionLevel: 'legacy-compression' as CompressionLevel,
      enableItn: baseSnapshotInput.enableItn,
      trimSilence: baseSnapshotInput.trimSilence,
      enableLongAudioChunking: baseSnapshotInput.enableLongAudioChunking,
    };

    const restoredSnapshot = createRestoredTranscriptSaveSnapshot(legacyHistoryItem, {
      provider: baseSnapshotInput.provider,
      language: baseSnapshotInput.language,
      enableItn: baseSnapshotInput.enableItn,
      compressionLevel: baseSnapshotInput.compressionLevel,
      trimSilence: baseSnapshotInput.trimSilence,
      enableLongAudioChunking: baseSnapshotInput.enableLongAudioChunking,
    });

    assert.equal(isTranscriptSaveSnapshotDirty(baseSnapshotInput, restoredSnapshot), false);
  });
});
