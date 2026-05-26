import { languageDisplayNames } from '../../displayNames';
import type { HistoryItem } from '../../types';

export const HISTORY_FILTER_ALL = 'all';

const HISTORY_PREVIEW_MAX_LENGTH = 110;

export type HistoryFilterValue = typeof HISTORY_FILTER_ALL | string;

export const formatHistoryTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getHistoryItemLanguage = (item: HistoryItem) => item.detectedLanguage || item.language || '';

export const getHistoryLanguageLabel = (language: string) => {
  return languageDisplayNames[language as keyof typeof languageDisplayNames] || language;
};

export const getHistoryPreviewText = (transcription: string) => {
  if (!transcription) {
    return '（无识别结果）';
  }

  if (transcription.length <= HISTORY_PREVIEW_MAX_LENGTH) {
    return transcription;
  }

  return `${transcription.substring(0, HISTORY_PREVIEW_MAX_LENGTH)}...`;
};

export const getHistoryProviderFilters = (items: HistoryItem[]) => {
  return Array.from(
    new Set(
      items
        .map((item) => item.provider)
        .filter((provider): provider is NonNullable<HistoryItem['provider']> => Boolean(provider)),
    ),
  );
};

export const getHistoryLanguageFilters = (items: HistoryItem[]) => {
  return Array.from(new Set(items.map(getHistoryItemLanguage).filter(Boolean)));
};

interface GetVisibleHistoryItemsOptions {
  query: string;
  providerFilter: HistoryFilterValue;
  languageFilter: HistoryFilterValue;
}

export const getVisibleHistoryItems = (
  items: HistoryItem[],
  { query, providerFilter, languageFilter }: GetVisibleHistoryItemsOptions,
) => {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      [item.transcription, item.fileName, item.context, item.detectedLanguage]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesProvider = providerFilter === HISTORY_FILTER_ALL || item.provider === providerFilter;
    const matchesLanguage = languageFilter === HISTORY_FILTER_ALL || getHistoryItemLanguage(item) === languageFilter;

    return matchesQuery && matchesProvider && matchesLanguage;
  });
};
