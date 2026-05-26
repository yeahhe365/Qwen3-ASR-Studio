import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createExportFileName, formatExportTimestamp, sanitizeExportFileName } from '../services/exportFileName.ts';

describe('export file names', () => {
  test('sanitizes source names for downloads', () => {
    assert.equal(sanitizeExportFileName('meeting notes.wav'), 'meeting-notes');
    assert.equal(sanitizeExportFileName('../奇怪 文件?.mp3'), '奇怪-文件');
    assert.equal(sanitizeExportFileName('  audio_take.01.webm  '), 'audio_take.01');
  });

  test('falls back when names only contain unsafe separators', () => {
    assert.equal(sanitizeExportFileName('../...///?.mp3'), 'export');
  });

  test('uses stable timestamps for generic exports', () => {
    const timestamp = new Date(2026, 4, 25, 7, 8, 9).getTime();

    assert.equal(formatExportTimestamp(timestamp), '20260525-070809');
    assert.equal(
      createExportFileName({
        prefix: 'asr-history',
        extension: '.json',
        timestamp,
      }),
      'asr-history-20260525-070809.json',
    );
  });

  test('avoids invalid timestamp and extension fragments in generic exports', () => {
    const timestampLabel = formatExportTimestamp(Number.NaN);

    assert.match(timestampLabel, /^\d{8}-\d{6}$/);
    assert.doesNotMatch(timestampLabel, /NaN/);
    assert.match(
      createExportFileName({
        prefix: '../history',
        extension: '../JSON?',
        timestamp: Number.POSITIVE_INFINITY,
      }),
      /^history-\d{8}-\d{6}\.json$/,
    );
  });

  test('prefers sanitized source names when present', () => {
    assert.equal(
      createExportFileName({
        prefix: 'transcript',
        extension: 'vtt',
        sourceName: 'weekly sync.m4a',
        timestamp: Date.UTC(2026, 4, 25),
      }),
      'weekly-sync.vtt',
    );
  });
});
