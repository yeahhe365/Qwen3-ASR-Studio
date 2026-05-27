import { MAINSTREAM_ASR_MODEL_LIBRARY_NAME } from '../../constants';
import { AsrProvider, Language } from '../../types';
import { isValidHttpUrl } from '../remoteAudioFile';
import type { ProviderRegistryEntry } from '../providerRegistryTypes';
import {
  getMainstreamAsrModelDescriptor,
  mainstreamAsrModelDescriptors,
  mainstreamAsrModelOrder,
} from './mainstreamAsrCatalog';
import {
  normalizeMainstreamAsrBaseUrl,
  resolveMainstreamAsrEndpoint,
  transcribeWithMainstreamAsr,
} from './mainstreamAsrProvider';

const getConfiguredDescriptor = (config: Parameters<ProviderRegistryEntry['diagnose']>[0]) => {
  return getMainstreamAsrModelDescriptor(config.mainstreamAsrModel);
};

export const mainstreamAsrProviderEntry: ProviderRegistryEntry = {
  provider: AsrProvider.MAINSTREAM,
  supportsRemoteAudio: true,
  metadata: {
    label: '主流模型',
    model: MAINSTREAM_ASR_MODEL_LIBRARY_NAME,
    menuDescription: 'OpenAI / Groq / Deepgram / AssemblyAI / ElevenLabs / Mistral / Fireworks',
    summaryTitle: MAINSTREAM_ASR_MODEL_LIBRARY_NAME,
    summaryDetails: `${mainstreamAsrModelOrder.length} 个主流 ASR 模型 · OpenAI-compatible + 专用 REST 适配器`,
    summaryNote: '同一个入口支持多个厂商。选择模型后填写对应厂商的 API Key；Base URL 留空会使用官方端点。',
    capabilities: [
      { label: '模型', value: 'OpenAI、Groq、Deepgram、AssemblyAI、ElevenLabs、Mistral、Fireworks' },
      { label: '输入', value: '本地文件 multipart / 二进制上传' },
      { label: '分段', value: 'segments / words / utterances 自动映射' },
      { label: '扩展', value: '支持自定义兼容端点' },
    ],
  },
  getSummaryDetails: (config) => {
    const descriptor = getConfiguredDescriptor(config);
    return `${descriptor.label} · ${descriptor.modelName} · ${resolveMainstreamAsrEndpoint(
      descriptor,
      config.mainstreamAsrBaseUrl,
    )}`;
  },
  diagnose: (config) => {
    const descriptor = getConfiguredDescriptor(config);
    const normalizedBaseUrl = normalizeMainstreamAsrBaseUrl(config.mainstreamAsrBaseUrl);
    const hasValidCustomBaseUrl = !normalizedBaseUrl || isValidHttpUrl(normalizedBaseUrl);

    return [
      {
        label: '模型',
        status: 'ok',
        detail: `${descriptor.label}：${descriptor.capability}。${descriptor.notes}`,
      },
      {
        label: 'API Key',
        status: config.mainstreamAsrApiKey.trim() ? 'ok' : 'error',
        detail: config.mainstreamAsrApiKey.trim()
          ? '已填写当前模型厂商的 API Key。'
          : `需要填写 ${descriptor.label} 对应厂商的 API Key。`,
      },
      {
        label: 'Base URL',
        status: hasValidCustomBaseUrl ? 'ok' : 'error',
        detail: normalizedBaseUrl
          ? `将调用自定义端点 ${normalizedBaseUrl}。`
          : `将调用官方端点 ${descriptor.endpoint}。`,
      },
      {
        label: '语言与分段',
        status: descriptor.requiresEnglish ? 'warning' : 'ok',
        detail: descriptor.requiresEnglish
          ? '该模型面向英文音频；非英文内容请切换到多语言模型。'
          : `${descriptor.supportsLanguage ? '支持指定语言' : '不接收 language 参数'}，${
              descriptor.supportsSegments ? '会尝试解析时间戳/分段' : '仅返回纯文本'
            }。`,
      },
    ];
  },
  getReadinessError: (config, _file, audioSourceUrl) => {
    const descriptor = getConfiguredDescriptor(config);
    const normalizedBaseUrl = normalizeMainstreamAsrBaseUrl(config.mainstreamAsrBaseUrl);
    if (!config.mainstreamAsrApiKey.trim()) {
      return `${descriptor.label} API Key 未设置。请在设置中配置。`;
    }

    if (normalizedBaseUrl && !isValidHttpUrl(normalizedBaseUrl)) {
      return '主流 ASR 自定义 Base URL 必须是 http:// 或 https:// 地址。';
    }

    if (audioSourceUrl && descriptor.transport !== 'assemblyai') {
      return '远程音频 URL 目前仅支持豆包和 AssemblyAI 模型；其他主流模型请上传本地音频文件。';
    }

    return null;
  },
  transcribe: (audioFile, context, language, enableItn, config, signal) =>
    transcribeWithMainstreamAsr(
      audioFile,
      context,
      language,
      enableItn,
      {
        model: config.mainstreamAsrModel,
        apiKey: config.mainstreamAsrApiKey,
        baseUrl: config.mainstreamAsrBaseUrl,
      },
      signal,
    ),
};

export const getMainstreamAsrModelOptions = () =>
  mainstreamAsrModelOrder.map((model) => {
    const descriptor = mainstreamAsrModelDescriptors[model];
    return {
      value: descriptor.model,
      label: descriptor.label,
      vendor: descriptor.vendor,
      capability: descriptor.capability,
    };
  });

export const getMainstreamLanguageWarning = (
  language: Language,
  config: Parameters<ProviderRegistryEntry['diagnose']>[0],
) => {
  const descriptor = getConfiguredDescriptor(config);
  return descriptor.requiresEnglish && language !== Language.AUTO && language !== Language.ENGLISH
    ? `${descriptor.label} 仅适合英文音频。`
    : null;
};
