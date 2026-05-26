import { bufferToWav } from './audioService';

export const getAudioPreviewErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '';
  }

  if (typeof MediaError !== 'undefined' && error instanceof MediaError) {
    switch (error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return '';
      case MediaError.MEDIA_ERR_NETWORK:
        return '音频加载失败，请检查网络或远程音频 URL。';
      case MediaError.MEDIA_ERR_DECODE:
        return '音频解码失败，请确认格式受浏览器支持。';
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return '当前浏览器不支持预览此音频格式。';
      default:
        return '音频预览加载失败。';
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return `音频预览加载失败：${error.message.trim()}`;
  }

  return '音频预览加载失败。';
};

const sanitizeClipBaseName = (name: string) => {
  const sanitized = name
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^[.-]+|[.-]+$/g, '');

  return /[\p{L}\p{N}]/u.test(sanitized) ? sanitized : 'audio';
};

export const createClippedAudioFileName = (sourceName: string) => {
  const sourceBaseName = sourceName.trim().replace(/\.[^/.]+$/, '');
  const safeBaseName = sanitizeClipBaseName(sourceBaseName || 'audio');

  return `${safeBaseName}-clipped.wav`;
};

type CreateClippedAudioFileOptions = {
  sourceBuffer: AudioBuffer;
  sourceName: string;
  startTime: number;
  endTime: number;
};

export const createClippedAudioFile = async ({
  sourceBuffer,
  sourceName,
  startTime,
  endTime,
}: CreateClippedAudioFileOptions) => {
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const clippedLength = endSample - startSample;
  if (clippedLength <= 0) {
    return null;
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  const audioContext = new AudioContextConstructor();
  try {
    const clippedBuffer = audioContext.createBuffer(numChannels, clippedLength, sampleRate);

    for (let channelIndex = 0; channelIndex < numChannels; channelIndex += 1) {
      const originalData = sourceBuffer.getChannelData(channelIndex);
      const clippedData = clippedBuffer.getChannelData(channelIndex);
      const segment = originalData.subarray(startSample, endSample);
      clippedData.set(segment);
    }

    const wavBlob = bufferToWav(clippedBuffer);
    return new File([wavBlob], createClippedAudioFileName(sourceName), { type: 'audio/wav' });
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close().catch((error) => {
        console.error('Failed to close audio clipping context:', error);
      });
    }
  }
};
