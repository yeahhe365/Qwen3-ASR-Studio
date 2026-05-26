import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getTranscriptSaveButtonLabel,
  getTranscriptSaveButtonTitle,
  getTranscriptSaveState,
  getTranscriptSaveStatusLabel,
  isTranscriptSavePending,
} from '../services/transcriptSaveState.ts';

describe('transcript save state', () => {
  test('has no save state without transcription text', () => {
    assert.equal(
      getTranscriptSaveState({
        hasTranscription: false,
        hasActiveHistoryItem: false,
        isDirty: false,
      }),
      null,
    );
  });

  test('marks current results without history as detached', () => {
    const state = getTranscriptSaveState({
      hasTranscription: true,
      hasActiveHistoryItem: false,
      isDirty: false,
    });

    assert.equal(state, 'detached');
    assert.equal(isTranscriptSavePending(state), true);
  });

  test('distinguishes saved and dirty history-backed results', () => {
    assert.equal(
      getTranscriptSaveState({
        hasTranscription: true,
        hasActiveHistoryItem: true,
        isDirty: false,
      }),
      'saved',
    );
    assert.equal(
      getTranscriptSaveState({
        hasTranscription: true,
        hasActiveHistoryItem: true,
        isDirty: true,
      }),
      'dirty',
    );
  });

  test('provides save labels from the same state source', () => {
    assert.equal(getTranscriptSaveStatusLabel('dirty'), '有未保存修改');
    assert.equal(getTranscriptSaveStatusLabel('detached'), '尚未保存到历史');
    assert.equal(getTranscriptSaveStatusLabel('saved'), '已保存');
    assert.equal(getTranscriptSaveStatusLabel(null), '');

    assert.equal(getTranscriptSaveButtonLabel('saved'), '已保存');
    assert.equal(getTranscriptSaveButtonLabel('detached'), '另存');
    assert.equal(getTranscriptSaveButtonLabel('dirty'), '保存');

    assert.equal(getTranscriptSaveButtonTitle('saved'), '已保存到历史记录');
    assert.equal(getTranscriptSaveButtonTitle('detached'), '另存为新的历史记录');
    assert.equal(getTranscriptSaveButtonTitle(null), '保存到历史记录');
  });
});
