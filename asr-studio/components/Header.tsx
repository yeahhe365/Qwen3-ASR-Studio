
import React from 'react';
import { KeyboardIcon } from './icons/KeyboardIcon';
import { LogoIcon } from './icons/LogoIcon';
import { SettingsIcon } from './icons/SettingsIcon';

interface HeaderProps {
  onSettingsClick: () => void;
  onPipClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick, onPipClick }) => {

  return (
    <header className="relative z-20 flex min-w-0 flex-shrink-0 items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-200 px-3 py-2 shadow-sm sm:px-4">
      <a
        href="/"
        className="flex min-w-0 items-center gap-3 text-content-100"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white shadow-sm sm:h-10 sm:w-10">
          <LogoIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <span className="min-w-0 pr-1">
          <span className="block truncate text-sm font-semibold leading-tight sm:text-base">ASR Studio</span>
          <span className="hidden text-xs text-content-200 sm:block">语音识别工作台</span>
        </span>
      </a>
      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        <button
          onClick={onPipClick}
          title="输入法模式 (画中画)"
          aria-label="打开输入法模式"
          className="flex h-9 items-center gap-2 rounded-xl border border-transparent px-2 text-sm font-medium text-content-200 transition-colors hover:border-base-300 hover:bg-base-100 hover:text-content-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 sm:h-10 sm:px-3"
        >
          <KeyboardIcon className="h-5 w-5" />
          <span className="hidden md:inline">输入法</span>
        </button>
        <button
          onClick={onSettingsClick}
          title="设置"
          aria-label="打开设置"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-content-200 transition-colors hover:border-base-300 hover:bg-base-100 hover:text-content-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 sm:h-10 sm:w-10"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
