import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { createClippedAudioFileName, getAudioPreviewErrorMessage } from '../services/audioPreviewUtils.ts';

const originalMediaError = globalThis.MediaError;

class MockMediaError {
  static MEDIA_ERR_ABORTED = 1;
  static MEDIA_ERR_NETWORK = 2;
  static MEDIA_ERR_DECODE = 3;
  static MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

  MEDIA_ERR_ABORTED = 1;
  MEDIA_ERR_NETWORK = 2;
  MEDIA_ERR_DECODE = 3;
  MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

  constructor(readonly code: number) {}
}

afterEach(() => {
  globalThis.MediaError = originalMediaError;
});

describe('audio preview utils', () => {
  test('maps preview load failures to actionable messages', () => {
    globalThis.MediaError = MockMediaError as unknown as typeof MediaError;

    assert.equal(getAudioPreviewErrorMessage(new DOMException('Aborted', 'AbortError')), '');
    assert.equal(getAudioPreviewErrorMessage(new MockMediaError(1)), '');
    assert.match(getAudioPreviewErrorMessage(new MockMediaError(2)), /网络|远程音频 URL/);
    assert.match(getAudioPreviewErrorMessage(new MockMediaError(3)), /解码失败/);
    assert.match(getAudioPreviewErrorMessage(new MockMediaError(4)), /不支持预览/);
    assert.equal(getAudioPreviewErrorMessage(new Error('bad codec')), '音频预览加载失败：bad codec');
    assert.equal(getAudioPreviewErrorMessage(null), '音频预览加载失败。');
  });

  test('creates safe clipped audio file names', () => {
    assert.equal(createClippedAudioFileName('meeting.audio.wav'), 'meeting.audio-clipped.wav');
    assert.equal(createClippedAudioFileName('../unsafe name?.mp3'), 'unsafe-name-clipped.wav');
    assert.equal(createClippedAudioFileName(''), 'audio-clipped.wav');
  });
});
