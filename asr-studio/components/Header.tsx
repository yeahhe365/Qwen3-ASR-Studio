import React, { useEffect, useRef, useState } from 'react';
import { KeyboardIcon } from './icons/KeyboardIcon';
import { LogoIcon } from './icons/LogoIcon';
import { ServerIcon } from './icons/ServerIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { AsrProvider } from '../types';
import { asrProviderMenuOptions } from '../services/providerRegistry';

interface HeaderProps {
  onSettingsClick: () => void;
  onPipClick: () => void;
  asrProvider: AsrProvider;
  onAsrProviderChange: (provider: AsrProvider) => void;
  disabled?: boolean;
  pipDisabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onPipClick,
  asrProvider,
  onAsrProviderChange,
  disabled,
  pipDisabled,
}) => {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const currentModel =
    asrProviderMenuOptions.find((option) => option.provider === asrProvider) ?? asrProviderMenuOptions[0];

  useEffect(() => {
    if (!isModelMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!modelSelectorRef.current?.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModelMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModelMenuOpen]);

  useEffect(() => {
    if (disabled) {
      setIsModelMenuOpen(false);
    }
  }, [disabled]);

  return (
    <header className="surface-panel relative z-20 flex w-full min-w-0 max-w-full flex-shrink-0 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
      <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-start">
        <a href="/" className="group flex min-w-0 items-center gap-3 text-content-100">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-content-100 text-base-200 shadow-sm transition-transform group-hover:scale-[1.03]">
            <LogoIcon className="h-6 w-6" />
          </span>
          <span className="min-w-0 pr-1">
            <span className="block truncate text-base font-semibold leading-tight">ASR Studio</span>
            <span className="hidden text-xs text-content-200 sm:block">Speech Workbench</span>
          </span>
        </a>
        <button onClick={onSettingsClick} title="设置" aria-label="打开设置" className="icon-button sm:hidden">
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
        <div ref={modelSelectorRef} className="relative min-w-0 flex-1 sm:max-w-[28rem]">
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsModelMenuOpen((isOpen) => !isOpen);
              }
            }}
            disabled={disabled}
            className="surface-inset flex h-11 w-full min-w-0 items-center gap-2 px-2.5 text-left text-content-100 transition-colors hover:border-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/25 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
            aria-haspopup="listbox"
            aria-expanded={isModelMenuOpen}
            title={`${currentModel.label} · ${currentModel.model}`}
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary">
              <ServerIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight">{currentModel.label}</span>
              <span className="hidden truncate font-mono text-[11px] leading-tight text-content-200 sm:block">
                {currentModel.model}
              </span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 flex-shrink-0 text-content-200 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isModelMenuOpen && (
            <div className="surface-panel absolute left-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] bg-base-200 p-1.5 shadow-2xl">
              <div className="eyebrow px-2 pb-1.5 pt-1">Provider</div>
              <div role="listbox" aria-label="模型选择器" className="space-y-1">
                {asrProviderMenuOptions.map((option) => {
                  const isActive = option.provider === asrProvider;

                  return (
                    <button
                      key={option.provider}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onAsrProviderChange(option.provider);
                        setIsModelMenuOpen(false);
                      }}
                      disabled={disabled}
                      className={`flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-base-100 text-content-100 ring-1 ring-base-300'
                          : 'text-content-200 hover:bg-base-100 hover:text-content-100'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${isActive ? 'bg-brand-primary text-[var(--theme-text-accent)]' : 'bg-base-100 text-content-200 ring-1 ring-base-300'}`}
                      >
                        <ServerIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{option.label}</span>
                        <span className="block truncate font-mono text-xs text-content-200">{option.model}</span>
                        <span className="block truncate text-xs text-content-200">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onPipClick}
          disabled={pipDisabled ?? disabled}
          title="输入法模式 (画中画)"
          aria-label="打开输入法模式"
          className="secondary-action h-11 flex-shrink-0 px-3"
        >
          <KeyboardIcon className="h-5 w-5" />
          <span className="hidden md:inline">输入法</span>
        </button>
        <button
          onClick={onSettingsClick}
          title="设置"
          aria-label="打开设置"
          className="icon-button hidden h-11 w-11 sm:flex"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
