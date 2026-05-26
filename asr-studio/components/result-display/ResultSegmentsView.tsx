import React from 'react';
import type { TranscriptionSegment } from '../../types';
import { EmptyState } from '../EmptyState';
import { SearchIcon } from '../icons/SearchIcon';
import { formatSegmentTime, renderHighlightedText } from './resultDisplayUtils';

interface ResultSegmentsViewProps {
  segments: TranscriptionSegment[];
  searchTerm: string;
}

export const ResultSegmentsView: React.FC<ResultSegmentsViewProps> = ({ segments, searchTerm }) => {
  if (segments.length === 0) {
    return (
      <EmptyState
        icon={<SearchIcon className="h-5 w-5" />}
        title="没有匹配分段"
        className="min-h-[240px] sm:min-h-[320px]"
      />
    );
  }

  return (
    <div className="custom-scrollbar max-h-[520px] space-y-2 overflow-y-auto rounded-md border border-base-300 bg-base-200/60 p-3">
      {segments.map((segment, index) => (
        <article key={segment.id || index} className="rounded-md bg-base-100 px-3 py-2">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-content-200">
            <span className="font-mono">
              {formatSegmentTime(segment.startTime)} - {formatSegmentTime(segment.endTime)}
            </span>
            {segment.speaker && <span>{segment.speaker}</span>}
            {typeof segment.confidence === 'number' && (
              <span className="font-mono">{Math.round(segment.confidence * 100)}%</span>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-content-100">
            {renderHighlightedText(segment.text, searchTerm)}
          </p>
        </article>
      ))}
    </div>
  );
};
