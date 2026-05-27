import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { normalizeStoredHistoryItems } from '../services/historyStorage.ts';
import { CompressionLevel, Language, NvidiaNimTask } from '../types.ts';

describe('history storage normalization', () => {
  test('normalizes malformed persisted history records', () => {
    const audioFile = new File(['audio'], 'local.wav', { type: 'audio/wav' });
    const items = normalizeStoredHistoryItems([
      {
        id: 1,
        fileName: '',
        transcription: ' hello ',
        detectedLanguage: 123,
        context: null,
        timestamp: Number.NaN,
        audioFile,
        audioUrl: 'javascript:alert(1)',
        provider: 'legacy-provider',
        language: Language.CHINESE,
        enableItn: 'true',
        compressionLevel: CompressionLevel.MEDIUM,
        trimSilence: false,
        enableLongAudioChunking: true,
        nvidiaNimTask: NvidiaNimTask.TRANSLATE,
        segments: [
          {
            id: 42,
            text: ' segment ',
            startTime: -1,
            endTime: 2.5,
            speaker: 'Speaker A',
            confidence: 0.8,
          },
          { text: '' },
        ],
      },
      { id: 'bad', transcription: 'skip' },
      { id: 2, transcription: '' },
      null,
    ]);

    assert.equal(items.length, 1);
    assert.equal(items[0].fileName, '未命名音频');
    assert.equal(items[0].transcription, 'hello');
    assert.equal(items[0].detectedLanguage, '');
    assert.equal(items[0].timestamp, 0);
    assert.equal(items[0].audioFile, audioFile);
    assert.equal(items[0].audioUrl, undefined);
    assert.equal(items[0].provider, undefined);
    assert.equal(items[0].language, Language.CHINESE);
    assert.equal(items[0].enableItn, undefined);
    assert.equal(items[0].compressionLevel, CompressionLevel.MEDIUM);
    assert.equal(items[0].trimSilence, false);
    assert.equal(items[0].enableLongAudioChunking, true);
    assert.equal(items[0].nvidiaNimTask, NvidiaNimTask.TRANSLATE);
    assert.deepEqual(items[0].segments, [
      {
        id: 'segment-1',
        text: 'segment',
        startTime: 0,
        endTime: 2.5,
        speaker: 'Speaker A',
        confidence: 0.8,
      },
    ]);
  });

  test('sorts valid records by safe timestamps', () => {
    const items = normalizeStoredHistoryItems([
      { id: 1, transcription: 'old', timestamp: 100 },
      { id: 2, transcription: 'new', timestamp: 300 },
      { id: 3, transcription: 'invalid timestamp', timestamp: Number.POSITIVE_INFINITY },
    ]);

    assert.deepEqual(
      items.map((item) => item.id),
      [2, 1, 3],
    );
    assert.deepEqual(
      items.map((item) => item.timestamp),
      [300, 100, 0],
    );
  });
});
