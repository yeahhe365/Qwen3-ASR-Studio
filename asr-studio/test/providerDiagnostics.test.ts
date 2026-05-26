import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { diagnoseProviderConfig, getWorstDiagnosticStatus, isValidHttpUrl } from '../services/providerDiagnostics.ts';
import { AsrProvider, type AsrProviderConfig } from '../types.ts';

const baseConfig: AsrProviderConfig = {
  provider: AsrProvider.NVIDIA_NIM,
  qwenApiKey: '',
  doubaoApiKey: '',
  doubaoAccessKey: '',
  geminiApiKey: '',
  nvidiaNimBaseUrl: '',
  nvidiaNimApiKey: '',
};

describe('provider diagnostics', () => {
  test('prioritizes diagnostic statuses', () => {
    assert.equal(getWorstDiagnosticStatus([]), 'ok');
    assert.equal(getWorstDiagnosticStatus([{ label: 'A', status: 'ok', detail: '' }]), 'ok');
    assert.equal(
      getWorstDiagnosticStatus([
        { label: 'A', status: 'ok', detail: '' },
        { label: 'B', status: 'warning', detail: '' },
      ]),
      'warning',
    );
    assert.equal(
      getWorstDiagnosticStatus([
        { label: 'A', status: 'warning', detail: '' },
        { label: 'B', status: 'error', detail: '' },
      ]),
      'error',
    );
  });

  test('validates HTTP URLs', () => {
    assert.equal(isValidHttpUrl('http://localhost:9000'), true);
    assert.equal(isValidHttpUrl('https://nim.example.com'), true);
    assert.equal(isValidHttpUrl('localhost:9000'), false);
    assert.equal(isValidHttpUrl('ftp://example.com'), false);
  });

  test('reports invalid NVIDIA NIM base URLs', () => {
    const report = diagnoseProviderConfig({
      ...baseConfig,
      nvidiaNimBaseUrl: 'localhost:9000',
    });

    assert.equal(report.status, 'error');
    assert.match(report.checks[0].detail, /HTTP Base URL/);
  });
});
