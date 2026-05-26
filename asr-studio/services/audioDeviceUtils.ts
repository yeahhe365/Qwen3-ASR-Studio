export const getAudioInputDevices = (devices: Iterable<MediaDeviceInfo>) => {
  return Array.from(devices).filter((device) => device.kind === 'audioinput');
};

export const isSelectedAudioDeviceAvailable = (selectedDeviceId: string, audioDevices: Iterable<MediaDeviceInfo>) => {
  if (selectedDeviceId === 'default') {
    return true;
  }

  return getAudioInputDevices(audioDevices).some((device) => device.deviceId === selectedDeviceId);
};
