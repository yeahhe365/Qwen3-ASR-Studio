import React from 'react';

export type ResultViewMode = 'text' | 'segments';

export const countMatches = (text: string, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  let count = 0;
  let startIndex = 0;
  const normalizedText = text.toLowerCase();
  while (startIndex < normalizedText.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, startIndex);
    if (matchIndex === -1) {
      break;
    }
    count += 1;
    startIndex = matchIndex + normalizedQuery.length;
  }
  return count;
};

export const formatSegmentTime = (seconds?: number) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return '--:--';
  }

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}`;
};

export const renderHighlightedText = (text: string, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  const normalizedText = text.toLowerCase();
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    parts.push(
      <mark key={`${matchIndex}-${matchEnd}`} className="rounded-sm bg-brand-primary/15 text-content-100">
        {text.slice(matchIndex, matchEnd)}
      </mark>,
    );
    cursor = matchEnd;
    matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
};
