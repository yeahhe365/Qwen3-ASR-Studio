import { AsrProvider, CompressionLevel } from '../types';
import { getFileExtension } from './fileUtils';

const TARGET_SAMPLE_RATES = {
  [CompressionLevel.MEDIUM]: 24000,
  [CompressionLevel.MINIMUM]: 16000,
};

const SILENCE_THRESHOLD = 0.015;
const SILENCE_PADDING_SECONDS = 0.2;
const CHUNK_BOUNDARY_SEARCH_SECONDS = 15;
const CHUNK_BOUNDARY_STEP_SECONDS = 0.1;
const MIN_CHUNK_SECONDS = 30;

const GEMINI_AUDIO_EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  aac: 'audio/aac',
  aif: 'audio/aiff',
  aiff: 'audio/aiff',
  flac: 'audio/flac',
  mp3: 'audio/mpeg',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

const GEMINI_AUDIO_MIME_TYPE_ALIASES = new Map<string, string>([
  ['audio/aac', 'audio/aac'],
  ['audio/aiff', 'audio/aiff'],
  ['audio/flac', 'audio/flac'],
  ['audio/mp3', 'audio/mpeg'],
  ['audio/mpeg', 'audio/mpeg'],
  ['audio/ogg', 'audio/ogg'],
  ['audio/wav', 'audio/wav'],
  ['audio/wave', 'audio/wav'],
  ['audio/x-aiff', 'audio/aiff'],
  ['audio/x-flac', 'audio/flac'],
  ['audio/x-wav', 'audio/wav'],
]);

const DOUBAO_AUDIO_EXTENSIONS = new Set(['mp3', 'oga', 'ogg', 'pcm', 'raw', 'wav']);
const DOUBAO_AUDIO_MIME_TYPES = new Set([
  'application/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
]);

export const getGeminiSupportedAudioMimeType = (file: File) => {
  const mimeType = file.type.split(';')[0]?.trim().toLowerCase();
  if (mimeType && GEMINI_AUDIO_MIME_TYPE_ALIASES.has(mimeType)) {
    return GEMINI_AUDIO_MIME_TYPE_ALIASES.get(mimeType) || null;
  }

  const extension = getFileExtension(file);
  return GEMINI_AUDIO_EXTENSION_TO_MIME_TYPE[extension] || null;
};

export const isGeminiSupportedAudioFile = (file: File) => {
  return Boolean(getGeminiSupportedAudioMimeType(file));
};

export const isDoubaoStandardSupportedAudioFile = (file: File) => {
  const mimeType = file.type.split(';')[0]?.trim().toLowerCase();
  if (mimeType && DOUBAO_AUDIO_MIME_TYPES.has(mimeType)) {
    return true;
  }

  return DOUBAO_AUDIO_EXTENSIONS.has(getFileExtension(file));
};

export const getEffectiveCompressionLevel = (provider: AsrProvider, file: File, requestedLevel: CompressionLevel) => {
  if (requestedLevel !== CompressionLevel.ORIGINAL) {
    return requestedLevel;
  }

  if (provider === AsrProvider.NVIDIA_NIM) {
    return CompressionLevel.MEDIUM;
  }

  if (provider === AsrProvider.GEMINI && !isGeminiSupportedAudioFile(file)) {
    return CompressionLevel.MEDIUM;
  }

  if (provider === AsrProvider.DOUBAO && !isDoubaoStandardSupportedAudioFile(file)) {
    return CompressionLevel.MEDIUM;
  }

  return requestedLevel;
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
  view.setUint32(pos, 36 + dataLength, true);
  pos += 4;
  writeString('WAVE');

  // fmt sub-chunk
  writeString('fmt ');
  view.setUint32(pos, 16, true);
  pos += 4; // Subchunk1Size
  view.setUint16(pos, 1, true);
  pos += 2; // AudioFormat (1 = PCM)
  view.setUint16(pos, numChannels, true);
  pos += 2;
  view.setUint32(pos, sampleRate, true);
  pos += 4;
  view.setUint32(pos, sampleRate * numChannels * 2, true);
  pos += 4; // ByteRate
  view.setUint16(pos, numChannels * 2, true);
  pos += 2; // BlockAlign
  view.setUint16(pos, 16, true);
  pos += 2; // BitsPerSample

  // data sub-chunk
  writeString('data');
  view.setUint32(pos, dataLength, true);
  pos += 4;

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

const getAudioContextConstructor = () => {
  const browserWindow = typeof window === 'undefined' ? null : window;
  return browserWindow?.AudioContext || browserWindow?.webkitAudioContext || null;
};

const decodeAudioFile = async (inputFile: File) => {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return null;
  }

  let audioContext: AudioContext | null = null;
  try {
    audioContext = new AudioContextConstructor();
    const arrayBuffer = await inputFile.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(console.error);
    }
  }
};

