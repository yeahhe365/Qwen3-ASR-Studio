import React from 'react';
import { MicrophoneIcon } from '../icons/MicrophoneIcon';
import { StopIcon } from '../icons/StopIcon';
import { getAudioRecorderButtonText, isAudioRecorderRecording, type AudioRecorderStatus } from './audioRecorderState';

interface AudioRecorderButtonContentProps {
  status: AudioRecorderStatus;
}

export const AudioRecorderButtonContent: React.FC<AudioRecorderButtonContentProps> = ({ status }) => {
  const Icon = isAudioRecorderRecording(status) || status === 'stopping' ? StopIcon : MicrophoneIcon;

  return (
    <>
      <Icon className="mr-2 h-5 w-5 flex-shrink-0" />
      <span className="truncate">{getAudioRecorderButtonText(status)}</span>
    </>
  );
};
