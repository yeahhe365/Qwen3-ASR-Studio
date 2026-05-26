import { DOUBAO_ASR_MODEL, DOUBAO_ASR_QUERY_URL, DOUBAO_ASR_RESOURCE_ID, DOUBAO_ASR_SUBMIT_URL } from '../../constants';
import { AsrProvider } from '../../types';
import { isServerAccessibleHttpUrl } from '../remoteAudioFile';
import type { ProviderRegistryEntry } from '../providerRegistryTypes';
import { DOUBAO_SUPPORTED_AUDIO_FORMATS_LABEL, getDoubaoAudioFormat, transcribeWithDoubao } from './doubaoProvider';

export const doubaoProviderEntry: ProviderRegistryEntry = {
  provider: AsrProvider.DOUBAO,
  supportsRemoteAudio: true,
  metadata: {
    label: '豆包',
    model: DOUBAO_ASR_MODEL,
    menuDescription: '录音文件标准版 2.0',
    summaryTitle: '豆包录音文件识别标准版 2.0',
    summaryDetails: `${DOUBAO_ASR_MODEL} · ${DOUBAO_ASR_RESOURCE_ID} · ${DOUBAO_ASR_SUBMIT_URL} · ${DOUBAO_ASR_QUERY_URL}`,
    summaryNote: '当前按本地文件 base64 的 audio.data 方式提交到标准版 2.0；远程 URL 输入仍保留为可选方式。',
    capabilities: [
      { label: '输入', value: '本地文件 / 录音 / 可选 URL' },
      { label: '格式', value: 'raw / wav / mp3 / ogg' },
      { label: '任务', value: '异步提交与轮询' },
      { label: '时间戳', value: '可后续扩展解析' },
    ],
  },
  diagnose: (config) => [
    {
      label: 'API Key',
      status: config.doubaoApiKey.trim() ? 'ok' : 'error',
      detail: config.doubaoApiKey.trim() ? '已填写豆包 API Key / App Key。' : '需要填写豆包 API Key 或 App Key。',
    },
    {
      label: 'Access Key',
      status: config.doubaoAccessKey.trim() ? 'ok' : 'warning',
      detail: config.doubaoAccessKey.trim()
        ? '已启用旧版 App Key + Access Key 鉴权。'
        : '未填写 Access Key，将使用新版 X-Api-Key 鉴权。',
    },
    {
      label: '音频来源',
      status: 'ok',
      detail: '本地文件和录音会转为 base64 后作为 audio.data 提交；也可使用服务端可访问的 URL。',
    },
  ],
  getReadinessError: (config, file, audioSourceUrl) => {
    if (!config.doubaoApiKey.trim()) {
      return '豆包 API Key 未设置。请在设置中配置。';
    }

    if (audioSourceUrl && !isServerAccessibleHttpUrl(audioSourceUrl)) {
      return '豆包标准版 2.0 需要服务端可访问的 http:// 或 https:// 音频 URL，不能使用 localhost、内网或回环地址。';
    }

    try {
      getDoubaoAudioFormat(file);
    } catch {
      if (!audioSourceUrl) {
        return null;
      }
      return `豆包标准版 2.0 仅支持 ${DOUBAO_SUPPORTED_AUDIO_FORMATS_LABEL} 格式。请提供带有效后缀的在线音频 URL，或使用本地文件自动转换为 WAV。`;
    }

    return null;
  },
  transcribe: (audioFile, context, language, enableItn, config, signal) =>
    transcribeWithDoubao(
      audioFile,
      context,
      language,
      enableItn,
      { apiKey: config.doubaoApiKey, accessKey: config.doubaoAccessKey },
      signal,
    ),
};
