import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { asrProviderCapabilityMatrix, asrProviderOrder, getAsrProviderLabel } from '../providerMetadata.ts';
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

  test('keeps capability matrix aligned with registered providers', () => {
    for (const row of asrProviderCapabilityMatrix) {
      assert.deepEqual(Object.keys(row.cells).sort(), [...asrProviderOrder].sort());
    }

    const translationRow = asrProviderCapabilityMatrix.find((row) => row.id === 'translation');
    assert.equal(translationRow?.cells[AsrProvider.NVIDIA_NIM].status, 'supported');
  });
});
