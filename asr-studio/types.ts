export type Theme = 'light' | 'dark';

export enum AsrProvider {
  QWEN = 'qwen',
  DOUBAO = 'doubao',
  GEMINI = 'gemini',
  NVIDIA_NIM = 'nvidia-nim',
  MAINSTREAM = 'mainstream',
}

export interface AsrProviderConfig {
  provider: AsrProvider;
  qwenApiKey: string;
  doubaoApiKey: string;
  doubaoAccessKey: string;
  geminiApiKey: string;
  nvidiaNimBaseUrl: string;
  nvidiaNimApiKey: string;
  nvidiaNimTask: NvidiaNimTask;
  mainstreamAsrModel: MainstreamAsrModel;
  mainstreamAsrApiKey: string;
  mainstreamAsrBaseUrl: string;
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

export enum NvidiaNimTask {
  TRANSCRIBE = 'transcribe',
  TRANSLATE = 'translate',
}

export enum MainstreamAsrModel {
  OPENAI_GPT_4O_TRANSCRIBE = 'openai:gpt-4o-transcribe',
  OPENAI_GPT_4O_MINI_TRANSCRIBE = 'openai:gpt-4o-mini-transcribe',
  OPENAI_GPT_4O_TRANSCRIBE_DIARIZE = 'openai:gpt-4o-transcribe-diarize',
  OPENAI_WHISPER_1 = 'openai:whisper-1',
  GROQ_WHISPER_LARGE_V3_TURBO = 'groq:whisper-large-v3-turbo',
  GROQ_WHISPER_LARGE_V3 = 'groq:whisper-large-v3',
  GROQ_DISTIL_WHISPER_LARGE_V3_EN = 'groq:distil-whisper-large-v3-en',
  DEEPGRAM_NOVA_3 = 'deepgram:nova-3',
  DEEPGRAM_NOVA_3_MEDICAL = 'deepgram:nova-3-medical',
  ASSEMBLYAI_UNIVERSAL_3_PRO = 'assemblyai:universal-3-pro',
  ASSEMBLYAI_UNIVERSAL_2 = 'assemblyai:universal-2',
  ELEVENLABS_SCRIBE_V2 = 'elevenlabs:scribe_v2',
  ELEVENLABS_SCRIBE_V1 = 'elevenlabs:scribe_v1',
  MISTRAL_VOXTRAL_MINI_LATEST = 'mistral:voxtral-mini-latest',
  FIREWORKS_WHISPER_V3 = 'fireworks:whisper-v3',
  FIREWORKS_WHISPER_V3_TURBO = 'fireworks:whisper-v3-turbo',
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
  nvidiaNimTask?: NvidiaNimTask;
  mainstreamAsrModel?: MainstreamAsrModel;
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
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
