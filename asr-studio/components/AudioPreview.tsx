import React from 'react';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import { AudioPreviewControls } from './audio-preview/AudioPreviewControls';
import { useAudioPreviewPlayer } from './audio-preview/useAudioPreviewPlayer';
import { formatAudioFileSize, formatAudioTime } from '../services/audioFileUtils';
import { getAudioSourceUrl } from '../services/remoteAudioFile';
import { EmptyState } from './EmptyState';

interface AudioPreviewProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export const AudioPreview: React.FC<AudioPreviewProps> = ({ file, onFileChange, disabled }) => {
  const {
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
  } = useAudioPreviewPlayer({ file, onFileChange, disabled });
  const isRemoteAudio = Boolean(file && getAudioSourceUrl(file));
  const fileSizeLabel = file ? (isRemoteAudio ? '远程 URL' : formatAudioFileSize(file.size)) : '';

  return (
    <div className="surface-panel w-full min-w-0 max-w-full overflow-hidden">
      <div className="panel-header">
        <div className="min-w-0">
          <p className="eyebrow">Inspect</p>
          <h2 className="panel-title mt-1">音频检查</h2>
        </div>
        {file && <span className="status-pill hidden font-mono sm:inline-flex">{fileSizeLabel}</span>}
      </div>
      <div className="p-4">
        {file ? (
          <div className="flex h-full min-w-0 flex-col justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium text-content-100" title={file.name}>
                    {file.name}
                  </p>
                  <p className="mt-1 text-content-200 sm:hidden">{fileSizeLabel}</p>
                </div>
                <span className="flex-shrink-0 rounded-md bg-base-100 px-2 py-1 font-mono text-content-200">
                  {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                </span>
              </div>
              <div className="surface-inset mt-3 px-2 py-1">
                <div className="relative h-12 w-full">
                  <div
                    ref={waveformRef}
                    className={`h-12 w-full ${isClipping ? 'cursor-crosshair' : 'cursor-pointer'} ${
                      isPlayerReady && !playerError ? 'opacity-100' : 'opacity-35'
                    }`}
                    role="img"
                    aria-label="音频波形"
                  />
                  {playerError && (
                    <div
                      role="alert"
                      className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs font-medium text-red-500"
                    >
                      {playerError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <AudioPreviewControls
              disabled={disabled}
              isMuted={isMuted}
              isClipping={isClipping}
              isLooping={isLooping}
              isPlayerReady={isPlayerReady}
              isPlaying={isPlaying}
              canSaveClip={canSaveClip}
              playbackRate={playbackRate}
              onCyclePlaybackRate={handleCyclePlaybackRate}
              onDownload={handleDownload}
              onClear={handleClear}
              onPlayPause={handlePlayPause}
              onSaveClip={handleSaveClip}
              onSeek={handleSeek}
              onToggleClipping={handleToggleClipping}
              onToggleLoop={handleToggleLoop}
              onToggleMute={handleToggleMute}
            />
          </div>
        ) : (
          <EmptyState icon={<SoundWaveIcon className="h-5 w-5" />} title="等待音频" className="min-h-[132px]" />
        )}
      </div>
    </div>
  );
};
