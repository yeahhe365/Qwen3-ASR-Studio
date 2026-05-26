import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getAsrProviderLabel } from '../providerMetadata.ts';
import { AsrProvider } from '../types.ts';

describe('provider metadata helpers', () => {
  test('returns labels for known providers', () => {
    assert.equal(getAsrProviderLabel(AsrProvider.QWEN), 'Qwen');
    assert.equal(getAsrProviderLabel(AsrProvider.DOUBAO), '豆包');
  });

  test('falls back for legacy provider values', () => {
    assert.equal(getAsrProviderLabel('legacy-provider'), '未知');
    assert.equal(getAsrProviderLabel(undefined, '未记录'), '未记录');
  });
});
