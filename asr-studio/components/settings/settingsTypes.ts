import type React from 'react';
import type { AppSettingsSetters, AppSettingsValues } from '../../hooks/useAppSettings';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  values: AppSettingsValues;
  setters: AppSettingsSetters;
  audioDevices: MediaDeviceInfo[];
  onClearHistory: () => Promise<boolean>;
  onClearTranscriptionCache: () => Promise<boolean>;
  onClearRecordingCache: () => Promise<boolean>;
  onImportHistory: (file: File) => Promise<number>;
  onRestoreDefaults: () => void | Promise<void>;
  storageEstimate: { usage: number; quota: number } | null;
  disabled?: boolean;
  canInstall: boolean;
  onInstallApp: () => void | Promise<void>;
}

export type SettingTab = 'api' | 'recognition' | 'interface' | 'data' | 'about';

export type SettingsDataOperation =
  | 'install'
  | 'importHistory'
  | 'clearTranscriptionCache'
  | 'clearRecordingCache'
  | 'clearHistory'
  | 'restoreDefaults';

type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

export interface SettingTabDescriptor {
  id: SettingTab;
  label: string;
  description: string;
  Icon: IconComponent;
}
