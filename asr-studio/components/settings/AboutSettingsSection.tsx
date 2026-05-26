import React from 'react';
import { APP_VERSION } from '../../constants';
import { LogoIcon } from '../icons/LogoIcon';

export const AboutSettingsSection: React.FC = () => (
  <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] shadow-2xl shadow-black/10 dark:shadow-black/40">
      <LogoIcon className="h-12 w-12" />
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <span className="rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-4 py-1.5 font-mono text-sm font-bold text-[var(--theme-text-primary)]">
        v{APP_VERSION}
      </span>
      <span className="rounded-md bg-[var(--theme-bg-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text-accent)]">
        ASR Studio
      </span>
    </div>
    <a
      href="https://github.com/yeahhe365/ASR-Studio"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[#24292F] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#24292F]/90 hover:shadow-xl active:translate-y-0 sm:w-auto"
    >
      GitHub 仓库
    </a>
  </div>
);
