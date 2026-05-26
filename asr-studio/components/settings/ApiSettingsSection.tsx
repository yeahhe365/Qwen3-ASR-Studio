import React, { useEffect, useMemo, useState } from 'react';
import {
  asrProviderMetadata,
  asrProviderSegmentOptions,
  diagnoseProviderConfig,
  getProviderSummaryDetails,
  type ProviderDiagnosticReport,
} from '../../services/providerRegistry';
import { AsrProvider } from '../../types';
import { ApiKeyIcon } from '../icons/ApiKeyIcon';
import { ServerIcon } from '../icons/ServerIcon';
import { WarningIcon } from '../icons/WarningIcon';
import {
  outlineButtonClassName,
  ProviderSummary,
  SectionBlock,
  SegmentedControl,
  SettingRow,
} from './SettingsControls';
import {
  getDiagnosticCheckClassName,
  getDiagnosticStatusBadgeClassName,
  getDiagnosticStatusLabel,
} from './providerDiagnosticUi';
import { ProviderCredentialsSection } from './ProviderCredentialsSection';
import type { SettingsPanelProps } from './settingsTypes';

type ApiSettingsSectionProps = Pick<SettingsPanelProps, 'values' | 'setters' | 'disabled'>;

const ProviderCapabilities: React.FC<{ provider: AsrProvider }> = ({ provider }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {asrProviderMetadata[provider].capabilities.map((capability) => (
      <div
        key={capability.label}
        className="rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)]/20 px-3 py-2"
      >
        <p className="text-[11px] font-semibold uppercase text-[var(--theme-text-tertiary)]">{capability.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-primary)]">{capability.value}</p>
      </div>
    ))}
  </div>
);

const ProviderDetails: React.FC<{
  provider: AsrProvider;
  providerConfig: ReturnType<typeof createProviderConfig>;
}> = ({ provider, providerConfig }) => {
  const metadata = asrProviderMetadata[provider];

  return (
    <div className="space-y-4">
      <ProviderSummary
        title={metadata.summaryTitle}
        details={getProviderSummaryDetails(providerConfig)}
        note={metadata.summaryNote}
      />
      <ProviderCapabilities provider={provider} />
    </div>
  );
};

const createProviderConfig = ({
  asrProvider,
  qwenApiKey,
  doubaoApiKey,
  doubaoAccessKey,
  geminiApiKey,
  nvidiaNimBaseUrl,
  nvidiaNimApiKey,
}: ApiSettingsSectionProps['values']) => ({
  provider: asrProvider,
  qwenApiKey,
  doubaoApiKey,
  doubaoAccessKey,
  geminiApiKey,
  nvidiaNimBaseUrl,
  nvidiaNimApiKey,
});

export const ApiSettingsSection: React.FC<ApiSettingsSectionProps> = ({ values, setters, disabled }) => {
  const [diagnosticReport, setDiagnosticReport] = useState<ProviderDiagnosticReport | null>(null);
  const { asrProvider } = values;
  const { setAsrProvider, setQwenApiKey, setDoubaoApiKey, setDoubaoAccessKey, setGeminiApiKey, setNvidiaNimApiKey } =
    setters;
  const currentProviderLabel = asrProviderMetadata[asrProvider].label;
  const providerConfig = useMemo(() => createProviderConfig(values), [values]);

  useEffect(() => {
    setDiagnosticReport(null);
  }, [providerConfig]);

  const clearCurrentProviderCredentials = () => {
    if (disabled) {
      return;
    }

    const clearCredentials: Record<AsrProvider, () => void> = {
      [AsrProvider.QWEN]: () => setQwenApiKey(''),
      [AsrProvider.DOUBAO]: () => {
        setDoubaoApiKey('');
        setDoubaoAccessKey('');
      },
      [AsrProvider.GEMINI]: () => setGeminiApiKey(''),
      [AsrProvider.NVIDIA_NIM]: () => setNvidiaNimApiKey(''),
    };

    clearCredentials[asrProvider]();
  };
  const runDiagnostics = () => {
    if (disabled) {
      return;
    }

    setDiagnosticReport(diagnoseProviderConfig(providerConfig));
  };

  return (
    <div className="space-y-6">
      <SectionBlock title="服务模式" icon={<ServerIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="API 提供商" description="选择当前用于语音识别的模型服务。">
          <SegmentedControl
            ariaLabel="API 提供商"
            value={asrProvider}
            onChange={setAsrProvider}
            disabled={disabled}
            options={asrProviderSegmentOptions}
          />
        </SettingRow>
      </SectionBlock>

      <ProviderDetails provider={asrProvider} providerConfig={providerConfig} />

      <ProviderCredentialsSection values={values} setters={setters} disabled={disabled} />

      <SectionBlock title="安全" icon={<WarningIcon className="h-3.5 w-3.5" />}>
        <SettingRow
          label="配置诊断"
          description="检查当前 Provider 的必填项、输入限制和浏览器调用条件。"
          icon={<WarningIcon className="h-4 w-4" />}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={`rounded-md border px-2.5 py-1 font-mono text-xs ${getDiagnosticStatusBadgeClassName(
                diagnosticReport?.status,
              )}`}
            >
              {getDiagnosticStatusLabel(diagnosticReport?.status)}
            </span>
            <button type="button" onClick={runDiagnostics} disabled={disabled} className={outlineButtonClassName}>
              运行诊断
            </button>
          </div>
        </SettingRow>
        {diagnosticReport && (
          <div className="space-y-2 px-2 py-3">
            {diagnosticReport.checks.map((check) => (
              <div
                key={check.label}
                className={`rounded-md border px-3 py-2 ${getDiagnosticCheckClassName(check.status)}`}
              >
                <p className="text-xs font-semibold">{check.label}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-85">{check.detail}</p>
              </div>
            ))}
          </div>
        )}
        <SettingRow
          label="清除当前凭据"
          description={`${currentProviderLabel} 的密钥保存在当前浏览器本地；共享设备上建议使用后及时清除。`}
          icon={<ApiKeyIcon className="h-4 w-4" />}
        >
          <button
            type="button"
            onClick={clearCurrentProviderCredentials}
            disabled={disabled}
            className={outlineButtonClassName}
          >
            清除
          </button>
        </SettingRow>
      </SectionBlock>
    </div>
  );
};
