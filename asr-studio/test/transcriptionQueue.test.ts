import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  cancelQueuedTranscriptionItems,
  createTranscriptionQueueItems,
  getTranscriptionQueueStats,
} from '../services/transcriptionQueue.ts';
import type { TranscriptionQueueItem } from '../types.ts';

describe('transcription queue helpers', () => {
  test('creates stable pending queue items with unique ids', () => {
    const files = [
      new File(['a'], 'meeting.wav', { type: 'audio/wav' }),
      new File(['b'], 'meeting.wav', { type: 'audio/wav' }),
    ];
    const items = createTranscriptionQueueItems(files, 1779700000000);

    assert.equal(items.length, 2);
    assert.equal(items[0].file, files[0]);
    assert.equal(items[0].fileName, 'meeting.wav');
    assert.equal(items[0].status, 'pending');
    assert.notEqual(items[0].id, items[1].id);
  });

  test('counts retryable queue states as pending', () => {
    const queue: TranscriptionQueueItem[] = [
      {
        id: '1',
        file: new File(['a'], 'a.wav'),
        fileName: 'a.wav',
        status: 'done',
      },
      {
        id: '2',
        file: new File(['b'], 'b.wav'),
        fileName: 'b.wav',
        status: 'error',
      },
      {
        id: '3',
        file: new File(['c'], 'c.wav'),
        fileName: 'c.wav',
        status: 'pending',
      },
      {
        id: '4',
        file: new File(['d'], 'd.wav'),
        fileName: 'd.wav',
        status: 'cancelled',
      },
    ];

    assert.deepEqual(getTranscriptionQueueStats(queue), {
      totalCount: 4,
      doneCount: 1,
      pendingCount: 2,
      processingCount: 0,
      errorCount: 1,
      cancelledCount: 1,
    });
  });

  test('marks unfinished queue items as cancelled while preserving completed items', () => {
    const queue: TranscriptionQueueItem[] = [
      {
        id: 'done',
        file: new File(['a'], 'done.wav'),
        fileName: 'done.wav',
        status: 'done',
        message: '已完成',
      },
      {
        id: 'processing',
        file: new File(['b'], 'processing.wav'),
        fileName: 'processing.wav',
        status: 'processing',
        message: '识别中',
      },
      {
        id: 'error',
        file: new File(['c'], 'error.wav'),
        fileName: 'error.wav',
        status: 'error',
      },
      {
        id: 'cancelled',
        file: new File(['d'], 'cancelled.wav'),
        fileName: 'cancelled.wav',
        status: 'cancelled',
        message: '已取消',
      },
    ];

    const cancelledQueue = cancelQueuedTranscriptionItems(queue);

    assert.deepEqual(
      cancelledQueue.map((item) => [item.id, item.status, item.message]),
      [
        ['done', 'done', '已完成'],
        ['processing', 'cancelled', '已取消'],
        ['error', 'cancelled', '已取消'],
        ['cancelled', 'cancelled', '已取消'],
      ],
    );
  });
});