const copyAudioBufferRange = (sourceBuffer: AudioBuffer, startSample: number, endSample: number) => {
  const length = Math.max(0, endSample - startSample);
  const outputBuffer = new AudioBuffer({
    length,
    numberOfChannels: sourceBuffer.numberOfChannels,
    sampleRate: sourceBuffer.sampleRate,
  });

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel += 1) {
    outputBuffer.copyToChannel(sourceBuffer.getChannelData(channel).slice(startSample, endSample), channel);
  }

  return outputBuffer;
};

const createDerivedWavFile = (buffer: AudioBuffer, inputFile: File, suffix: string) => {
  const wavBlob = bufferToWav(buffer);
  const newFileName = `${inputFile.name.replace(/\.[^/.]+$/, '')}_${suffix}.wav`;
  return new File([wavBlob], newFileName, { type: 'audio/wav' });
};

const withAudioProcessingFallback = (file: File, fallbackReason: string) => {
  const fallbackFile = file as File & { audioProcessingFallbackReason?: string };
  Object.defineProperty(fallbackFile, 'audioProcessingFallbackReason', {
    value: fallbackReason,
    configurable: true,
  });
  return fallbackFile;
};

export const getAudioProcessingFallbackReason = (file: File) => {
  return (file as File & { audioProcessingFallbackReason?: string }).audioProcessingFallbackReason;
};

const getFramePeak = (audioBuffer: AudioBuffer, startSample: number, endSample: number) => {
  let peak = 0;
  for (let sample = startSample; sample < endSample; sample += 1) {
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      peak = Math.max(peak, Math.abs(audioBuffer.getChannelData(channel)[sample]));
    }
  }
  return peak;
};

const findQuietBoundarySample = (
  audioBuffer: AudioBuffer,
  targetSample: number,
  lowerBoundSample: number,
  upperBoundSample: number,
) => {
  const searchRadiusSamples = Math.round(CHUNK_BOUNDARY_SEARCH_SECONDS * audioBuffer.sampleRate);
  const stepSamples = Math.max(1, Math.round(CHUNK_BOUNDARY_STEP_SECONDS * audioBuffer.sampleRate));
  const frameSamples = stepSamples;
  const startSample = Math.max(lowerBoundSample, targetSample - searchRadiusSamples);
  const endSample = Math.min(upperBoundSample, targetSample + searchRadiusSamples);
  let bestSample = targetSample;
  let bestPeak = Number.POSITIVE_INFINITY;

  for (let sample = startSample; sample <= endSample; sample += stepSamples) {
    const frameStart = Math.max(0, sample - Math.floor(frameSamples / 2));
    const frameEnd = Math.min(audioBuffer.length, frameStart + frameSamples);
    const peak = getFramePeak(audioBuffer, frameStart, frameEnd);

    if (peak < bestPeak) {
      bestPeak = peak;
      bestSample = sample;
    }

    if (peak < SILENCE_THRESHOLD) {
      return sample;
    }
  }

  return bestSample;
};

export const trimSilenceFromAudio = async (inputFile: File): Promise<File> => {
  try {
    const audioBuffer = await decodeAudioFile(inputFile);
    if (!audioBuffer) {
      return withAudioProcessingFallback(inputFile, '浏览器无法解码音频，已跳过静音裁剪。');
    }

    let firstVoiceSample = -1;
    let lastVoiceSample = -1;

    for (let sample = 0; sample < audioBuffer.length; sample += 1) {
      let peak = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
        peak = Math.max(peak, Math.abs(audioBuffer.getChannelData(channel)[sample]));
      }

      if (peak >= SILENCE_THRESHOLD) {
        if (firstVoiceSample === -1) {
          firstVoiceSample = sample;
        }
        lastVoiceSample = sample;
      }
    }

    if (firstVoiceSample === -1 || lastVoiceSample === -1) {
      return inputFile;
    }

    const paddingSamples = Math.round(SILENCE_PADDING_SECONDS * audioBuffer.sampleRate);
    const startSample = Math.max(0, firstVoiceSample - paddingSamples);
    const endSample = Math.min(audioBuffer.length, lastVoiceSample + paddingSamples);
    const trimmedSeconds = (audioBuffer.length - (endSample - startSample)) / audioBuffer.sampleRate;

    if (trimmedSeconds < 0.5) {
      return inputFile;
    }

    return createDerivedWavFile(copyAudioBufferRange(audioBuffer, startSample, endSample), inputFile, 'trimmed');
  } catch (error) {
    console.error('Failed to trim silence:', error);
    return withAudioProcessingFallback(inputFile, '静音裁剪失败，已使用原始音频继续识别。');
  }
};

