export type AudioRecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopping';

const ACTIVE_RECORDER_BUTTON_CLASSES = '!bg-red-600 !text-white hover:!bg-red-700 focus:!ring-red-500';

export const isAudioRecorderRecording = (status: AudioRecorderStatus) => {
  return status === 'recording';
};

export const isAudioRecorderBusy = (status: AudioRecorderStatus) => {
  return status === 'requesting' || status === 'stopping';
};

export const getAudioRecorderStatusLabel = (status: AudioRecorderStatus) => {
  return isAudioRecorderRecording(status) ? 'REC' : 'READY';
};

export const getAudioRecorderStatusDotClassName = (status: AudioRecorderStatus) => {
  return `h-2 w-2 rounded-full ${isAudioRecorderRecording(status) ? 'animate-pulsing-dot bg-red-500' : 'bg-base-300'}`;
};

export const getAudioRecorderButtonTitle = (status: AudioRecorderStatus) => {
  return status === 'idle' ? '按住空格键快捷录音' : '松开空格键快捷停止';
};

export const getAudioRecorderButtonAriaLabel = (status: AudioRecorderStatus) => {
  if (status === 'recording') {
    return '停止录音';
  }

  if (status === 'requesting') {
    return '取消录音准备';
  }

  if (status === 'stopping') {
    return '正在停止录音';
  }

  return '开始录音';
};

export const getAudioRecorderButtonClassName = (status: AudioRecorderStatus) => {
  return `primary-action h-12 w-full ${status === 'idle' ? '' : ACTIVE_RECORDER_BUTTON_CLASSES} disabled:opacity-50`;
};

export const getAudioRecorderButtonText = (status: AudioRecorderStatus) => {
  if (status === 'requesting') {
    return '准备中';
  }

  if (status === 'stopping') {
    return '正在停止';
  }

  if (status === 'recording') {
    return '停止录音';
  }

  return '开始';
};
