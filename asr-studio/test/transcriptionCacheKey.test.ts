import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { DOUBAO_ASR_RESOURCE_ID, NVIDIA_NIM_ASR_MODEL } from '../constants.ts';
import {
  createProviderCacheDescriptor,
  createTranscriptionCacheKey,
  createTranscriptionCacheSource,
} from '../services/transcriptionCacheKey.ts';
import { AsrProvider, CompressionLevel, Language, type AsrProviderConfig } from '../types.ts';

const createConfig = (overrides: Partial<AsrProviderConfig> = {}): AsrProviderConfig => ({
  provider: AsrProvider.QWEN,
  qwenApiKey: 'qwen-key',
  doubaoApiKey: '',
  doubaoAccessKey: '',
  geminiApiKey: '',
  nvidiaNimBaseUrl: '',
  nvidiaNimApiKey: '',
  ...overrides,
});

const createKey = (overrides: Partial<Parameters<typeof createTranscriptionCacheKey>[0]> = {}) =>
  createTranscriptionCacheKey({
    source: createTranscriptionCacheSource('file-hash'),
    config: createConfig(),
    language: Language.AUTO,
    enableItn: false,
    compressionLevel: CompressionLevel.ORIGINAL,
    trimSilence: false,
    enableLongAudioChunking: true,
    context: '',
    ...overrides,
  });

describe('transcription cache keys', () => {
  test('uses structured source keys for local files and remote URLs', () => {
    assert.deepEqual(createTranscriptionCacheSource('abc123'), {
      type: 'file-hash',
      value: 'abc123',
    });
    assert.deepEqual(createTranscriptionCacheSource('', ' https://example.com/audio:1.wav?x=a:b '), {
      type: 'remote-url',
      value: 'https://example.com/audio:1.wav?x=a:b',
    });
  });

  test('normalizes provider-specific descriptors', () => {
    assert.deepEqual(createProviderCacheDescriptor(createConfig({ provider: AsrProvider.DOUBAO })), {
      provider: AsrProvider.DOUBAO,
      resourceId: DOUBAO_ASR_RESOURCE_ID,
    });
    assert.deepEqual(
      createProviderCacheDescriptor(
        createConfig({
          provider: AsrProvider.NVIDIA_NIM,
          nvidiaNimBaseUrl: ' https://nim.example.com/ ',
        }),
      ),
      {
        provider: AsrProvider.NVIDIA_NIM,
        model: NVIDIA_NIM_ASR_MODEL,
        baseUrl: 'https://nim.example.com',
      },
    );
  });

  test('separates ambiguous values and trims context', () => {
    const firstKey = createKey({
      source: createTranscriptionCacheSource('a:b'),
      context: ' meeting notes ',
    });
    const secondKey = createKey({
      source: createTranscriptionCacheSource('a', 'https://example.com/b:c.wav'),
      context: 'meeting notes',
    });

    assert.notEqual(firstKey, secondKey);
    assert.equal(JSON.parse(firstKey).options.context, 'meeting notes');
  });
});
