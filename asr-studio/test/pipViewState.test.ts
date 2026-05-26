import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  canCancelPipRecording,
  canStartPipRecording,
  getPipMessageClassName,
  getPipPrimaryButtonLabel,
  getPipPrimaryButtonTitle,
  isPipBusy,
  isPipPrimaryButtonDisabled,
} from '../components/pip-view/pipViewState.ts';

describe('PiP view status helpers', () => {
  test('identifies busy and cancellable states', () => {
    assert.equal(isPipBusy('requesting'), true);
    assert.equal(isPipBusy('recording'), true);
    assert.equal(isPipBusy('processing'), true);
    assert.equal(isPipBusy('idle'), false);

    assert.equal(canCancelPipRecording('requesting'), true);
    assert.equal(canCancelPipRecording('recording'), true);
    assert.equal(canCancelPipRecording('processing'), false);
  });

  test('keeps primary button behavior explicit for disabled host state', () => {
    assert.equal(canStartPipRecording('idle', false), true);
    assert.equal(canStartPipRecording('success', false), true);
    assert.equal(canStartPipRecording('error', false), true);
    assert.equal(canStartPipRecording('idle', true), false);

    assert.equal(isPipPrimaryButtonDisabled('processing', false), true);
    assert.equal(isPipPrimaryButtonDisabled('idle', true), true);
    assert.equal(isPipPrimaryButtonDisabled('recording', true), false);
  });

  test('maps status to accessible button text and input styling', () => {
    assert.equal(getPipPrimaryButtonLabel('requesting', false), '取消录音准备');
    assert.equal(getPipPrimaryButtonLabel('recording', false), '停止录音');
    assert.equal(getPipPrimaryButtonLabel('processing', false), '正在识别');
    assert.equal(getPipPrimaryButtonLabel('idle', true), '主窗口识别中');
    assert.equal(getPipPrimaryButtonTitle('idle', true), '主窗口识别进行中');
    assert.equal(getPipPrimaryButtonTitle('recording', true), undefined);

    assert.match(getPipMessageClassName('success'), /text-content-100/);
    assert.match(getPipMessageClassName('error'), /text-content-100/);
    assert.match(getPipMessageClassName('idle'), /text-content-200/);
  });
});
