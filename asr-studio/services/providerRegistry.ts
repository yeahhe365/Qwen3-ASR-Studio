import { AsrProvider, type AsrProviderConfig } from '../types';
import { doubaoProviderEntry } from './providers/doubaoRegistry';
import { geminiProviderEntry } from './providers/geminiRegistry';
import { mainstreamAsrProviderEntry } from './providers/mainstreamAsrRegistry';
import { nvidiaNimProviderEntry } from './providers/nvidiaNimRegistry';
import { qwenProviderEntry } from './providers/qwenRegistry';
import { getAudioSourceUrl, isValidHttpUrl } from './remoteAudioFile';
import type {
  ProviderDiagnosticCheck,
  ProviderDiagnosticReport,
  ProviderDiagnosticStatus,
  ProviderCapabilityMatrixRow,
  ProviderMetadata,
  ProviderRegistryEntry,
  ProviderTranscribe,
} from './providerRegistryTypes';

export type {
  ProviderDiagnosticCheck,
  ProviderDiagnosticReport,
  ProviderDiagnosticStatus,
  ProviderCapabilityMatrixRow,
  ProviderCapabilityStatus,
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
  mainstreamAsrProviderEntry,
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

export const asrProviderCapabilityMatrix: ProviderCapabilityMatrixRow[] = [
  {
    id: 'local-audio',
    label: '本地文件',
    description: '浏览器上传或录音后的音频输入。',
    cells: {
      [AsrProvider.QWEN]: { status: 'supported', label: '支持', detail: 'Base64 Data URL 短音频。' },
      [AsrProvider.DOUBAO]: { status: 'supported', label: '支持', detail: 'Base64 audio.data 或远程 URL。' },
      [AsrProvider.GEMINI]: { status: 'supported', label: '支持', detail: 'inlineData 音频输入。' },
      [AsrProvider.NVIDIA_NIM]: { status: 'supported', label: '支持', detail: 'HTTP multipart 文件。' },
      [AsrProvider.MAINSTREAM]: { status: 'supported', label: '支持', detail: 'multipart / 二进制上传。' },
    },
  },
  {
    id: 'remote-url',
    label: '远程 URL',
    description: '直接提交服务端可访问的音频链接。',
    cells: {
      [AsrProvider.QWEN]: { status: 'planned', label: '待接入', detail: '官方支持 URL，当前 UI 未开放。' },
      [AsrProvider.DOUBAO]: { status: 'supported', label: '支持', detail: '标准版 2.0 audio.url。' },
      [AsrProvider.GEMINI]: { status: 'unsupported', label: '未接', detail: '当前只走本地 inlineData。' },
      [AsrProvider.NVIDIA_NIM]: { status: 'unsupported', label: '未接', detail: '当前只走 multipart 文件。' },
      [AsrProvider.MAINSTREAM]: {
        status: 'partial',
        label: '部分',
        detail: 'AssemblyAI 可直接使用 URL，其余走本地文件。',
      },
    },
  },
  {
    id: 'segments',
    label: '分段/时间戳',
    description: '返回可用于字幕和分段视图的结构化片段。',
    cells: {
      [AsrProvider.QWEN]: { status: 'planned', label: '待接入', detail: '长音频任务可扩展 word/utterance 时间戳。' },
      [AsrProvider.DOUBAO]: { status: 'supported', label: '支持', detail: '解析 utterances 为 segments。' },
      [AsrProvider.GEMINI]: { status: 'partial', label: '提示词', detail: '可提示模型输出，当前未强制结构化。' },
      [AsrProvider.NVIDIA_NIM]: { status: 'partial', label: '取决代理', detail: '仅透传代理返回的文本。' },
      [AsrProvider.MAINSTREAM]: { status: 'supported', label: '支持', detail: '解析 segments / words / utterances。' },
    },
  },
  {
    id: 'realtime',
    label: '实时识别',
    description: '麦克风实时流式识别。',
    cells: {
      [AsrProvider.QWEN]: { status: 'planned', label: '待接入', detail: '官方有 realtime 模型。' },
      [AsrProvider.DOUBAO]: { status: 'supported', label: '支持', detail: '通过同源 WebSocket 代理。' },
      [AsrProvider.GEMINI]: { status: 'planned', label: '待接入', detail: '可后续接 Live API。' },
      [AsrProvider.NVIDIA_NIM]: { status: 'unsupported', label: '未接', detail: '当前没有浏览器实时路径。' },
      [AsrProvider.MAINSTREAM]: { status: 'planned', label: '待接入', detail: '已接离线 API，实时流可后续扩展。' },
    },
  },
  {
    id: 'long-audio',
    label: '长音频',
    description: '官方异步文件任务或本地切片后的长音频处理。',
    cells: {
      [AsrProvider.QWEN]: { status: 'planned', label: '待接入', detail: 'filetrans 异步任务未接。' },
      [AsrProvider.DOUBAO]: { status: 'supported', label: '支持', detail: '标准版异步提交与轮询。' },
      [AsrProvider.GEMINI]: { status: 'partial', label: '待增强', detail: '当前靠本地切片，Files API 未接。' },
      [AsrProvider.NVIDIA_NIM]: { status: 'partial', label: '取决服务', detail: '受自托管或代理限制。' },
      [AsrProvider.MAINSTREAM]: {
        status: 'partial',
        label: '切片/异步',
        detail: '本地切片；AssemblyAI 使用异步任务。',
      },
    },
  },
  {
    id: 'translation',
    label: '英文翻译',
    description: '把非英文语音翻译为英文文本。',
    cells: {
      [AsrProvider.QWEN]: { status: 'unsupported', label: '未接', detail: '当前只做识别。' },
      [AsrProvider.DOUBAO]: { status: 'unsupported', label: '未接', detail: '当前只做识别。' },
      [AsrProvider.GEMINI]: { status: 'partial', label: '提示词', detail: '可提示翻译，当前无专用模式。' },
      [AsrProvider.NVIDIA_NIM]: { status: 'supported', label: '支持', detail: '调用 /v1/audio/translations。' },
      [AsrProvider.MAINSTREAM]: {
        status: 'partial',
        label: '取决模型',
        detail: '当前聚焦转写，Whisper 类可后续接 translations。',
      },
    },
  },
];

export const diagnoseProviderConfig = (config: AsrProviderConfig) => {
  return createReport(getProviderEntry(config.provider).diagnose(config));
};

export const getProviderReadinessError = (config: AsrProviderConfig, file: File) => {
  const entry = getProviderEntry(config.provider);
  const audioSourceUrl = getAudioSourceUrl(file);

  if (audioSourceUrl && !entry.supportsRemoteAudio) {
    return '当前 Provider 不支持远程音频 URL。请切换到豆包或主流模型中的 AssemblyAI，或上传本地音频文件。';
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
