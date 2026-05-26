import { useEffect, useRef } from 'react';
import type { Theme } from '../types';

interface LiveAudioWaveformProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  theme: Theme;
}

const BAR_WIDTH = 4;
const BAR_GAP = 3;
const SAMPLE_INTERVAL_MS = 45;
const MIN_BAR_HEIGHT = 4;
const IDLE_LEVELS = [0.08, 0.13, 0.18, 0.11, 0.22, 0.16, 0.1, 0.14];

const readCssColor = (element: Element, variableName: string, fallback: string) => {
  const color = getComputedStyle(element).getPropertyValue(variableName).trim();
  return color || fallback;
};

const fitCanvasToContainer = (canvas: HTMLCanvasElement) => {
  const parent = canvas.parentElement;
  if (!parent) return null;

  const width = Math.max(parent.clientWidth, 1);
  const height = Math.max(parent.clientHeight, 1);
  const pixelRatio = window.devicePixelRatio || 1;
  const nextWidth = Math.floor(width * pixelRatio);
  const nextHeight = Math.floor(height * pixelRatio);

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { context, width, height };
};

const trimLevels = (levels: number[], width: number) => {
  const maxBars = Math.ceil(width / (BAR_WIDTH + BAR_GAP)) + 2;
  if (levels.length > maxBars) {
    levels.splice(0, levels.length - maxBars);
  }
};

const calculateLevel = (analyser: AnalyserNode, dataArray: Uint8Array) => {
  analyser.getByteTimeDomainData(dataArray);

  let peak = 0;
  let sumSquares = 0;

  for (let i = 0; i < dataArray.length; i += 1) {
    const sample = (dataArray[i] - 128) / 128;
    const magnitude = Math.abs(sample);
    peak = Math.max(peak, magnitude);
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / dataArray.length);
  return Math.min(1, Math.max(rms * 3.4, peak * 0.75));
};

const drawBars = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  levels: number[],
  width: number,
  height: number,
  isRecording: boolean,
) => {
  const primaryColor = readCssColor(canvas, '--color-brand-primary', '#10b981');
  const accentColor = readCssColor(canvas, '--color-accent', '#2563eb');
  const mutedColor = readCssColor(canvas, '--color-base-300', '#cbd5e1');
  const centerY = height / 2;
  const maxBarHeight = height * 0.78;
  const gradient = context.createLinearGradient(0, 0, width, 0);

  if (isRecording) {
    gradient.addColorStop(0, mutedColor);
    gradient.addColorStop(0.72, primaryColor);
    gradient.addColorStop(1, accentColor);
  } else {
    gradient.addColorStop(0, mutedColor);
    gradient.addColorStop(1, mutedColor);
  }

  context.clearRect(0, 0, width, height);
  context.lineCap = 'round';
  context.lineWidth = BAR_WIDTH;
  context.strokeStyle = gradient;

  const sourceLevels =
    levels.length > 0
      ? levels
      : Array.from(
          { length: Math.ceil(width / (BAR_WIDTH + BAR_GAP)) },
          (_, index) => IDLE_LEVELS[index % IDLE_LEVELS.length],
        );

  const firstVisibleIndex = Math.max(0, sourceLevels.length - Math.ceil(width / (BAR_WIDTH + BAR_GAP)));

  for (let index = sourceLevels.length - 1; index >= firstVisibleIndex; index -= 1) {
    const offset = sourceLevels.length - 1 - index;
    const x = width - BAR_WIDTH / 2 - offset * (BAR_WIDTH + BAR_GAP);
    if (x < -BAR_WIDTH) break;

    const level = sourceLevels[index];
    const barHeight = Math.max(MIN_BAR_HEIGHT, level * maxBarHeight);
    const ageOpacity = isRecording ? Math.max(0.2, 1 - offset * 0.015) : 0.26;

    context.globalAlpha = ageOpacity;
    context.beginPath();
    context.moveTo(x, centerY - barHeight / 2);
    context.lineTo(x, centerY + barHeight / 2);
    context.stroke();
  }

  context.globalAlpha = 1;
};

export const LiveAudioWaveform = ({ analyser, isRecording, theme }: LiveAudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>([]);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const smoothedLevelRef = useRef(0);
  const lastSampleAtRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number | null = null;
    let stopped = false;

    const drawCurrentState = () => {
      const canvasState = fitCanvasToContainer(canvas);
      if (!canvasState) return;

      trimLevels(levelsRef.current, canvasState.width);
      drawBars(canvasState.context, canvas, levelsRef.current, canvasState.width, canvasState.height, isRecording);
    };

    if (!isRecording || !analyser) {
      levelsRef.current = [];
      smoothedLevelRef.current = 0;
      drawCurrentState();
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(drawCurrentState);
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const drawRecordingFrame = (timestamp: number) => {
      if (stopped || !analyser) return;

      const canvasState = fitCanvasToContainer(canvas);
      if (!canvasState) {
        animationFrameId = requestAnimationFrame(drawRecordingFrame);
        return;
      }

      if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.fftSize) {
        dataArrayRef.current = new Uint8Array(analyser.fftSize);
      }

      if (timestamp - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS) {
        const level = calculateLevel(analyser, dataArrayRef.current);
        smoothedLevelRef.current = smoothedLevelRef.current * 0.58 + level * 0.42;
        levelsRef.current.push(smoothedLevelRef.current);
        trimLevels(levelsRef.current, canvasState.width);
        lastSampleAtRef.current = timestamp;
      }

      drawBars(canvasState.context, canvas, levelsRef.current, canvasState.width, canvasState.height, true);
      animationFrameId = requestAnimationFrame(drawRecordingFrame);
    };

    if (isRecording && analyser) {
      levelsRef.current = [];
      smoothedLevelRef.current = 0;
      lastSampleAtRef.current = 0;
      animationFrameId = requestAnimationFrame(drawRecordingFrame);
    }

    return () => {
      stopped = true;
      resizeObserver?.disconnect();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [analyser, isRecording, theme]);

  return <canvas ref={canvasRef} aria-label="实时录音波形" className="h-full w-full" role="img" />;
};
