import { bufferToWav, getAudioProcessingFallbackReason } from './audioService';
import type { BenchmarkPerturbationSettings } from './benchmarkTypes';

const getAudioContextConstructor = () => {
  const browserWindow = typeof window === 'undefined' ? null : window;
  return browserWindow?.AudioContext || browserWindow?.webkitAudioContext || null;
};

const createFallbackFile = (file: File, reason: string) => {
  const fallbackFile = file as File & { audioProcessingFallbackReason?: string };
  Object.defineProperty(fallbackFile, 'audioProcessingFallbackReason', {
    value: reason,
    configurable: true,
  });
  return fallbackFile;
};

const copyBuffer = (buffer: AudioBuffer) => {
  const output = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    output.copyToChannel(buffer.getChannelData(channel), channel);
  }
  return output;
};

const renderWithFilters = async (
  buffer: AudioBuffer,
  createGraph: (context: OfflineAudioContext, source: AudioBufferSourceNode) => void,
  sampleRate = buffer.sampleRate,
) => {
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  createGraph(offlineContext, source);
  source.start();
  return offlineContext.startRendering();
};

const addNoise = (buffer: AudioBuffer, intensity: number) => {
  const output = copyBuffer(buffer);
  const gain = 0.04 * intensity;
  for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
    const data = output.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.max(-1, Math.min(1, data[index] + (Math.random() * 2 - 1) * gain));
    }
  }
  return output;
};

const applyVolume = (buffer: AudioBuffer, intensity: number) => {
  const output = copyBuffer(buffer);
  const gain = 0.55 + intensity * 1.2;
  for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
    const data = output.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.max(-1, Math.min(1, data[index] * gain));
    }
  }
  return output;
};

const applyCompressionArtifacts = (buffer: AudioBuffer, intensity: number) => {
  const output = copyBuffer(buffer);
  const quantization = Math.max(16, Math.round(256 / Math.max(0.2, intensity)));
  for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
    const data = output.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.round(data[index] * quantization) / quantization;
    }
  }
  return output;
};

const applyBackgroundMusic = (buffer: AudioBuffer, intensity: number) => {
  const output = copyBuffer(buffer);
  const gain = 0.035 * intensity;
  for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
    const data = output.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      const tone = Math.sin((index / output.sampleRate) * Math.PI * 2 * 220);
      data[index] = Math.max(-1, Math.min(1, data[index] + tone * gain));
    }
  }
  return output;
};

const applySpeed = async (buffer: AudioBuffer, intensity: number) => {
  const speed = 0.85 + intensity * 0.35;
  const outputLength = Math.max(1, Math.round(buffer.length / speed));
  const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, outputLength, buffer.sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = speed;
  source.connect(offlineContext.destination);
  source.start();
  return offlineContext.startRendering();
};

const applyTelephone = (buffer: AudioBuffer) =>
  renderWithFilters(buffer, (context, source) => {
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 300;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3400;
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(context.destination);
  }, 8000);

const applyReverb = async (buffer: AudioBuffer, intensity: number) => {
  const output = copyBuffer(buffer);
  const delaySamples = Math.round(buffer.sampleRate * (0.04 + intensity * 0.12));
  const decay = 0.25 * intensity;
  for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
    const data = output.getChannelData(channel);
    for (let index = delaySamples; index < data.length; index += 1) {
      data[index] = Math.max(-1, Math.min(1, data[index] + data[index - delaySamples] * decay));
    }
  }
  return output;
};

export const applyBenchmarkPerturbation = async (file: File, settings: BenchmarkPerturbationSettings) => {
  if (!settings.enabled || settings.mode === 'none') {
    return file;
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor || typeof OfflineAudioContext === 'undefined') {
    return createFallbackFile(file, '浏览器不支持离线音频处理，已跳过鲁棒性扰动。');
  }

  let audioContext: AudioContext | null = null;
  try {
    audioContext = new AudioContextConstructor();
    const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    const intensity = Math.min(1, Math.max(0, settings.intensity));
    let perturbedBuffer: AudioBuffer;

    switch (settings.mode) {
      case 'noise':
        perturbedBuffer = addNoise(buffer, intensity);
        break;
      case 'reverb':
        perturbedBuffer = await applyReverb(buffer, intensity);
        break;
      case 'speed':
        perturbedBuffer = await applySpeed(buffer, intensity);
        break;
      case 'volume':
        perturbedBuffer = applyVolume(buffer, intensity);
        break;
      case 'compression':
        perturbedBuffer = applyCompressionArtifacts(buffer, intensity);
        break;
      case 'telephone':
        perturbedBuffer = await applyTelephone(buffer);
        break;
      case 'background-music':
        perturbedBuffer = applyBackgroundMusic(buffer, intensity);
        break;
      default:
        return file;
    }

    const blob = bufferToWav(perturbedBuffer);
    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${settings.mode}.wav`;
    return new File([blob], fileName, { type: 'audio/wav' });
  } catch (error) {
    console.error('Failed to perturb benchmark audio:', error);
    return createFallbackFile(file, getAudioProcessingFallbackReason(file) || '鲁棒性扰动失败，已使用原始音频。');
  } finally {
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(console.error);
    }
  }
};
