import React from 'react';
import { NVIDIA_NIM_HTTP_BASE_URL_PLACEHOLDER } from '../../constants';
import { AsrProvider } from '../../types';
import { ApiKeyIcon } from '../icons/ApiKeyIcon';
import { ServerIcon } from '../icons/ServerIcon';
import { helpTextClassName, inputClassName, labelClassName, SectionBlock } from './SettingsControls';
import type { SettingsPanelProps } from './settingsTypes';

type ProviderCredentialsSectionProps = Pick<SettingsPanelProps, 'values' | 'setters' | 'disabled'>;

interface CredentialInputProps {
  id: string;
  label: string;
  type: 'password' | 'url';
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  helpText: React.ReactNode;
}

const CredentialInput: React.FC<CredentialInputProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  disabled,
  placeholder,
  helpText,
}) => (
  <div>
    <label htmlFor={id} className={labelClassName}>
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`mt-2 ${inputClassName}`}
    />
    <p className={helpTextClassName}>{helpText}</p>
  </div>
);

export const ProviderCredentialsSection: React.FC<ProviderCredentialsSectionProps> = ({
  values,
  setters,
  disabled,
}) => {
  const { asrProvider, qwenApiKey, doubaoApiKey, doubaoAccessKey, geminiApiKey, nvidiaNimBaseUrl, nvidiaNimApiKey } =
    values;
  const {
    setQwenApiKey,
    setDoubaoApiKey,
    setDoubaoAccessKey,
    setGeminiApiKey,
    setNvidiaNimBaseUrl,
    setNvidiaNimApiKey,
  } = setters;

  if (asrProvider === AsrProvider.QWEN) {
    return (
      <SectionBlock title="凭据" icon={<ApiKeyIcon className="h-3.5 w-3.5" />}>
        <div className="py-3">
          <CredentialInput
            id="qwen-api-key-setting"
            label="API Key"
            type="password"
            value={qwenApiKey}
            onChange={setQwenApiKey}
            disabled={disabled}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            helpText="用于调用 Qwen 官方 OpenAI 兼容接口。"
          />
        </div>
      </SectionBlock>
    );
  }

  if (asrProvider === AsrProvider.DOUBAO) {
    return (
      <SectionBlock title="凭据" icon={<ApiKeyIcon className="h-3.5 w-3.5" />}>
        <div className="space-y-4 py-3">
          <CredentialInput
            id="doubao-api-key-setting"
            label="API Key / App Key"
            type="password"
            value={doubaoApiKey}
            onChange={setDoubaoApiKey}
            disabled={disabled}
            placeholder="your-api-key-or-app-key"
            helpText="新版控制台填写 API Key；旧版鉴权填写 App Key 并补充 Access Key。"
          />
          <CredentialInput
            id="doubao-access-key-setting"
            label="Access Key（可选）"
            type="password"
            value={doubaoAccessKey}
            onChange={setDoubaoAccessKey}
            disabled={disabled}
            placeholder="旧版 Access Key，可留空"
            helpText="仅旧版鉴权需要；留空时使用新版 X-Api-Key 鉴权。"
          />
        </div>
      </SectionBlock>
    );
  }

  if (asrProvider === AsrProvider.GEMINI) {
    return (
      <SectionBlock title="凭据" icon={<ApiKeyIcon className="h-3.5 w-3.5" />}>
        <div className="py-3">
          <CredentialInput
            id="gemini-api-key-setting"
            label="API Key"
            type="password"
            value={geminiApiKey}
            onChange={setGeminiApiKey}
            disabled={disabled}
            placeholder="AIza..."
            helpText="用于调用 Google Gemini generateContent 接口。"
          />
        </div>
      </SectionBlock>
    );
  }

  if (asrProvider === AsrProvider.NVIDIA_NIM) {
    return (
      <SectionBlock title="服务地址" icon={<ServerIcon className="h-3.5 w-3.5" />}>
        <div className="space-y-4 py-3">
          <CredentialInput
            id="nvidia-nim-base-url-setting"
            label="HTTP Base URL（自托管或代理）"
            type="url"
            value={nvidiaNimBaseUrl}
            onChange={setNvidiaNimBaseUrl}
            disabled={disabled}
            placeholder={NVIDIA_NIM_HTTP_BASE_URL_PLACEHOLDER}
            helpText="填写你自己部署的 NIM HTTP 服务或代理地址，应用会调用 /v1/audio/transcriptions。"
          />
          <CredentialInput
            id="nvidia-nim-api-key-setting"
            label="API Key（可选）"
            type="password"
            value={nvidiaNimApiKey}
            onChange={setNvidiaNimApiKey}
            disabled={disabled}
            placeholder="Bearer token，可留空"
            helpText="本地 NIM 通常不需要；如果服务前面有网关，可填入 Bearer Token。"
          />
        </div>
      </SectionBlock>
    );
  }

  return null;
};
