import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createTimestampedAudioFile,
  filterSupportedAudioInputFiles,
  formatAudioFileSize,
  formatAudioTime,
  getExtensionFromMimeType,
  isSupportedAudioInputFile,
} from '../services/audioFileUtils.ts';

describe('audio file utilities', () => {
  test('maps common recording MIME types to provider-friendly extensions', () => {
    assert.equal(getExtensionFromMimeType('audio/webm;codecs=opus'), 'webm');
    assert.equal(getExtensionFromMimeType('audio/mp4'), 'm4a');
    assert.equal(getExtensionFromMimeType('audio/mpeg'), 'mp3');
    assert.equal(getExtensionFromMimeType('audio/wave'), 'wav');
  });

  test('falls back safely for unknown or empty MIME types', () => {
    assert.equal(getExtensionFromMimeType('', 'wav'), 'wav');
    assert.equal(getExtensionFromMimeType('audio/x-custom codec'), 'xcustomcodec');
  });

  test('creates timestamped recording files with normalized extensions', () => {
    const recordedAt = new Date(2026, 4, 25, 9, 8);
    const file = createTimestampedAudioFile(['audio'], 'audio/mp4;codecs=mp4a.40.2', 'recording', recordedAt);

    assert.equal(file.name, 'recording-2026-05-25_09-08.m4a');
    assert.equal(file.type, 'audio/mp4;codecs=mp4a.40.2');
  });

  test('falls back to a valid recording timestamp for invalid dates', () => {
    const file = createTimestampedAudioFile(['audio'], 'audio/webm', 'recording', new Date(Number.NaN));

    assert.match(file.name, /^recording-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.webm$/);
    assert.doesNotMatch(file.name, /NaN/);
  });

  test('detects supported uploaded audio by MIME type or extension', () => {
    const typedAudio = new File(['audio'], 'capture.bin', { type: 'audio/webm;codecs=opus' });
    const extensionAudio = new File(['audio'], 'meeting.M4A', { type: '' });
    const unsupported = new File(['text'], 'notes.txt', { type: 'text/plain' });

    assert.equal(isSupportedAudioInputFile(typedAudio), true);
    assert.equal(isSupportedAudioInputFile(extensionAudio), true);
    assert.equal(isSupportedAudioInputFile(unsupported), false);
    assert.deepEqual(filterSupportedAudioInputFiles([unsupported, extensionAudio, typedAudio]), [
      extensionAudio,
      typedAudio,
    ]);
  });

  test('formats file sizes and durations defensively', () => {
    assert.equal(formatAudioFileSize(-1), '0 Bytes');
    assert.equal(formatAudioFileSize(Number.NaN), '0 Bytes');
    assert.equal(formatAudioFileSize(1536), '1.5 KB');
    assert.equal(formatAudioFileSize(1024 ** 5), '1024 TB');
    assert.equal(formatAudioTime(-5), '00:00');
    assert.equal(formatAudioTime(Number.POSITIVE_INFINITY), '00:00');
    assert.equal(formatAudioTime(65.9), '01:05');
  });
});
