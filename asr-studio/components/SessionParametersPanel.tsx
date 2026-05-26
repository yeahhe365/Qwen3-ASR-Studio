import React from 'react';
import { compressionLevelDisplayNames, languageDisplayNames } from '../displayNames';
import { CompressionLevel, Language } from '../types';

interface SessionParametersPanelProps {
  context: string;
  setContext: (context: string) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  enableItn: boolean;
  setEnableItn: (enable: boolean) => void;
  compressionLevel: CompressionLevel;
  setCompressionLevel: (level: CompressionLevel) => void;
  disabled?: boolean;
}

export const SessionParametersPanel: React.FC<SessionParametersPanelProps> = ({
  context,
  setContext,
  language,
  setLanguage,
  enableItn,
  setEnableItn,
  compressionLevel,
  setCompressionLevel,
  disabled,
}) => {
  const controlsDisabled = Boolean(disabled);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!controlsDisabled) {
      setLanguage(event.target.value as Language);
    }
  };

  const handleCompressionLevelChange = (level: CompressionLevel) => {
    if (!controlsDisabled && compressionLevel !== level) {
      setCompressionLevel(level);
    }
  };

  const handleToggleItn = () => {
    if (!controlsDisabled) {
      setEnableItn(!enableItn);
    }
  };

  const handleContextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!controlsDisabled) {
      setContext(event.target.value);
    }
  };

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <div className="min-w-0">
          <p className="eyebrow">Session</p>
          <h2 className="panel-title mt-1">会话参数</h2>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <label className="block">
          <span className="eyebrow">语言</span>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={controlsDisabled}
            className="field-control mt-2"
          >
            {Object.values(Language).map((langValue) => (
              <option key={langValue} value={langValue}>
                {languageDisplayNames[langValue]}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="eyebrow">音频处理</span>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-base-100 p-1 ring-1 ring-base-300">
            {Object.values(CompressionLevel).map((level) => {
              const isActive = compressionLevel === level;

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleCompressionLevelChange(level)}
                  disabled={controlsDisabled}
                  className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? 'bg-content-100 text-base-200 shadow-sm'
                      : 'text-content-200 hover:bg-base-300/50 hover:text-content-100'
                  }`}
                >
                  {compressionLevelDisplayNames[level]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="surface-inset flex items-center justify-between gap-3 px-3 py-2">
          <span className="text-sm font-medium text-content-100">ITN</span>
          <button
            type="button"
            onClick={handleToggleItn}
            disabled={controlsDisabled}
            aria-pressed={enableItn}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
              enableItn ? 'bg-brand-primary' : 'bg-base-300'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                enableItn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <label className="block">
          <span className="eyebrow">上下文</span>
          <textarea
            value={context}
            onChange={handleContextChange}
            disabled={controlsDisabled}
            rows={4}
            placeholder="人名、项目名、术语..."
            className="field-control mt-2 resize-y leading-6"
          />
        </label>
      </div>
    </section>
  );
};
