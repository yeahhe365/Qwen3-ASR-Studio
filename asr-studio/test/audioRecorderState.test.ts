import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getAudioRecorderButtonAriaLabel,
  getAudioRecorderButtonClassName,
  getAudioRecorderButtonText,
  getAudioRecorderButtonTitle,
  getAudioRecorderStatusDotClassName,
  getAudioRecorderStatusLabel,
  isAudioRecorderBusy,
  isAudioRecorderRecording,
} from '../components/audio-recorder/audioRecorderState.ts';

describe('audio recorder status helpers', () => {
  test('identifies recording and busy states', () => {
    assert.equal(isAudioRecorderRecording('recording'), true);
    assert.equal(isAudioRecorderRecording('idle'), false);

    assert.equal(isAudioRecorderBusy('requesting'), true);
    assert.equal(isAudioRecorderBusy('stopping'), true);
    assert.equal(isAudioRecorderBusy('recording'), false);
  });

  test('maps statuses to visible labels', () => {
    assert.equal(getAudioRecorderStatusLabel('recording'), 'REC');
    assert.equal(getAudioRecorderStatusLabel('idle'), 'READY');

    assert.equal(getAudioRecorderButtonText('idle'), '开始');
    assert.equal(getAudioRecorderButtonText('requesting'), '准备中');
    assert.equal(getAudioRecorderButtonText('stopping'), '正在停止');
    assert.equal(getAudioRecorderButtonText('recording'), '停止录音');
  });

  test('maps statuses to button accessibility and style details', () => {
    assert.equal(getAudioRecorderButtonTitle('idle'), '按住空格键快捷录音');
    assert.equal(getAudioRecorderButtonTitle('recording'), '松开空格键快捷停止');

    assert.equal(getAudioRecorderButtonAriaLabel('idle'), '开始录音');
    assert.equal(getAudioRecorderButtonAriaLabel('requesting'), '取消录音准备');
    assert.equal(getAudioRecorderButtonAriaLabel('stopping'), '正在停止录音');
    assert.equal(getAudioRecorderButtonAriaLabel('recording'), '停止录音');

    assert.match(getAudioRecorderStatusDotClassName('recording'), /animate-pulsing-dot/);
    assert.match(getAudioRecorderStatusDotClassName('idle'), /bg-base-300/);
    assert.match(getAudioRecorderButtonClassName('recording'), /bg-red-600/);
    assert.doesNotMatch(getAudioRecorderButtonClassName('idle'), /bg-red-600/);
  });
});
