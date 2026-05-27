import {
  compressionLevelDisplayNames,
  languageDisplayNames,
  mainstreamAsrModelDisplayNames,
  nvidiaNimTaskDisplayNames,
} from '../displayNames';
import type { HistoryItem } from '../types';
import { downloadFile } from './downloadFile';
import { createExportFileName } from './exportFileName';
import { getAsrProviderLabel } from './providerRegistry';

export type HistoryExportFormat = 'json' | 'md';

export const createSerializableHistoryItems = (items: HistoryItem[]) => {
  return items.map((item) => ({
    id: item.id,
    fileName: item.fileName || '未命名音频',
    transcription: item.transcription || '',
    detectedLanguage: item.detectedLanguage || '',
    context: item.context || '',
    timestamp: item.timestamp,
    provider: item.provider || null,
    language: item.language || null,
    enableItn: item.enableItn ?? null,
    compressionLevel: item.compressionLevel || null,
    trimSilence: item.trimSilence ?? null,
    enableLongAudioChunking: item.enableLongAudioChunking ?? null,
    nvidiaNimTask: item.nvidiaNimTask ?? null,
    mainstreamAsrModel: item.mainstreamAsrModel ?? null,
    segments: item.segments || [],
    audioUrl: item.audioUrl || null,
  }));
};

type SerializableHistoryItem = ReturnType<typeof createSerializableHistoryItems>[number];

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '未知';
};

const formatProvider = (provider: SerializableHistoryItem['provider']) => {
  return getAsrProviderLabel(provider);
};

const formatBoolean = (value?: boolean | null) => {
  if (typeof value !== 'boolean') {
    return '未知';
  }

  return value ? '开启' : '关闭';
};

const formatLanguage = (language?: string | null) => {
  if (!language) {
    return '';
  }

  return languageDisplayNames[language as keyof typeof languageDisplayNames] || language;
};

const formatCompressionLevel = (compressionLevel?: string | null) => {
  if (!compressionLevel) {
    return '';
  }

  return (
    compressionLevelDisplayNames[compressionLevel as keyof typeof compressionLevelDisplayNames] || compressionLevel
  );
};

const formatNvidiaNimTask = (task?: string | null) => {
  if (!task) {
    return '';
  }

  return nvidiaNimTaskDisplayNames[task as keyof typeof nvidiaNimTaskDisplayNames] || task;
};

const formatMainstreamAsrModel = (model?: string | null) => {
  if (!model) {
    return '';
  }

  return mainstreamAsrModelDisplayNames[model as keyof typeof mainstreamAsrModelDisplayNames] || model;
};

const createMarkdownItem = (item: SerializableHistoryItem) => {
  const compressionLevel = formatCompressionLevel(item.compressionLevel);
  const metadata = [
    `- 时间：${formatTimestamp(item.timestamp)}`,
    `- Provider：${formatProvider(item.provider)}`,
    item.detectedLanguage ? `- 识别语言：${formatLanguage(item.detectedLanguage)}` : '',
    item.language ? `- 目标语言：${formatLanguage(item.language)}` : '',
    `- ITN：${formatBoolean(item.enableItn)}`,
    compressionLevel ? `- 压缩：${compressionLevel}` : '',
    `- 静音裁剪：${formatBoolean(item.trimSilence)}`,
    `- 长音频切片：${formatBoolean(item.enableLongAudioChunking)}`,
    item.nvidiaNimTask ? `- NVIDIA 任务：${formatNvidiaNimTask(item.nvidiaNimTask)}` : '',
    item.mainstreamAsrModel ? `- 主流模型：${formatMainstreamAsrModel(item.mainstreamAsrModel)}` : '',
    item.segments.length ? `- 分段：${item.segments.length} 段` : '',
    item.audioUrl ? `- 音频 URL：${item.audioUrl}` : '',
  ].filter(Boolean);
  const context = item.context.trim() ? ['### 上下文', '', item.context.trim(), ''] : [];

  return [`## ${item.fileName}`, '', ...metadata, '', ...context, '### 转写', '', item.transcription].join('\n');
};

export const createHistoryExport = (items: HistoryItem[], format: HistoryExportFormat) => {
  const serializableItems = createSerializableHistoryItems(items);

  if (format === 'json') {
    return JSON.stringify(serializableItems, null, 2);
  }

  return serializableItems.map(createMarkdownItem).join('\n\n');
};

export const getHistoryExportMimeType = (format: HistoryExportFormat) => {
  return format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8';
};

export const downloadHistoryExport = (items: HistoryItem[], format: HistoryExportFormat) => {
  const content = createHistoryExport(items, format);
  const blob = new Blob([content], {
    type: getHistoryExportMimeType(format),
  });
  downloadFile(blob, createExportFileName({ prefix: 'asr-history', extension: format }));
};
