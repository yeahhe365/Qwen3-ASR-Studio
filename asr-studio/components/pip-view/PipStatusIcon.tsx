import React from 'react';
import { CheckIcon } from '../icons/CheckIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { LoaderIcon } from '../icons/LoaderIcon';
import { MicrophoneIcon } from '../icons/MicrophoneIcon';
import { StopIcon } from '../icons/StopIcon';
import type { PipViewStatus } from './pipViewState';

interface PipStatusIconProps {
  status: PipViewStatus;
}

export const PipStatusIcon: React.FC<PipStatusIconProps> = ({ status }) => {
  const iconClass = 'h-5 w-5 text-current';

  if (status === 'requesting' || status === 'processing') {
    return <LoaderIcon className="h-5 w-5" />;
  }

  if (status === 'recording') {
    return <StopIcon className={iconClass} />;
  }

  if (status === 'success') {
    return <CheckIcon className={iconClass} />;
  }

  if (status === 'error') {
    return <CloseIcon className={iconClass} />;
  }

  return <MicrophoneIcon className={iconClass} />;
};
