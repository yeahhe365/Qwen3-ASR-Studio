import { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions';
import { createClippedAudioFile, getAudioPreviewErrorMessage } from '../../services/audioPreviewUtils';
import { downloadFile } from '../../services/downloadFile';
import { getAudioSourceUrl } from '../../services/remoteAudioFile';
import {
  AUDIO_PREVIEW_CLIP_REGION_COLOR,
  AUDIO_PREVIEW_DEFAULT_PLAYBACK_RATE,
  AUDIO_PREVIEW_PLAYBACK_RATES,
  AUDIO_PREVIEW_THEME_VARIABLES,
  AUDIO_PREVIEW_WAVEFORM_OPTIONS,
} from './audioPreviewConfig';

type UseAudioPreviewPlayerOptions = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

export const useAudioPreviewPlayer = ({ file, onFileChange, disabled }: UseAudioPreviewPlayerOptions) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const disableRegionDragSelectionRef = useRef<(() => void) | null>(null);
  const isLoopingRef = useRef(false);
  const disabledRef = useRef(Boolean(disabled));
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(AUDIO_PREVIEW_DEFAULT_PLAYBACK_RATE);
  const [isLooping, setIsLooping] = useState(false);
  const [isClipping, setIsClipping] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [playerError, setPlayerError] = useState('');
  const canSaveClip = Boolean(selectedRegion && selectedRegion.end - selectedRegion.start > 0.05);
  disabledRef.current = Boolean(disabled);

  const disableRegionDragSelection = useCallback(() => {
    disableRegionDragSelectionRef.current?.();
    disableRegionDragSelectionRef.current = null;
  }, []);

  const clearClipSelection = useCallback(() => {
    disableRegionDragSelection();
    regionsPluginRef.current?.clearRegions();
    setIsClipping(false);
    setSelectedRegion(null);
  }, [disableRegionDragSelection]);

  const resetPlayerState = useCallback(() => {
    setIsPlayerReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsMuted(false);
    setPlaybackRate(AUDIO_PREVIEW_DEFAULT_PLAYBACK_RATE);
    setIsLooping(false);
    setPlayerError('');
    clearClipSelection();
  }, [clearClipSelection]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    if (!file || !waveformRef.current) {
      return;
    }

    const sourceUrl = getAudioSourceUrl(file);
    const audioUrl = sourceUrl || URL.createObjectURL(file);

    resetPlayerState();

    let ws: WaveSurfer | null = null;
    let wsRegions: RegionsPlugin | null = null;
    let observer: MutationObserver | null = null;

    const handlePlayerError = (error: unknown) => {
      const message = getAudioPreviewErrorMessage(error);
      if (!message) {
        return;
      }

      setPlayerError(message);
      setIsPlayerReady(false);
      setIsPlaying(false);
      clearClipSelection();
    };

    try {
      const activeWaveSurfer = WaveSurfer.create({
        container: waveformRef.current,
        ...AUDIO_PREVIEW_WAVEFORM_OPTIONS,
        url: audioUrl,
      });
      ws = activeWaveSurfer;
      wavesurferRef.current = activeWaveSurfer;

      wsRegions = activeWaveSurfer.registerPlugin(RegionsPlugin.create());
      regionsPluginRef.current = wsRegions;

      wsRegions.on('region-created', (region) => {
        wsRegions?.getRegions().forEach((otherRegion) => {
          if (otherRegion.id !== region.id) {
            otherRegion.remove();
          }
        });
        setSelectedRegion(region);
      });
      wsRegions.on('region-updated', (region) => setSelectedRegion(region));
      wsRegions.on('region-clicked', (region, event) => {
        event.stopPropagation();
        region.play();
      });

      const setupWaveSurferTheme = () => {
        if (!waveformRef.current) {
          return;
        }

        const style = getComputedStyle(waveformRef.current);
        activeWaveSurfer.setOptions({
          waveColor: style.getPropertyValue(AUDIO_PREVIEW_THEME_VARIABLES.waveColor),
          progressColor: style.getPropertyValue(AUDIO_PREVIEW_THEME_VARIABLES.progressColor),
          cursorColor: style.getPropertyValue(AUDIO_PREVIEW_THEME_VARIABLES.cursorColor),
        });
      };
      setupWaveSurferTheme();

      activeWaveSurfer.on('ready', () => {
        setDuration(activeWaveSurfer.getDuration());
        setIsPlayerReady(true);
        setPlayerError('');
      });
      activeWaveSurfer.on('error', handlePlayerError);
      activeWaveSurfer.on('audioprocess', (time) => setCurrentTime(time));
      activeWaveSurfer.on('play', () => setIsPlaying(true));
      activeWaveSurfer.on('pause', () => setIsPlaying(false));
      activeWaveSurfer.on('finish', () => {
        setCurrentTime(0);
        activeWaveSurfer.seekTo(0);
        if (isLoopingRef.current) {
          void activeWaveSurfer.play();
        } else {
          setIsPlaying(false);
        }
      });

      if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(setupWaveSurferTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (error) {
      handlePlayerError(error);
    }

    return () => {
      observer?.disconnect();
      disableRegionDragSelection();
      try {
        ws?.destroy();
      } catch (error) {
        console.error('Failed to destroy audio preview:', error);
      }
      if (wavesurferRef.current === ws) {
        wavesurferRef.current = null;
      }
      if (regionsPluginRef.current === wsRegions) {
        regionsPluginRef.current = null;
      }
      if (!sourceUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [clearClipSelection, disableRegionDragSelection, file, resetPlayerState]);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    wavesurferRef.current?.pause();
    setIsPlaying(false);
    clearClipSelection();
  }, [clearClipSelection, disabled]);

  const handlePlayPause = useCallback(() => {
    if (!disabledRef.current && isPlayerReady) {
      wavesurferRef.current?.playPause();
    }
  }, [isPlayerReady]);

  const handleSeek = useCallback(
    (seconds: number) => {
      if (!disabledRef.current && !isClipping && isPlayerReady) {
        wavesurferRef.current?.skip(seconds);
      }
    },
    [isClipping, isPlayerReady],
  );

  const handleToggleMute = useCallback(() => {
    const ws = wavesurferRef.current;
    if (disabledRef.current || !ws || !isPlayerReady) {
      return;
    }

    const nextMuted = !isMuted;
    ws.setMuted(nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted, isPlayerReady]);

  const handleCyclePlaybackRate = useCallback(() => {
    const ws = wavesurferRef.current;
    if (disabledRef.current || !ws || !isPlayerReady) {
      return;
    }

    const currentIndex = AUDIO_PREVIEW_PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % AUDIO_PREVIEW_PLAYBACK_RATES.length;
    const nextRate = AUDIO_PREVIEW_PLAYBACK_RATES[nextIndex];
    ws.setPlaybackRate(nextRate, true);
    setPlaybackRate(nextRate);
  }, [isPlayerReady, playbackRate]);

  const handleToggleLoop = useCallback(() => {
    if (disabledRef.current || !isPlayerReady) {
      return;
    }

    setIsLooping((currentIsLooping) => !currentIsLooping);
  }, [isPlayerReady]);

  const handleClear = useCallback(() => {
    if (!disabledRef.current) {
      onFileChange(null);
    }
  }, [onFileChange]);

  const handleDownload = useCallback(() => {
    if (disabledRef.current || !file) {
      return;
    }

    downloadFile(getAudioSourceUrl(file) || file, file.name);
  }, [file]);

  const handleToggleClipping = useCallback(() => {
    if (disabledRef.current || !regionsPluginRef.current || !isPlayerReady) {
      return;
    }

    const nextIsClipping = !isClipping;
    setIsClipping(nextIsClipping);
    if (nextIsClipping) {
      disableRegionDragSelection();
      disableRegionDragSelectionRef.current = regionsPluginRef.current.enableDragSelection({
        color: AUDIO_PREVIEW_CLIP_REGION_COLOR,
      });
      return;
    }

    clearClipSelection();
  }, [clearClipSelection, disableRegionDragSelection, isClipping, isPlayerReady]);

  const handleSaveClip = useCallback(async () => {
    if (disabledRef.current || !wavesurferRef.current || !selectedRegion || !file || !isPlayerReady) {
      return;
    }

    const originalBuffer = wavesurferRef.current.getDecodedData();
    if (!originalBuffer) {
      return;
    }

    const newFile = await createClippedAudioFile({
      sourceBuffer: originalBuffer,
      sourceName: file.name,
      startTime: selectedRegion.start,
      endTime: selectedRegion.end,
    });
    if (!newFile || disabledRef.current) {
      return;
    }

    onFileChange(newFile);
    clearClipSelection();
  }, [clearClipSelection, file, isPlayerReady, onFileChange, selectedRegion]);

  return {
    waveformRef,
    isPlayerReady,
    isPlaying,
    currentTime,
    duration,
    isMuted,
    playbackRate,
    isLooping,
    isClipping,
    canSaveClip,
    playerError,
    handleCyclePlaybackRate,
    handleDownload,
    handleClear,
    handlePlayPause,
    handleSaveClip,
    handleSeek,
    handleToggleClipping,
    handleToggleLoop,
    handleToggleMute,
  };
};
