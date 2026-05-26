export type Theme = 'light' | 'dark';

export enum AsrProvider {
  QWEN = 'qwen',
  DOUBAO = 'doubao',
  GEMINI = 'gemini',
  NVIDIA_NIM = 'nvidia-nim',
}

export interface AsrProviderConfig {
  provider: AsrProvider;
  qwenApiKey: string;
  doubaoApiKey: string;
  doubaoAccessKey: string;
  geminiApiKey: string;
  nvidiaNimBaseUrl: string;
  nvidiaNimApiKey: string;
}

export type Notification = {
  message: string;
  type: 'error' | 'success';
};

export enum Language {
  AUTO = 'auto',
  CHINESE = 'zh',
  ENGLISH = 'en',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ARABIC = 'ar',
  ITALIAN = 'it',
  RUSSIAN = 'ru',
  PORTUGUESE = 'pt',
}

export enum CompressionLevel {
  ORIGINAL = 'original',
  MEDIUM = 'medium',
  MINIMUM = 'minimum',
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime?: number;
  endTime?: number;
  speaker?: string;
  confidence?: number;
}

export interface TranscriptionResult {
  transcription: string;
  detectedLanguage: string;
  segments?: TranscriptionSegment[];
  provider?: AsrProvider;
  createdAt?: number;
}

export type TranscriptionQueueStatus = 'pending' | 'processing' | 'done' | 'error' | 'cancelled';

export interface TranscriptionQueueItem {
  id: string;
  file: File;
  fileName: string;
  status: TranscriptionQueueStatus;
  message?: string;
}

export interface HistoryItem {
  id: number;
  fileName: string;
  transcription: string;
  detectedLanguage: string;
  context: string;
  timestamp: number;
  audioFile?: File;
  audioUrl?: string;
  segments?: TranscriptionSegment[];
  provider?: AsrProvider;
  language?: Language;
  enableItn?: boolean;
  compressionLevel?: CompressionLevel;
  trimSilence?: boolean;
  enableLongAudioChunking?: boolean;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    documentPictureInPicture?: {
      requestWindow(options?: { width: number; height: number }): Promise<Window>;
      readonly window?: Window;
    };
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
