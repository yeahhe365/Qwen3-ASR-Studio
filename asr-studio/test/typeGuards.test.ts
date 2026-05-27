import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isAsrProvider, isCompressionLevel, isLanguage, isNvidiaNimTask } from '../services/typeGuards.ts';
import { AsrProvider, CompressionLevel, Language, MainstreamAsrModel, NvidiaNimTask } from '../types.ts';

describe('type guards', () => {
  test('accepts known ASR provider, language and compression values', () => {
    assert.equal(isAsrProvider(AsrProvider.QWEN), true);
    assert.equal(isAsrProvider(AsrProvider.NVIDIA_NIM), true);
    assert.equal(isLanguage(Language.CHINESE), true);
    assert.equal(isCompressionLevel(CompressionLevel.MEDIUM), true);
    assert.equal(isNvidiaNimTask(NvidiaNimTask.TRANSLATE), true);
  });

  test('rejects legacy or malformed enum values', () => {
    assert.equal(isAsrProvider('legacy-provider'), false);
    assert.equal(isLanguage('legacy-language'), false);
    assert.equal(isCompressionLevel('tiny'), false);
    assert.equal(isNvidiaNimTask('summarize'), false);
    assert.equal(isAsrProvider(undefined), false);
  });
});