export type AudioChunk = {
  file: File;
  index: number;
  total: number;
  startTime: number;
  endTime: number;
};

export const splitAudioIntoChunks = async (inputFile: File, chunkDurationSeconds: number): Promise<AudioChunk[]> => {
  if (chunkDurationSeconds <= 0) {
    return [{ file: inputFile, index: 1, total: 1, startTime: 0, endTime: 0 }];
  }

  try {
    const audioBuffer = await decodeAudioFile(inputFile);
    if (!audioBuffer || audioBuffer.duration <= chunkDurationSeconds) {
      return [
        {
          file: audioBuffer
            ? inputFile
            : withAudioProcessingFallback(inputFile, '浏览器无法解码音频，已跳过长音频切片。'),
          index: 1,
          total: 1,
          startTime: 0,
          endTime: audioBuffer?.duration || 0,
        },
      ];
    }

    const chunkSampleLength = Math.max(1, Math.floor(chunkDurationSeconds * audioBuffer.sampleRate));
    const minChunkSampleLength = Math.max(1, Math.floor(MIN_CHUNK_SECONDS * audioBuffer.sampleRate));
    const chunks: AudioChunk[] = [];
    let startSample = 0;

    while (startSample < audioBuffer.length) {
      const targetEndSample = startSample + chunkSampleLength;
      const lowerBoundSample = Math.min(audioBuffer.length, startSample + minChunkSampleLength);
      const endSample =
        targetEndSample >= audioBuffer.length
          ? audioBuffer.length
          : findQuietBoundarySample(audioBuffer, targetEndSample, lowerBoundSample, audioBuffer.length);
      const chunkBuffer = copyAudioBufferRange(audioBuffer, startSample, endSample);
      chunks.push({
        file: createDerivedWavFile(chunkBuffer, inputFile, `chunk-${String(chunks.length + 1).padStart(2, '0')}`),
        index: chunks.length + 1,
        total: 0,
        startTime: startSample / audioBuffer.sampleRate,
        endTime: endSample / audioBuffer.sampleRate,
      });
      startSample = endSample;
    }

    return chunks.map((chunk) => ({ ...chunk, total: chunks.length }));
  } catch (error) {
    console.error('Failed to split audio:', error);
    return [
      {
        file: withAudioProcessingFallback(inputFile, '长音频切片失败，已使用原始音频继续识别。'),
        index: 1,
        total: 1,
        startTime: 0,
        endTime: 0,
      },
    ];
  }
};

export const compressAudio = async (inputFile: File, level: CompressionLevel): Promise<File> => {
  const browserWindow = typeof window === 'undefined' ? null : window;
  const AudioContextConstructor = getAudioContextConstructor();
  if (level === CompressionLevel.ORIGINAL || !AudioContextConstructor || !browserWindow?.OfflineAudioContext) {
    return inputFile;
  }

  const targetSampleRate = TARGET_SAMPLE_RATES[level];
  const targetChannels = 1;
  let audioContext: AudioContext | null = null;

  try {
    audioContext = new AudioContextConstructor();
    const arrayBuffer = await inputFile.arrayBuffer();
    const originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    if (originalAudioBuffer.sampleRate <= targetSampleRate && originalAudioBuffer.numberOfChannels === 1) {
      return inputFile;
    }

    const duration = originalAudioBuffer.duration;
    const offlineContext = new OfflineAudioContext(
      targetChannels,
      Math.ceil(duration * targetSampleRate),
      targetSampleRate,
    );

    const source = offlineContext.createBufferSource();
    source.buffer = originalAudioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const resampledBuffer = await offlineContext.startRendering();
    const wavBlob = bufferToWav(resampledBuffer);
    const newFileName = inputFile.name.replace(/\.[^/.]+$/, '') + '.wav';
    return new File([wavBlob], newFileName, { type: 'audio/wav' });
  } catch (error) {
    console.error('Failed to compress audio:', error);
    return withAudioProcessingFallback(inputFile, '音频压缩/转换失败，已使用原始音频继续识别。');
  } finally {
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(console.error);
    }
  }
};
