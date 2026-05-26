import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseHistoryImportJson, parseHistoryImportPayload } from '../services/historyImport.ts';
import { AsrProvider, CompressionLevel, Language } from '../types.ts';

describe('parseHistoryImportJson', () => {
  test('imports exported history records with metadata and regenerated ids', () => {
    const importedItems = parseHistoryImportJson(
      JSON.stringify([
        {
          id: 42,
          fileName: 'meeting.wav',
          transcription: '第一段\n第二段',
          detectedLanguage: 'zh',
          context: '项目术语',
          timestamp: 1710000000000,
          provider: AsrProvider.QWEN,
          language: Language.CHINESE,
          enableItn: true,
          compressionLevel: CompressionLevel.MEDIUM,
          trimSilence: true,
          enableLongAudioChunking: true,
          audioUrl: 'https://example.com/meeting.wav',
          segments: [
            { id: 'a', text: '第一段', startTime: 0, endTime: 1.2 },
            { id: 'b', text: '第二段', startTime: 1.2, endTime: 2.4 },
          ],
        },
      ]),
      { usedIds: new Set([42]), now: 1000 },
    );

    assert.equal(importedItems.length, 1);
    assert.equal(importedItems[0].id, 1000);
    assert.equal(importedItems[0].fileName, 'meeting.wav');
    assert.equal(importedItems[0].provider, AsrProvider.QWEN);
    assert.equal(importedItems[0].language, Language.CHINESE);
    assert.equal(importedItems[0].enableItn, true);
    assert.equal(importedItems[0].compressionLevel, CompressionLevel.MEDIUM);
    assert.equal(importedItems[0].trimSilence, true);
    assert.equal(importedItems[0].enableLongAudioChunking, true);
    assert.equal(importedItems[0].audioUrl, 'https://example.com/meeting.wav');
    assert.deepEqual(
      importedItems[0].segments?.map((segment) => segment.text),
      ['第一段', '第二段'],
    );
  });

  test('imports a single transcript export and derives line segments', () => {
    const importedItems = parseHistoryImportPayload(
      {
        sourceFile: 'single.txt',
        transcription: 'Hello\nworld',
        detectedLanguage: 'en',
        createdAt: 2000,
        provider: AsrProvider.GEMINI,
      },
      { now: 3000 },
    );

    assert.equal(importedItems.length, 1);
    assert.equal(importedItems[0].fileName, 'single.txt');
    assert.equal(importedItems[0].timestamp, 2000);
    assert.equal(importedItems[0].provider, AsrProvider.GEMINI);
    assert.deepEqual(
      importedItems[0].segments?.map((segment) => segment.text),
      ['Hello', 'world'],
    );
  });

  test('skips invalid records', () => {
    const importedItems = parseHistoryImportPayload([{ transcription: '' }, null, { fileName: 'empty.wav' }]);

    assert.deepEqual(importedItems, []);
  });

  test('keeps fallback ids and timestamps valid when import clock is invalid', () => {
    const importedItems = parseHistoryImportPayload([{ transcription: 'hello' }, { transcription: 'world' }], {
      now: -10,
      usedIds: new Set([1]),
    });

    assert.deepEqual(
      importedItems.map((item) => item.id),
      [2, 3],
    );
    assert.deepEqual(
      importedItems.map((item) => item.timestamp),
      [1, 0],
    );
  });
});
