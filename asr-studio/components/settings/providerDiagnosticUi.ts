import type { ProviderDiagnosticStatus } from '../../services/providerRegistry';

type DiagnosticBadgeState = ProviderDiagnosticStatus | 'idle';

const diagnosticStatusLabels = {
  error: '发现错误',
  warning: '需要注意',
  ok: '配置可用',
  idle: '尚未运行',
} satisfies Record<DiagnosticBadgeState, string>;

const diagnosticStatusBadgeClassNames = {
  error: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  idle: 'border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)]/25 text-[var(--theme-text-tertiary)]',
} satisfies Record<DiagnosticBadgeState, string>;

const diagnosticCheckClassNames = {
  error: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
} satisfies Record<ProviderDiagnosticStatus, string>;

const getBadgeState = (status: ProviderDiagnosticStatus | undefined): DiagnosticBadgeState => status ?? 'idle';

export const getDiagnosticStatusLabel = (status: ProviderDiagnosticStatus | undefined): string =>
  diagnosticStatusLabels[getBadgeState(status)];

export const getDiagnosticStatusBadgeClassName = (status: ProviderDiagnosticStatus | undefined): string =>
  diagnosticStatusBadgeClassNames[getBadgeState(status)];

export const getDiagnosticCheckClassName = (status: ProviderDiagnosticStatus): string =>
  diagnosticCheckClassNames[status];
