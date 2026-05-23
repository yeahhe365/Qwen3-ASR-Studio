import React from 'react';
import { SoundWaveIcon } from './icons/SoundWaveIcon';

interface ExampleButtonsProps {
  onLoadExample: (id: number) => void;
  disabled?: boolean;
}

export const ExampleButtons: React.FC<ExampleButtonsProps> = ({ onLoadExample, disabled }) => {
  const examples = [
    { id: 0, title: '比赛解说', description: 'CSGO 场景' },
    { id: 1, title: '噪声环境', description: '复杂背景音' },
    { id: 2, title: '复杂音频', description: '多段语音' },
  ];

  const buttonClasses = "flex min-w-0 items-center gap-3 rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 text-left transition-colors hover:border-brand-primary hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
  
  return (
    <div className="min-w-0 rounded-lg border border-base-300 bg-base-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-content-100">示例音频</h3>
        <span className="text-xs text-content-200">快速体验</span>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map(example => (
          <button
            key={example.id}
            onClick={() => onLoadExample(example.id)}
            disabled={disabled}
            className={buttonClasses}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-base-200 text-brand-primary">
              <SoundWaveIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-content-100">{example.title}</span>
              <span className="block truncate text-xs text-content-200">{example.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
