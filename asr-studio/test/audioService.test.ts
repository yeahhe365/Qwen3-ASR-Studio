import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
  getAudioProcessingFallbackReason,
  getEffectiveCompressionLevel,
  trimSilenceFromAudio,
} from '../services/audioService.ts';
import { AsrProvider, CompressionLevel } from '../types.ts';

const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.window = originalWindow;
});

describe('audio processing fallbacks', () => {
  test('marks skipped silence trim when audio APIs are unavailable', async () => {
    globalThis.window = {} as Window & typeof globalThis;

    const file = new File(['not-audio'], 'meeting.webm', { type: 'audio/webm' });
    const result = await trimSilenceFromAudio(file);

    assert.equal(result, file);
    assert.match(getAudioProcessingFallbackReason(result) || '', /跳过静音裁剪/);
  });

  test('auto-converts unsupported Doubao local audio to WAV before submit', () => {
    const supportedFile = new File(['audio'], 'meeting.wav', { type: 'audio/wav' });
    const unsupportedFile = new File(['audio'], 'meeting.webm', { type: 'audio/webm' });

    assert.equal(
      getEffectiveCompressionLevel(AsrProvider.DOUBAO, supportedFile, CompressionLevel.ORIGINAL),
      CompressionLevel.ORIGINAL,
    );
    assert.equal(
      getEffectiveCompressionLevel(AsrProvider.DOUBAO, unsupportedFile, CompressionLevel.ORIGINAL),
      CompressionLevel.MEDIUM,
    );
  });
});
