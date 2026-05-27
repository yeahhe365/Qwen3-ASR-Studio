import React from 'react';
import { MAINSTREAM_ASR_CUSTOM_BASE_URL_PLACEHOLDER, NVIDIA_NIM_HTTP_BASE_URL_PLACEHOLDER } from '../../constants';
import { mainstreamAsrModelDisplayNames, nvidiaNimTaskDisplayNames } from '../../displayNames';
import { AsrProvider, MainstreamAsrModel, NvidiaNimTask } from '../../types';
import {
  getMainstreamAsrModelDescriptor,
  mainstreamAsrModelOrder,
} from '../../services/providers/mainstreamAsrCatalog';
import { ApiKeyIcon } from '../icons/ApiKeyIcon';
import { ServerIcon } from '../icons/ServerIcon';
import {
  helpTextClassName,
  inputClassName,
  labelClassName,
  SectionBlock,
  SegmentedControl,
  SettingRow,
} from './SettingsControls';
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
  const {
    asrProvider,
    qwenApiKey,
    doubaoApiKey,
    doubaoAccessKey,
    geminiApiKey,
    nvidiaNimBaseUrl,
    nvidiaNimApiKey,
    nvidiaNimTask,
    mainstreamAsrModel,
    mainstreamAsrApiKey,
    mainstreamAsrBaseUrl,
  } = values;
  const {
    setQwenApiKey,
    setDoubaoApiKey,
    setDoubaoAccessKey,
    setGeminiApiKey,
    setNvidiaNimBaseUrl,
    setNvidiaNimApiKey,
    setNvidiaNimTask,
    setMainstreamAsrModel,
    setMainstreamAsrApiKey,
    setMainstreamAsrBaseUrl,
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
          <SettingRow label="任务模式" description="转写保留原语言；英译会调用 NIM 翻译端点。">
            <SegmentedControl
              ariaLabel="NVIDIA NIM 任务模式"
              value={nvidiaNimTask}
              onChange={setNvidiaNimTask}
              disabled={disabled}
              options={Object.values(NvidiaNimTask).map((task) => ({
                value: task,
                label: nvidiaNimTaskDisplayNames[task],
              }))}
            />
          </SettingRow>
          <CredentialInput
            id="nvidia-nim-base-url-setting"
            label="HTTP Base URL（自托管或代理）"
            type="url"
            value={nvidiaNimBaseUrl}
            onChange={setNvidiaNimBaseUrl}
            disabled={disabled}
            placeholder={NVIDIA_NIM_HTTP_BASE_URL_PLACEHOLDER}
            helpText="填写你自己部署的 NIM HTTP 服务或代理地址，应用会根据任务模式调用转写或翻译端点。"
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

  if (asrProvider === AsrProvider.MAINSTREAM) {
    const descriptor = getMainstreamAsrModelDescriptor(mainstreamAsrModel);
    const baseUrlPlaceholder =
      descriptor.baseUrlPlaceholder || descriptor.endpoint || MAINSTREAM_ASR_CUSTOM_BASE_URL_PLACEHOLDER;

    return (
      <SectionBlock title="模型与凭据" icon={<ApiKeyIcon className="h-3.5 w-3.5" />}>
        <div className="space-y-4 py-3">
          <div>
            <label htmlFor="mainstream-asr-model-setting" className={labelClassName}>
              模型
            </label>
            <select
              id="mainstream-asr-model-setting"
              value={mainstreamAsrModel}
              onChange={(event) => setMainstreamAsrModel(event.target.value as MainstreamAsrModel)}
              disabled={disabled}
              className={`mt-2 ${inputClassName}`}
            >
              {mainstreamAsrModelOrder.map((model) => {
                const optionDescriptor = getMainstreamAsrModelDescriptor(model);
                return (
                  <option key={model} value={model}>
                    {mainstreamAsrModelDisplayNames[model]} · {optionDescriptor.vendor}
                  </option>
                );
              })}
            </select>
            <p className={helpTextClassName}>{descriptor.notes}</p>
          </div>
          <CredentialInput
            id="mainstream-asr-api-key-setting"
            label="API Key"
            type="password"
            value={mainstreamAsrApiKey}
            onChange={setMainstreamAsrApiKey}
            disabled={disabled}
            placeholder="当前模型厂商的 API Key"
            helpText={`用于调用 ${descriptor.label}。切换厂商时请确认这里填写的是对应平台的密钥。`}
          />
          <CredentialInput
            id="mainstream-asr-base-url-setting"
            label="Base URL（可选）"
            type="url"
            value={mainstreamAsrBaseUrl}
            onChange={setMainstreamAsrBaseUrl}
            disabled={disabled}
            placeholder={baseUrlPlaceholder}
            helpText="留空使用官方端点；只有兼容网关、代理或自托管服务需要填写。"
          />
        </div>
      </SectionBlock>
    );
  }

  return null;
};
