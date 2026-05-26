import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { estimateBase64ByteSize, formatByteSize, getFileExtension } from '../services/fileUtils.ts';
import { createRemoteAudioFile } from '../services/remoteAudioFile.ts';

describe('file utilities', () => {
  test('extracts normalized file extensions', () => {
    assert.equal(getFileExtension(new File(['a'], 'meeting.WAV')), 'wav');
    assert.equal(getFileExtension(new File(['a'], 'clip. weird-opus ')), 'weirdopus');
    assert.equal(getFileExtension(new File(['a'], '.hiddenfile')), '');
    assert.equal(getFileExtension(new File(['a'], 'no-extension')), '');
  });

  test('uses remote URL path names without query strings', () => {
    const file = createRemoteAudioFile('https://example.com/audio/meeting.wav?token=secret#section');

    assert.equal(file.name, 'meeting.wav');
    assert.equal(getFileExtension(file), 'wav');
  });

  test('estimates base64 expansion in 4-byte groups', () => {
    assert.equal(estimateBase64ByteSize(-1), 0);
    assert.equal(estimateBase64ByteSize(Number.NaN), 0);
    assert.equal(estimateBase64ByteSize(Number.POSITIVE_INFINITY), 0);
    assert.equal(estimateBase64ByteSize(0), 0);
    assert.equal(estimateBase64ByteSize(1), 4);
    assert.equal(estimateBase64ByteSize(3), 4);
    assert.equal(estimateBase64ByteSize(4), 8);
  });

  test('formats byte sizes defensively', () => {
    assert.equal(formatByteSize(0), '0 B');
    assert.equal(formatByteSize(-1), '0 B');
    assert.equal(formatByteSize(Number.NaN), '0 B');
    assert.equal(formatByteSize(512), '512 B');
    assert.equal(formatByteSize(1536), '1.5 KB');
    assert.equal(formatByteSize(10 * 1024 * 1024), '10 MB');
    assert.equal(formatByteSize(1024 ** 5), '1024 TB');
  });
});
