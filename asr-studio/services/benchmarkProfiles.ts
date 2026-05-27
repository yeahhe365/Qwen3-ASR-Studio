import type { BenchmarkScoringProfile, BenchmarkScoringProfileId } from './benchmarkTypes';

export const benchmarkScoringProfiles: BenchmarkScoringProfile[] = [
  {
    id: 'open-asr',
    label: 'OpenASR-compatible',
    description: '忽略标点、大小写归一、ITN 归一，适合与公开 ASR leaderboard 的常见 WER 口径对齐。',
    primaryMetric: 'wer',
    options: {
      ignorePunctuation: true,
      normalizeCase: true,
      normalizeItn: true,
    },
  },
  {
    id: 'zh-cer',
    label: '中文 CER 优先',
    description: '中文、短词和无空格文本优先看 CER，保留 ITN 归一并忽略标点。',
    primaryMetric: 'cer',
    options: {
      ignorePunctuation: true,
      normalizeCase: true,
      normalizeItn: true,
    },
  },
  {
    id: 'punctuation-sensitive',
    label: '标点敏感',
    description: '保留标点符号，适合评估字幕、客服记录和可直接发布文本。',
    primaryMetric: 'wer',
    options: {
      ignorePunctuation: false,
      normalizeCase: true,
      normalizeItn: true,
    },
  },
  {
    id: 'itn-sensitive',
    label: 'ITN 敏感',
    description: '不做数字/全角/符号归一，适合专门评估模型的反向文本标准化能力。',
    primaryMetric: 'wer',
    options: {
      ignorePunctuation: true,
      normalizeCase: true,
      normalizeItn: false,
    },
  },
  {
    id: 'keyword-terms',
    label: '关键词/术语测试',
    description: '以关键词召回和领域术语准确率为核心，适合人名、品牌名、医学/金融术语场景。',
    primaryMetric: 'termAccuracy',
    options: {
      ignorePunctuation: true,
      normalizeCase: true,
      normalizeItn: true,
    },
  },
];

export const getBenchmarkScoringProfile = (profileId: BenchmarkScoringProfileId) => {
  return benchmarkScoringProfiles.find((profile) => profile.id === profileId) ?? benchmarkScoringProfiles[0];
};
