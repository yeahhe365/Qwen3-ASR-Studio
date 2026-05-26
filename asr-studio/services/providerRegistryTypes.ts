import type { AsrProvider, AsrProviderConfig, Language, TranscriptionResult } from '../types';

export type ProviderMetadata = {
  label: string;
  model: string;
  menuDescription: string;
  summaryTitle: string;
  summaryDetails: string;
  summaryNote?: string;
  capabilities: Array<{
    label: string;
    value: string;
  }>;
};

export type ProviderDiagnosticStatus = 'ok' | 'warning' | 'error';

export type ProviderDiagnosticCheck = {
  label: string;
  status: ProviderDiagnosticStatus;
  detail: string;
};

export type ProviderDiagnosticReport = {
  status: ProviderDiagnosticStatus;
  checks: ProviderDiagnosticCheck[];
};

export type ProviderTranscribe = (
  audioFile: File,
  context: string,
  language: Language,
  enableItn: boolean,
  config: AsrProviderConfig,
  signal: AbortSignal,
) => Promise<TranscriptionResult>;

export type ProviderRegistryEntry = {
  provider: AsrProvider;
  metadata: ProviderMetadata;
  supportsRemoteAudio?: boolean;
  getSummaryDetails?: (config: AsrProviderConfig) => string;
  diagnose: (config: AsrProviderConfig) => ProviderDiagnosticCheck[];
  getReadinessError: (config: AsrProviderConfig, file: File, audioSourceUrl: string | undefined) => string | null;
  transcribe: ProviderTranscribe;
};
