import { CompressionLevel } from '../types';

const TARGET_SAMPLE_RATES = {
  [CompressionLevel.MEDIUM]: 24000,
  [CompressionLevel.MINIMUM]: 16000,
};

/**
 * Encodes an AudioBuffer into a WAV file blob.
 * @param buffer The AudioBuffer to encode.
 * @returns A blob containing the WAV file data.
 */
export function bufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const dataLength = numSamples * numChannels * 2; // 16-bit samples
  const bufferLength = 44 + dataLength;

  const arrBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrBuffer);

  let pos = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i));
    }
    pos += str.length;
  };

  // RIFF chunk descriptor
  writeString('RIFF');
  view.setUint32(pos, 36 + dataLength, true); pos += 4;
  writeString('WAVE');

  // fmt sub-chunk
  writeString('fmt ');
  view.setUint32(pos, 16, true); pos += 4; // Subchunk1Size
  view.setUint16(pos, 1, true); pos += 2; // AudioFormat (1 = PCM)
  view.setUint16(pos, numChannels, true); pos += 2;
  view.setUint32(pos, sampleRate, true); pos += 4;
  view.setUint32(pos, sampleRate * numChannels * 2, true); pos += 4; // ByteRate
  view.setUint16(pos, numChannels * 2, true); pos += 2; // BlockAlign
  view.setUint16(pos, 16, true); pos += 2; // BitsPerSample

  // data sub-chunk
  writeString('data');
  view.setUint32(pos, dataLength, true); pos += 4;

  // Write samples
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  for (let i = 0; i < numSamples; i++) {
    for (let j = 0; j < numChannels; j++) {
      let sample = Math.max(-1, Math.min(1, channels[j][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
  }

  return new Blob([arrBuffer], { type: 'audio/wav' });
}


export const compressAudio = (
  inputFile: File,
  level: CompressionLevel
): Promise<File> => {
  return new Promise(async (resolve) => {
    if (level === CompressionLevel.ORIGINAL || !window.AudioContext || !window.OfflineAudioContext) {
      // If compression is disabled or browser APIs are unavailable, return original file
      return resolve(inputFile);
    }

    const targetSampleRate = TARGET_SAMPLE_RATES[level];
    const targetChannels = 1; // Mono is best for ASR and saves space

    let audioContext: AudioContext | null = null;
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await inputFile.arrayBuffer();
      const originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      if (originalAudioBuffer.sampleRate <= targetSampleRate && originalAudioBuffer.numberOfChannels === 1) {
          await audioContext.close();
          return resolve(inputFile);
      }
      
      const duration = originalAudioBuffer.duration;
      const offlineContext = new OfflineAudioContext(
        targetChannels,
        Math.ceil(duration * targetSampleRate),
        targetSampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = originalAudioBuffer;
      source.connect(offlineContext.destination);
      source.start();

      const resampledBuffer = await offlineContext.startRendering();
      
      const wavBlob = bufferToWav(resampledBuffer);
      const newFileName = inputFile.name.replace(/\.[^/.]+$/, "") + `.wav`;
      const compressedFile = new File([wavBlob], newFileName, { type: 'audio/wav' });
      
      await audioContext.close();
      resolve(compressedFile);

    } catch (error) {
      console.error('Failed to compress audio:', error);
      // Fallback to returning the original file if compression fails
      if(audioContext && audioContext.state !== 'closed') await audioContext.close();
      resolve(inputFile);
    }
  });
};
