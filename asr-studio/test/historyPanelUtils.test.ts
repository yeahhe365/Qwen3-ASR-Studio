import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getHistoryLanguageFilters,
  getHistoryPreviewText,
  getHistoryProviderFilters,
  getVisibleHistoryItems,
  HISTORY_FILTER_ALL,
} from '../components/history-panel/historyPanelUtils.ts';
import { AsrProvider, Language, type HistoryItem } from '../types.ts';

const createHistoryItem = (patch: Partial<HistoryItem>): HistoryItem => ({
  id: patch.id ?? 1,
  fileName: patch.fileName ?? 'meeting.wav',
  transcription: patch.transcription ?? 'hello world',
  detectedLanguage: patch.detectedLanguage ?? '英语',
  context: patch.context ?? '',
  timestamp: patch.timestamp ?? 1_700_000_000_000,
  ...patch,
});

describe('history panel utilities', () => {
  test('creates compact transcription previews', () => {
    assert.equal(getHistoryPreviewText(''), '（无识别结果）');
    assert.equal(getHistoryPreviewText('short text'), 'short text');
    assert.equal(getHistoryPreviewText('a'.repeat(111)), `${'a'.repeat(110)}...`);
  });

  test('derives provider and language filters from history items', () => {
    const items = [
      createHistoryItem({ provider: AsrProvider.QWEN, detectedLanguage: '中文' }),
      createHistoryItem({ id: 2, provider: AsrProvider.QWEN, detectedLanguage: '中文' }),
      createHistoryItem({ id: 3, provider: AsrProvider.GEMINI, detectedLanguage: '', language: Language.ENGLISH }),
    ];

    assert.deepEqual(getHistoryProviderFilters(items), [AsrProvider.QWEN, AsrProvider.GEMINI]);
    assert.deepEqual(getHistoryLanguageFilters(items), ['中文', Language.ENGLISH]);
  });

  test('filters history items by query, provider and language', () => {
    const items = [
      createHistoryItem({
        id: 1,
        fileName: 'meeting.wav',
        transcription: 'product roadmap',
        provider: AsrProvider.QWEN,
        detectedLanguage: '英语',
      }),
      createHistoryItem({
        id: 2,
        fileName: 'call.wav',
        transcription: '预算讨论',
        provider: AsrProvider.DOUBAO,
        detectedLanguage: '中文',
      }),
    ];

    assert.deepEqual(
      getVisibleHistoryItems(items, {
        query: 'roadmap',
        providerFilter: HISTORY_FILTER_ALL,
        languageFilter: HISTORY_FILTER_ALL,
      }).map((item) => item.id),
      [1],
    );
    assert.deepEqual(
      getVisibleHistoryItems(items, {
        query: '',
        providerFilter: AsrProvider.DOUBAO,
        languageFilter: '中文',
      }).map((item) => item.id),
      [2],
    );
  });
});
