import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getAudioInputDevices, isSelectedAudioDeviceAvailable } from '../services/audioDeviceUtils.ts';

const createDevice = (deviceId: string, kind: MediaDeviceKind): MediaDeviceInfo =>
  ({
    deviceId,
    kind,
    groupId: '',
    label: '',
    toJSON: () => ({}),
  }) as MediaDeviceInfo;

describe('audio device utilities', () => {
  test('keeps only audio input devices', () => {
    const devices = [
      createDevice('mic-1', 'audioinput'),
      createDevice('speaker-1', 'audiooutput'),
      createDevice('camera-1', 'videoinput'),
      createDevice('mic-2', 'audioinput'),
    ];

    assert.deepEqual(
      getAudioInputDevices(devices).map((device) => device.deviceId),
      ['mic-1', 'mic-2'],
    );
  });

  test('detects when the selected microphone disappeared', () => {
    const devices = [createDevice('mic-1', 'audioinput')];

    assert.equal(isSelectedAudioDeviceAvailable('default', devices), true);
    assert.equal(isSelectedAudioDeviceAvailable('mic-1', devices), true);
    assert.equal(isSelectedAudioDeviceAvailable('missing-mic', devices), false);
  });
});
