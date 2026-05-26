import {
  NVIDIA_HOSTED_GRPC_SERVER,
  NVIDIA_NIM_ASR_MODEL,
  NVIDIA_NIM_TRANSCRIPTIONS_PATH,
  NVIDIA_WHISPER_LARGE_V3_FUNCTION_ID,
} from '../../constants';
import { AsrProvider } from '../../types';
import { isValidHttpUrl } from '../remoteAudioFile';
import type { ProviderRegistryEntry } from '../providerRegistryTypes';
import { normalizeNvidiaNimBaseUrl, transcribeWithNvidiaNim } from './nvidiaNimProvider';

export const nvidiaNimProviderEntry: ProviderRegistryEntry = {
  provider: AsrProvider.NVIDIA_NIM,
  metadata: {
    label: 'NVIDIA',
    model: NVIDIA_NIM_ASR_MODEL,
    menuDescription: 'Whisper Large v3',
    summaryTitle: 'NVIDIA NIM Whisper Large v3',
    summaryDetails: `${NVIDIA_NIM_ASR_MODEL} · Hosted gRPC ${NVIDIA_HOSTED_GRPC_SERVER} · function-id ${NVIDIA_WHISPER_LARGE_V3_FUNCTION_ID}`,
    summaryNote:
      'NVIDIA 托管 API 是 gRPC/Riva，浏览器不能直接 fetch 调用；下面的 HTTP Base URL 只用于自托管 NIM 容器或后端代理。',
    capabilities: [
      { label: '输入', value: 'HTTP multipart 文件' },
      { label: '部署', value: '自托管 NIM / 后端代理' },
      { label: '模型', value: 'Whisper Large v3' },
      { label: '时间戳', value: '取决于代理响应' },
    ],
  },
  getSummaryDetails: (config) => {
    const trimmedBaseUrl = config.nvidiaNimBaseUrl.trim();
    return trimmedBaseUrl
      ? `${NVIDIA_NIM_ASR_MODEL} · ${trimmedBaseUrl}${NVIDIA_NIM_TRANSCRIPTIONS_PATH}`
      : `${NVIDIA_NIM_ASR_MODEL} · Hosted gRPC ${NVIDIA_HOSTED_GRPC_SERVER} · function-id ${NVIDIA_WHISPER_LARGE_V3_FUNCTION_ID}`;
  },
  diagnose: (config) => {
    const normalizedBaseUrl = normalizeNvidiaNimBaseUrl(config.nvidiaNimBaseUrl);
    const hasValidBaseUrl = Boolean(normalizedBaseUrl && isValidHttpUrl(normalizedBaseUrl));
    return [
      {
        label: 'HTTP Base URL',
        status: hasValidBaseUrl ? 'ok' : 'error',
        detail: hasValidBaseUrl
          ? `将调用 ${normalizedBaseUrl}${NVIDIA_NIM_TRANSCRIPTIONS_PATH}。`
          : '需要填写自托管 NIM 或后端代理的 HTTP Base URL。',
      },
      {
        label: 'API Key',
        status: config.nvidiaNimApiKey.trim() ? 'ok' : 'warning',
        detail: config.nvidiaNimApiKey.trim()
          ? '已填写 Bearer Token。'
          : '未填写 Token；仅适用于无鉴权的本地 NIM 或代理。',
      },
    ];
  },
  getReadinessError: (config) => {
    const normalizedBaseUrl = normalizeNvidiaNimBaseUrl(config.nvidiaNimBaseUrl);
    if (!normalizedBaseUrl) {
      return 'NVIDIA NIM HTTP Base URL 未设置。请在设置中配置自托管服务或代理地址。';
    }

    if (!isValidHttpUrl(normalizedBaseUrl)) {
      return 'NVIDIA NIM HTTP Base URL 必须是 http:// 或 https:// 地址。';
    }

    return null;
  },
  transcribe: (audioFile, context, language, enableItn, config, signal) =>
    transcribeWithNvidiaNim(
      audioFile,
      context,
      language,
      enableItn,
      { baseUrl: config.nvidiaNimBaseUrl, apiKey: config.nvidiaNimApiKey },
      signal,
    ),
};
