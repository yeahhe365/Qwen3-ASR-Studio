import { useEffect, useState } from 'react';
import { getAudioInputDevices } from '../services/audioDeviceUtils';

export function useAudioDevices() {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let isMounted = true;
    let requestSequence = 0;

    const getAudioDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        console.warn('enumerateDevices() not supported.');
        if (isMounted) {
          setAudioDevices([]);
        }
        return;
      }

      const requestId = (requestSequence += 1);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (isMounted && requestId === requestSequence) {
          setAudioDevices(getAudioInputDevices(devices));
        }
      } catch (error) {
        console.warn('Could not enumerate audio devices:', error);
        if (isMounted && requestId === requestSequence) {
          setAudioDevices([]);
        }
      }
    };

    getAudioDevices();

    navigator.mediaDevices?.addEventListener?.('devicechange', getAudioDevices);
    return () => {
      isMounted = false;
      requestSequence += 1;
      navigator.mediaDevices?.removeEventListener?.('devicechange', getAudioDevices);
    };
  }, []);

  return audioDevices;
}
