export type Theme = 'light' | 'dark';

export enum AsrProvider {
  QWEN = 'qwen',
  DOUBAO = 'doubao',
  GEMINI = 'gemini',
}

export interface AsrProviderConfig {
  provider: AsrProvider;
  qwenApiKey: string;
  doubaoApiKey: string;
  doubaoAccessKey: string;
  geminiApiKey: string;
}

export type Notification = {
  message: string;
  type: 'error' | 'success';
};

export enum Language {
  AUTO = "auto",
  CHINESE = "zh",
  ENGLISH = "en",
  JAPANESE = "ja",
  KOREAN = "ko",
  SPANISH = "es",
  FRENCH = "fr",
  GERMAN = "de",
  ARABIC = "ar",
  ITALIAN = "it",
  RUSSIAN = "ru",
  PORTUGUESE = "pt",
}

export enum CompressionLevel {
  ORIGINAL = 'original',
  MEDIUM = 'medium',
  MINIMUM = 'minimum',
}

export interface HistoryItem {
  id: number;
  fileName: string;
  transcription: string;
  detectedLanguage: string;
  context: string;
  timestamp: number;
  audioFile: File;
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
    documentPictureInPicture?: {
      requestWindow(options?: { width: number; height: number }): Promise<Window>;
      readonly window?: Window;
    };
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
