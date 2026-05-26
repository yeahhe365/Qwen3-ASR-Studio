export type PipViewStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'success' | 'error';

const PIP_BUTTON_BASE_CLASSES =
  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary focus:ring-offset-base-100 disabled:cursor-not-allowed disabled:opacity-50';

export const isPipBusy = (status: PipViewStatus) => {
  return status === 'requesting' || status === 'recording' || status === 'processing';
};

export const canCancelPipRecording = (status: PipViewStatus) => {
  return status === 'requesting' || status === 'recording';
};

export const canStartPipRecording = (status: PipViewStatus, disabled: boolean) => {
  return !disabled && (status === 'idle' || status === 'success' || status === 'error');
};

export const isPipPrimaryButtonDisabled = (status: PipViewStatus, disabled: boolean) => {
  return status === 'processing' || (disabled && !canCancelPipRecording(status));
};

export const getPipPrimaryButtonLabel = (status: PipViewStatus, disabled: boolean) => {
  if (status === 'requesting') {
    return '取消录音准备';
  }

  if (status === 'recording') {
    return '停止录音';
  }

  if (status === 'processing') {
    return '正在识别';
  }

  return disabled ? '主窗口识别中' : '录音';
};

export const getPipPrimaryButtonTitle = (status: PipViewStatus, disabled: boolean) => {
  return disabled && !canCancelPipRecording(status) ? '主窗口识别进行中' : undefined;
};

export const getPipPrimaryButtonClassName = (status: PipViewStatus) => {
  if (status === 'idle') {
    return `${PIP_BUTTON_BASE_CLASSES} bg-brand-primary text-[var(--theme-text-accent)] animate-pulse-idle`;
  }

  if (status === 'recording') {
    return `${PIP_BUTTON_BASE_CLASSES} bg-red-600 text-white animate-pulse-custom`;
  }

  if (status === 'error') {
    return `${PIP_BUTTON_BASE_CLASSES} bg-red-600 text-white`;
  }

  if (status === 'success') {
    return `${PIP_BUTTON_BASE_CLASSES} bg-green-600 text-white`;
  }

  return `${PIP_BUTTON_BASE_CLASSES} bg-brand-primary text-[var(--theme-text-accent)]`;
};

export const getPipMessageClassName = (status: PipViewStatus) => {
  const textColor = status === 'success' || status === 'error' ? 'text-content-100' : 'text-content-200';
  return `ml-4 w-full border-none bg-transparent p-0 text-2xl font-semibold placeholder-content-200 focus:ring-0 ${textColor}`;
};
