import { GEMINI_ASR_API_URL, GEMINI_ASR_MODEL } from '../../constants';
import { AsrProvider } from '../../types';
import type { ProviderRegistryEntry } from '../providerRegistryTypes';
import { transcribeWithGemini } from './geminiProvider';

export const geminiProviderEntry: ProviderRegistryEntry = {
  provider: AsrProvider.GEMINI,
  metadata: {
    label: 'Gemini',
    model: GEMINI_ASR_MODEL,
    menuDescription: '音频理解模型',
    summaryTitle: 'Google Gemini API',
    summaryDetails: `${GEMINI_ASR_MODEL} · ${GEMINI_ASR_API_URL}`,
    summaryNote: '当前使用 Gemini 多模态音频输入，语言、ITN 与上下文通过提示词传入。',
    capabilities: [
      { label: '输入', value: '本地音频内联上传' },
      { label: '大小', value: '约 20 MB 请求体' },
      { label: '上下文', value: '提示词增强' },
      { label: '时间戳', value: '需提示词或后处理' },
    ],
  },
  diagnose: (config) => [
    {
      label: 'API Key',
      status: config.geminiApiKey.trim() ? 'ok' : 'error',
      detail: config.geminiApiKey.trim() ? '已填写 Gemini API Key。' : '需要在设置中填写 Gemini API Key。',
    },
    {
      label: '音频格式',
      status: 'warning',
      detail: 'Gemini 仅支持部分音频格式；不兼容文件会自动转换为 WAV 后再提交。',
    },
  ],
  getReadinessError: (config) => (!config.geminiApiKey.trim() ? 'Gemini API Key 未设置。请在设置中配置。' : null),
  transcribe: (audioFile, context, language, enableItn, config, signal) =>
    transcribeWithGemini(audioFile, context, language, enableItn, { apiKey: config.geminiApiKey }, signal),
};
