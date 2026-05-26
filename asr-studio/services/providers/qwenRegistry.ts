import { QWEN_ASR_API_URL, QWEN_ASR_MODEL } from '../../constants';
import { AsrProvider } from '../../types';
import type { ProviderRegistryEntry } from '../providerRegistryTypes';
import { transcribeWithQwen } from './qwenProvider';

export const qwenProviderEntry: ProviderRegistryEntry = {
  provider: AsrProvider.QWEN,
  metadata: {
    label: 'Qwen',
    model: QWEN_ASR_MODEL,
    menuDescription: '阿里云官方 ASR',
    summaryTitle: 'Qwen 官方 API',
    summaryDetails: `${QWEN_ASR_MODEL} · ${QWEN_ASR_API_URL}`,
    capabilities: [
      { label: '输入', value: '本地音频内联上传' },
      { label: '大小', value: '约 10 MB Data URL' },
      { label: '语言', value: '自动识别 / 指定语言' },
      { label: '时间戳', value: '当前未返回' },
    ],
  },
  diagnose: (config) => [
    {
      label: 'API Key',
      status: config.qwenApiKey.trim() ? 'ok' : 'error',
      detail: config.qwenApiKey.trim() ? '已填写 Qwen API Key。' : '需要在设置中填写 Qwen API Key。',
    },
    {
      label: '输入限制',
      status: 'warning',
      detail: '当前使用浏览器内联音频，请保持压缩或切片以避免超过请求体限制。',
    },
  ],
  getReadinessError: (config) => (!config.qwenApiKey.trim() ? 'Qwen API Key 未设置。请在设置中配置。' : null),
  transcribe: (audioFile, context, language, enableItn, config, signal) =>
    transcribeWithQwen(audioFile, context, language, enableItn, { apiKey: config.qwenApiKey }, signal),
};
