import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getDiagnosticCheckClassName,
  getDiagnosticStatusBadgeClassName,
  getDiagnosticStatusLabel,
} from '../components/settings/providerDiagnosticUi.ts';

describe('provider diagnostic UI helpers', () => {
  test('maps diagnostic statuses to display labels', () => {
    assert.equal(getDiagnosticStatusLabel(undefined), '尚未运行');
    assert.equal(getDiagnosticStatusLabel('ok'), '配置可用');
    assert.equal(getDiagnosticStatusLabel('warning'), '需要注意');
    assert.equal(getDiagnosticStatusLabel('error'), '发现错误');
  });

  test('uses the muted badge style before diagnostics have run', () => {
    assert.match(getDiagnosticStatusBadgeClassName(undefined), /theme-border-secondary/);
    assert.match(getDiagnosticStatusBadgeClassName(undefined), /theme-text-tertiary/);
  });

  test('keeps status badge and check colors aligned', () => {
    assert.match(getDiagnosticStatusBadgeClassName('ok'), /emerald/);
    assert.match(getDiagnosticCheckClassName('ok'), /emerald/);
    assert.match(getDiagnosticStatusBadgeClassName('warning'), /amber/);
    assert.match(getDiagnosticCheckClassName('warning'), /amber/);
    assert.match(getDiagnosticStatusBadgeClassName('error'), /red/);
    assert.match(getDiagnosticCheckClassName('error'), /red/);
  });
});
