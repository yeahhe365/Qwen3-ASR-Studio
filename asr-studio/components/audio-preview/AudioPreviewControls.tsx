import React from 'react';
import { BackwardIcon } from '../icons/BackwardIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { FastForwardIcon } from '../icons/FastForwardIcon';
import { PauseIcon } from '../icons/PauseIcon';
import { PlayIcon } from '../icons/PlayIcon';
import { RetryIcon } from '../icons/RetryIcon';
import { ScissorsIcon } from '../icons/ScissorsIcon';
import { VolumeOffIcon } from '../icons/VolumeOffIcon';
import { VolumeUpIcon } from '../icons/VolumeUpIcon';

const controlButtonClasses = 'icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-50';

interface AudioPreviewControlsProps {
  disabled?: boolean;
  isMuted: boolean;
  isClipping: boolean;
  isLooping: boolean;
  isPlayerReady: boolean;
  isPlaying: boolean;
  canSaveClip: boolean;
  playbackRate: number;
  onCyclePlaybackRate: () => void;
  onDownload: () => void;
  onClear: () => void;
  onPlayPause: () => void;
  onSaveClip: () => void;
  onSeek: (seconds: number) => void;
  onToggleClipping: () => void;
  onToggleLoop: () => void;
  onToggleMute: () => void;
}

export const AudioPreviewControls: React.FC<AudioPreviewControlsProps> = ({
  disabled,
  isMuted,
  isClipping,
  isLooping,
  isPlayerReady,
  isPlaying,
  canSaveClip,
  playbackRate,
  onCyclePlaybackRate,
  onDownload,
  onClear,
  onPlayPause,
  onSaveClip,
  onSeek,
  onToggleClipping,
  onToggleLoop,
  onToggleMute,
}) => (
  <div className="grid gap-2 pt-1 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={onToggleMute}
        title={isMuted ? '取消静音' : '静音'}
        aria-label={isMuted ? '取消静音' : '静音'}
        className={controlButtonClasses}
        disabled={disabled || !isPlayerReady}
      >
        {isMuted ? <VolumeOffIcon className="h-4 w-4" /> : <VolumeUpIcon className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onCyclePlaybackRate}
        title={`播放速度: ${playbackRate}x`}
        aria-label={`切换播放速度，当前 ${playbackRate}x`}
        className="icon-button h-8 w-11 px-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || !isPlayerReady}
      >
        {playbackRate}x
      </button>
      {isClipping && (
        <button
          type="button"
          onClick={onSaveClip}
          disabled={!canSaveClip || disabled}
          title="保存剪辑"
          aria-label="保存剪辑"
          className="h-8 rounded-md bg-brand-primary px-2.5 text-xs font-semibold text-[var(--theme-text-accent)] hover:bg-brand-secondary disabled:cursor-not-allowed disabled:bg-base-300 disabled:text-content-200"
        >
          保存
        </button>
      )}
    </div>

    <div className="flex min-w-0 items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onSeek(-5)}
        title="快退5秒"
        aria-label="快退5秒"
        className={controlButtonClasses}
        disabled={disabled || isClipping || !isPlayerReady}
      >
        <BackwardIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        title={isPlaying ? '暂停' : '播放'}
        aria-label={isPlaying ? '暂停' : '播放'}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-content-100 p-2 text-base-200 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-base-300 disabled:text-content-200 disabled:opacity-70"
        disabled={disabled || !isPlayerReady}
      >
        {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={() => onSeek(5)}
        title="快进5秒"
        aria-label="快进5秒"
        className={controlButtonClasses}
        disabled={disabled || isClipping || !isPlayerReady}
      >
        <FastForwardIcon className="h-5 w-5" />
      </button>
    </div>

    <div className="flex min-w-0 flex-wrap items-center gap-1 sm:justify-end">
      <button
        type="button"
        onClick={onToggleLoop}
        title="循环播放"
        aria-label={isLooping ? '关闭循环播放' : '开启循环播放'}
        className={`${controlButtonClasses} ${isLooping ? 'text-brand-primary' : ''}`}
        disabled={disabled || !isPlayerReady}
      >
        <RetryIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggleClipping}
        title="修剪音频"
        aria-label={isClipping ? '退出修剪音频' : '修剪音频'}
        className={`${controlButtonClasses} ${isClipping ? 'bg-base-300/50 text-brand-primary' : ''}`}
        disabled={disabled || !isPlayerReady}
      >
        <ScissorsIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDownload}
        className={controlButtonClasses}
        disabled={disabled}
        title="下载音频"
        aria-label="下载音频"
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onClear}
        className={controlButtonClasses}
        disabled={disabled}
        title="清除音频"
        aria-label="清除音频"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
);
