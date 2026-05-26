import { AsrProvider, type AsrProviderConfig } from '../types';
import { doubaoProviderEntry } from './providers/doubaoRegistry';
import { geminiProviderEntry } from './providers/geminiRegistry';
import { nvidiaNimProviderEntry } from './providers/nvidiaNimRegistry';
import { qwenProviderEntry } from './providers/qwenRegistry';
import { getAudioSourceUrl, isValidHttpUrl } from './remoteAudioFile';
import type {
  ProviderDiagnosticCheck,
  ProviderDiagnosticReport,
  ProviderDiagnosticStatus,
  ProviderMetadata,
  ProviderRegistryEntry,
  ProviderTranscribe,
} from './providerRegistryTypes';

export type {
  ProviderDiagnosticCheck,
  ProviderDiagnosticReport,
  ProviderDiagnosticStatus,
  ProviderMetadata,
  ProviderRegistryEntry,
} from './providerRegistryTypes';

export const getWorstDiagnosticStatus = (checks: ProviderDiagnosticCheck[]): ProviderDiagnosticStatus => {
  if (checks.some((check) => check.status === 'error')) {
    return 'error';
  }

  if (checks.some((check) => check.status === 'warning')) {
    return 'warning';
  }

  return 'ok';
};

const createReport = (checks: ProviderDiagnosticCheck[]): ProviderDiagnosticReport => ({
  status: getWorstDiagnosticStatus(checks),
  checks,
});

const providerRegistryEntries: ProviderRegistryEntry[] = [
  qwenProviderEntry,
  doubaoProviderEntry,
  geminiProviderEntry,
  nvidiaNimProviderEntry,
];

export const asrProviderOrder = providerRegistryEntries.map((entry) => entry.provider);

export const asrProviderMetadata = Object.fromEntries(
  providerRegistryEntries.map((entry) => [entry.provider, entry.metadata]),
) as Record<AsrProvider, ProviderMetadata>;

const providerRegistry = Object.fromEntries(providerRegistryEntries.map((entry) => [entry.provider, entry])) as Record<
  AsrProvider,
  ProviderRegistryEntry
>;

const hasProviderEntry = (provider: unknown): provider is AsrProvider => {
  return typeof provider === 'string' && Object.prototype.hasOwnProperty.call(providerRegistry, provider);
};

const getProviderEntry = (provider: AsrProvider) => providerRegistry[provider] ?? providerRegistry[AsrProvider.QWEN];

export const getAsrProviderLabel = (provider: unknown, fallback = '未知') => {
  return hasProviderEntry(provider) ? providerRegistry[provider].metadata.label : fallback;
};

export const getProviderSummaryDetails = (config: AsrProviderConfig) => {
  const entry = getProviderEntry(config.provider);
  return entry.getSummaryDetails?.(config) ?? entry.metadata.summaryDetails;
};

export const asrProviderMenuOptions = providerRegistryEntries.map((entry) => ({
  provider: entry.provider,
  label: entry.metadata.label,
  model: entry.metadata.model,
  description: entry.metadata.menuDescription,
}));

export const asrProviderSegmentOptions = providerRegistryEntries.map((entry) => ({
  value: entry.provider,
  label: entry.metadata.label,
}));

export const diagnoseProviderConfig = (config: AsrProviderConfig) => {
  return createReport(getProviderEntry(config.provider).diagnose(config));
};

export const getProviderReadinessError = (config: AsrProviderConfig, file: File) => {
  const entry = getProviderEntry(config.provider);
  const audioSourceUrl = getAudioSourceUrl(file);

  if (audioSourceUrl && !entry.supportsRemoteAudio) {
    return '远程音频 URL 仅支持豆包标准版 2.0。请切换到豆包，或上传本地音频文件。';
  }

  return entry.getReadinessError(config, file, audioSourceUrl);
};

export const transcribeWithConfiguredProvider: ProviderTranscribe = (
  audioFile,
  context,
  language,
  enableItn,
  config,
  signal,
) => {
  return getProviderEntry(config.provider).transcribe(audioFile, context, language, enableItn, config, signal);
};

export { isValidHttpUrl };
