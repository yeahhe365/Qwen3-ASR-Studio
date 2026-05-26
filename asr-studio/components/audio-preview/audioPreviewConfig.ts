export const AUDIO_PREVIEW_PLAYBACK_RATES = [1, 1.5, 2, 0.5] as const;
export const AUDIO_PREVIEW_DEFAULT_PLAYBACK_RATE = AUDIO_PREVIEW_PLAYBACK_RATES[0];

export const AUDIO_PREVIEW_WAVEFORM_OPTIONS = {
  height: 40,
  waveColor: 'rgba(209, 213, 219, 0.6)',
  progressColor: '#10b981',
  cursorColor: 'rgb(243, 244, 246)',
  barWidth: 2,
  barGap: 2,
  barRadius: 2,
} as const;

export const AUDIO_PREVIEW_THEME_VARIABLES = {
  waveColor: '--color-content-200',
  progressColor: '--color-brand-primary',
  cursorColor: '--color-content-100',
} as const;

export const AUDIO_PREVIEW_CLIP_REGION_COLOR = 'rgba(16, 185, 129, 0.2)';
