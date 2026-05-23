import { useEffect, useState } from 'react';

export function useAudioDevices() {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const getAudioDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        console.warn('enumerateDevices() not supported.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter(device => device.kind === 'audioinput'));
      } catch (error) {
        console.error('Could not enumerate audio devices or get microphone permission:', error);
      }
    };

    getAudioDevices();
  }, []);

  return audioDevices;
}
