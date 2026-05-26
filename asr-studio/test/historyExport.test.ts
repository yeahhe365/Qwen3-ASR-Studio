import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createHistoryExport,
  createSerializableHistoryItems,
  getHistoryExportMimeType,
} from '../services/historyExport.ts';
import { parseHistoryImportJson } from '../services/historyImport.ts';
import { AsrProvider, CompressionLevel, Language, type HistoryItem } from '../types.ts';

const createHistoryItem = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  id: 101,
  fileName: 'meeting.wav',
  transcription: '第一段\n第二段',
  detectedLanguage: 'zh',
  context: '项目名 Codex Studio，人名 Jones',
  timestamp: Date.UTC(2026, 4, 25, 8, 30, 0),
  provider: AsrProvider.QWEN,
  language: Language.CHINESE,
  enableItn: true,
  compressionLevel: CompressionLevel.MEDIUM,
  trimSilence: true,
  enableLongAudioChunking: true,
  audioUrl: 'https://example.com/audio/meeting.wav',
  segments: [
    { id: 'a', text: '第一段', startTime: 0, endTime: 1.2 },
    { id: 'b', text: '第二段', startTime: 1.2, endTime: 2.4 },
  ],
  ...overrides,
});

describe('historyExport', () => {
  test('creates import-compatible JSON with history metadata', () => {
    const json = createHistoryExport([createHistoryItem()], 'json');
    const exportedItems = JSON.parse(json);
    const importedItems = parseHistoryImportJson(json, { now: 2000 });

    assert.equal(Array.isArray(exportedItems), true);
    assert.equal(exportedItems[0].provider, AsrProvider.QWEN);
    assert.equal(exportedItems[0].language, Language.CHINESE);
    assert.equal(exportedItems[0].audioUrl, 'https://example.com/audio/meeting.wav');
    assert.equal(exportedItems[0].segments.length, 2);
    assert.equal(importedItems.length, 1);
    assert.equal(importedItems[0].provider, AsrProvider.QWEN);
    assert.equal(importedItems[0].language, Language.CHINESE);
    assert.equal(importedItems[0].audioUrl, 'https://example.com/audio/meeting.wav');
    assert.deepEqual(
      importedItems[0].segments?.map((segment) => segment.text),
      ['第一段', '第二段'],
    );
  });

  test('creates Markdown with context, processing flags, segments and audio URL', () => {
    const markdown = createHistoryExport([createHistoryItem()], 'md');

    assert.match(markdown, /## meeting\.wav/);
    assert.match(markdown, /- Provider：Qwen/);
    assert.match(markdown, /- 识别语言：中文/);
    assert.match(markdown, /- 目标语言：中文/);
    assert.match(markdown, /- ITN：开启/);
    assert.match(markdown, /- 压缩：中等/);
    assert.match(markdown, /- 静音裁剪：开启/);
    assert.match(markdown, /- 长音频切片：开启/);
    assert.match(markdown, /- 分段：2 段/);
    assert.match(markdown, /- 音频 URL：https:\/\/example\.com\/audio\/meeting\.wav/);
    assert.match(markdown, /### 上下文\n\n项目名 Codex Studio，人名 Jones/);
    assert.match(markdown, /### 转写\n\n第一段\n第二段/);
  });

  test('handles missing and unknown metadata without crashing', () => {
    const item = createHistoryItem({
      provider: 'legacy-provider' as AsrProvider,
      language: 'legacy-language' as Language,
      compressionLevel: 'legacy-compression' as CompressionLevel,
      detectedLanguage: '',
      context: '',
      audioUrl: undefined,
      segments: undefined,
      enableItn: undefined,
      trimSilence: undefined,
      enableLongAudioChunking: undefined,
    });

    assert.doesNotThrow(() => createHistoryExport([item], 'md'));

    const markdown = createHistoryExport([item], 'md');
    assert.match(markdown, /- Provider：未知/);
    assert.match(markdown, /- 目标语言：legacy-language/);
    assert.match(markdown, /- ITN：未知/);
    assert.match(markdown, /- 压缩：legacy-compression/);
    assert.doesNotMatch(markdown, /### 上下文/);
    assert.doesNotMatch(markdown, /音频 URL/);
  });

  test('uses stable MIME types and serializable fallbacks', () => {
    const serializableItems = createSerializableHistoryItems([
      createHistoryItem({
        fileName: '',
        transcription: '',
        detectedLanguage: '',
        context: '',
        provider: undefined,
        language: undefined,
        compressionLevel: undefined,
      }),
    ]);

    assert.equal(getHistoryExportMimeType('json'), 'application/json;charset=utf-8');
    assert.equal(getHistoryExportMimeType('md'), 'text/markdown;charset=utf-8');
    assert.equal(serializableItems[0].fileName, '未命名音频');
    assert.equal(serializableItems[0].provider, null);
    assert.equal(serializableItems[0].language, null);
    assert.equal(serializableItems[0].compressionLevel, null);
  });
});
