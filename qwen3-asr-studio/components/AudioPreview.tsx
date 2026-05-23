import React, { useState, useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import { CloseIcon } from './icons/CloseIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { VolumeUpIcon } from './icons/VolumeUpIcon';
import { VolumeOffIcon } from './icons/VolumeOffIcon';
import { BackwardIcon } from './icons/BackwardIcon';
import { FastForwardIcon } from './icons/FastForwardIcon';
import { RetryIcon } from './icons/RetryIcon';
import { ScissorsIcon } from './icons/ScissorsIcon';
import { bufferToWav } from '../services/audioService';
import { EmptyState } from './EmptyState';

interface AudioPreviewProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatTime = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds || 0);
  return date.toISOString().substring(14, 19);
};

export const AudioPreview: React.FC<AudioPreviewProps> = ({ file, onFileChange, disabled }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isClipping, setIsClipping] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  
  const playbackRates = [1, 1.5, 2, 0.5];

  useEffect(() => {
    if (!file || !waveformRef.current) return;
    
    setIsPlayerReady(false);
    setIsClipping(false);
    setSelectedRegion(null);

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      height: 40,
      waveColor: 'rgba(209, 213, 219, 0.6)', // base-300
      progressColor: '#10b981', // brand-primary
      cursorColor: 'rgb(243, 244, 246)', // content-100 dark
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      url: URL.createObjectURL(file),
    });
    wavesurferRef.current = ws;

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    regionsPluginRef.current = wsRegions;

    wsRegions.on('region-created', (region) => {
        wsRegions.getRegions().forEach(r => {
            if (r.id !== region.id) {
                r.remove();
            }
        });
        setSelectedRegion(region);
    });

    wsRegions.on('region-updated', (region) => {
        setSelectedRegion(region);
    });

    wsRegions.on('region-clicked', (region, e) => {
        e.stopPropagation();
        region.play();
    });

    const setupWaveSurfer = () => {
        if (!waveformRef.current) return;
        const style = getComputedStyle(waveformRef.current);
        ws.setOptions({
            waveColor: style.getPropertyValue('--color-content-200'),
            progressColor: style.getPropertyValue('--color-brand-primary'),
            cursorColor: style.getPropertyValue('--color-content-100'),
        });
    }
    setupWaveSurfer();
    
    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setIsPlayerReady(true);
    });
    ws.on('audioprocess', (time) => setCurrentTime(time));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if(!isLooping) ws.seekTo(0);
    });

    const observer = new MutationObserver(setupWaveSurfer);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      ws.destroy();
      observer.disconnect();
    };
  }, [file, isLooping]);

  const handlePlayPause = useCallback(() => wavesurferRef.current?.playPause(), []);
  const handleSeek = (seconds: number) => () => {
      if (!isClipping) wavesurferRef.current?.skip(seconds);
  }
  const handleToggleMute = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const newMuted = !isMuted;
    ws.setMuted(newMuted);
    setIsMuted(newMuted);
    setVolume(newMuted ? 0 : 1);
  }, [isMuted]);

  const handleCyclePlaybackRate = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackRates.length;
    const newRate = playbackRates[nextIndex];
    ws.setPlaybackRate(newRate, true);
    setPlaybackRate(newRate);
  }, [playbackRate, playbackRates]);

  const handleToggleLoop = useCallback(() => setIsLooping(prev => !prev), []);

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onFileChange(null);
  };

  const handleDownload = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleClipping = useCallback(() => {
    if (!regionsPluginRef.current) return;
    const clipping = !isClipping;
    setIsClipping(clipping);
    if (clipping) {
        regionsPluginRef.current.enableDragSelection({
            color: 'rgba(16, 185, 129, 0.2)',
        });
    } else {
        regionsPluginRef.current.disableDragSelection();
        regionsPluginRef.current.clearRegions();
        setSelectedRegion(null);
    }
  }, [isClipping]);

  const handleSaveClip = useCallback(async () => {
    if (!wavesurferRef.current || !selectedRegion || !file) return;

    const originalBuffer = wavesurferRef.current.getDecodedData();
    if (!originalBuffer) return;

    const sampleRate = originalBuffer.sampleRate;
    const numChannels = originalBuffer.numberOfChannels;
    const startSample = Math.floor(selectedRegion.start * sampleRate);
    const endSample = Math.floor(selectedRegion.end * sampleRate);
    const clippedLength = endSample - startSample;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const clippedBuffer = audioContext.createBuffer(numChannels, clippedLength, sampleRate);

    for (let i = 0; i < numChannels; i++) {
        const originalData = originalBuffer.getChannelData(i);
        const clippedData = clippedBuffer.getChannelData(i);
        const segment = originalData.subarray(startSample, endSample);
        clippedData.set(segment);
    }
    
    await audioContext.close();

    const wavBlob = bufferToWav(clippedBuffer);
    const newFileName = `${file.name.replace(/\.[^/.]+$/, "")}_clipped.wav`;
    const newFile = new File([wavBlob], newFileName, { type: 'audio/wav' });

    onFileChange(newFile);
    setIsClipping(false);
    setSelectedRegion(null);
  }, [file, selectedRegion, onFileChange]);

  const controlButtonClasses = "p-1.5 rounded-full text-content-200 hover:bg-base-300/50 hover:text-content-100 disabled:opacity-50";

  return (
    <div className="flex min-w-0 flex-col justify-center rounded-lg border border-base-300 bg-base-200 p-4 shadow-sm sm:min-h-[144px]">
      {file ? (
        <div className={`flex h-full min-w-0 flex-col justify-between gap-3 transition-opacity duration-300 ${isPlayerReady ? 'opacity-100' : 'opacity-0'}`}>
            <div className="min-w-0">
                <div className="flex justify-between items-baseline text-xs">
                     <p className="font-medium text-content-100 truncate" title={file.name}>
                        {file.name}
                    </p>
                    <span className="font-mono text-content-200 ml-2 flex-shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <div ref={waveformRef} className={`w-full h-10 mt-3 ${isClipping ? 'cursor-crosshair' : 'cursor-pointer'}`} />
            </div>

            <div className="grid gap-2 pt-1 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <button onClick={handleToggleMute} title={isMuted ? "取消静音" : "静音"} className={controlButtonClasses} disabled={disabled}>
                        {isMuted ? <VolumeOffIcon className="w-4 h-4" /> : <VolumeUpIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={handleCyclePlaybackRate} title={`播放速度: ${playbackRate}x`} className="px-2 py-0.5 w-10 text-xs font-semibold rounded-full text-content-200 hover:bg-base-300/50 hover:text-content-100 disabled:opacity-50" disabled={disabled}>
                        {playbackRate}x
                    </button>
                    {isClipping && (
                      <button onClick={handleSaveClip} disabled={!selectedRegion || disabled} title="保存剪辑" className="px-2 py-0.5 text-xs font-semibold rounded-full text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-base-300 disabled:text-content-200 disabled:cursor-not-allowed">
                        保存
                      </button>
                    )}
                </div>
                <div className="flex min-w-0 items-center justify-center gap-1">
                    <button onClick={handleSeek(-5)} title="快退5秒" className={controlButtonClasses} disabled={disabled || isClipping}>
                        <BackwardIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handlePlayPause} title={isPlaying ? "暂停" : "播放"} className="p-2 w-10 h-10 flex-shrink-0 rounded-full text-content-100 bg-base-300/50 hover:bg-base-300 disabled:opacity-50 flex items-center justify-center" disabled={disabled || !isPlayerReady}>
                        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={handleSeek(5)} title="快进5秒" className={controlButtonClasses} disabled={disabled || isClipping}>
                        <FastForwardIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-1 sm:justify-end">
                    <button onClick={handleToggleLoop} title="循环播放" className={`${controlButtonClasses} ${isLooping ? 'text-brand-primary' : ''}`} disabled={disabled}>
                        <RetryIcon className="w-4 h-4" />
                    </button>
                    <button onClick={handleToggleClipping} title="修剪音频" className={`${controlButtonClasses} ${isClipping ? 'text-brand-primary bg-base-300/50' : ''}`} disabled={disabled}>
                        <ScissorsIcon className="w-4 h-4" />
                    </button>
                    <button onClick={handleDownload} className={controlButtonClasses} disabled={disabled} title="下载音频">
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button onClick={handleClear} className={controlButtonClasses} disabled={disabled} title="清除音频">
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <EmptyState
          icon={<SoundWaveIcon className="h-5 w-5" />}
          title="等待音频"
          description="录音或上传后，可在这里播放、剪辑和检查波形。"
          className="min-h-[100px] sm:min-h-[132px]"
        />
      )}
    </div>
  );
};
