import React, { useMemo, useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { LanguageIcon } from './icons/LanguageIcon';
import { LogoIcon } from './icons/LogoIcon';
import { RestoreIcon } from './icons/RestoreIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import {
  DOUBAO_ASR_API_URL,
  DOUBAO_ASR_MODEL,
  DOUBAO_ASR_RESOURCE_ID,
  GEMINI_ASR_API_URL,
  GEMINI_ASR_MODEL,
  QWEN_ASR_API_URL,
  QWEN_ASR_MODEL,
} from '../constants';
import { AsrProvider, CompressionLevel, Language } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  autoCopy: boolean;
  setAutoCopy: (autoCopy: boolean) => void;
  context: string;
  setContext: (context: string) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  enableItn: boolean;
  setEnableItn: (enable: boolean) => void;
  compressionLevel: CompressionLevel;
  setCompressionLevel: (level: CompressionLevel) => void;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
  asrProvider: AsrProvider;
  setAsrProvider: (provider: AsrProvider) => void;
  qwenApiKey: string;
  setQwenApiKey: (key: string) => void;
  doubaoApiKey: string;
  setDoubaoApiKey: (key: string) => void;
  doubaoAccessKey: string;
  setDoubaoAccessKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  onClearHistory: () => void;
  onRestoreDefaults: () => void;
  disabled?: boolean;
  canInstall: boolean;
  onInstallApp: () => void;
}

type SettingTab = 'api' | 'recognition' | 'interface' | 'data' | 'about';

type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

interface SettingTabDescriptor {
  id: SettingTab;
  label: string;
  description: string;
  Icon: IconComponent;
}

const tabs: SettingTabDescriptor[] = [
  { id: 'api', label: 'API', description: '配置识别服务和密钥。', Icon: SettingsIcon },
  { id: 'recognition', label: '识别', description: '调整语言、提示和音频处理。', Icon: SoundWaveIcon },
  { id: 'interface', label: '界面', description: '调整外观和输出偏好。', Icon: LanguageIcon },
  { id: 'data', label: '数据', description: '管理应用安装、重置和历史记录。', Icon: RestoreIcon },
  { id: 'about', label: '关于', description: '查看版本和项目入口。', Icon: LogoIcon },
];

const tabGroups: Array<{ id: string; tabIds: SettingTab[] }> = [
  { id: 'primary', tabIds: ['api', 'recognition', 'interface', 'data'] },
  { id: 'about', tabIds: ['about'] },
];

const languageDisplayNames: Record<Language, string> = {
  [Language.AUTO]: '自动识别',
  [Language.CHINESE]: '中文',
  [Language.ENGLISH]: '英文',
  [Language.JAPANESE]: '日文',
  [Language.KOREAN]: '韩文',
  [Language.SPANISH]: '西班牙文',
  [Language.FRENCH]: '法文',
  [Language.GERMAN]: '德文',
  [Language.ARABIC]: '阿拉伯文',
  [Language.ITALIAN]: '意大利文',
  [Language.RUSSIAN]: '俄文',
  [Language.PORTUGUESE]: '葡萄牙文',
};

const compressionLevelDisplayNames: Record<CompressionLevel, string> = {
  [CompressionLevel.ORIGINAL]: '原始',
  [CompressionLevel.MEDIUM]: '中等',
  [CompressionLevel.MINIMUM]: '最小',
};

const inputClassName =
  'w-full rounded-lg border border-base-300 bg-base-200 px-3 py-2.5 text-sm text-content-100 shadow-sm transition-colors placeholder-content-200 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-60';

const outlineButtonClassName =
  'inline-flex items-center justify-center rounded-lg border border-base-300 bg-transparent px-3 py-1.5 text-xs font-medium text-content-200 transition-colors hover:bg-base-300/50 hover:text-content-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-50';

const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  id: string;
}> = ({ enabled, onChange, disabled, id }) => (
  <button
    type="button"
    id={id}
    onClick={() => onChange(!enabled)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 focus:ring-offset-base-200 disabled:cursor-not-allowed disabled:opacity-60 ${
      enabled ? 'bg-brand-primary' : 'bg-base-300'
    }`}
    aria-pressed={enabled}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const SectionBlock: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className }) => (
  <section className={`py-2 ${className || ''}`}>
    <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-200">
      {icon}
      {title}
    </h4>
    <div className="divide-y divide-base-300/60">{children}</div>
  </section>
);

const SettingRow: React.FC<{
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}> = ({ label, description, icon, children, className, labelClassName }) => (
  <div className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${className || ''}`}>
    <div className="flex min-w-0 items-start gap-3">
      {icon && <div className="mt-0.5 flex-shrink-0 text-content-200">{icon}</div>}
      <div className="min-w-0">
        <p className={`text-sm font-medium ${labelClassName || 'text-content-100'}`}>{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-content-200">{description}</p>}
      </div>
    </div>
    <div className="flex w-full flex-shrink-0 items-center gap-2 sm:w-auto sm:justify-end">{children}</div>
  </div>
);

const SegmentedControl = <T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled,
}: {
  ariaLabel: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className="grid w-full grid-cols-[repeat(var(--segments),minmax(0,1fr))] gap-1 rounded-lg border border-base-300 bg-base-100 p-1 shadow-sm sm:w-auto"
    style={{ '--segments': options.length } as React.CSSProperties}
  >
    {options.map((option) => {
      const isActive = value === option.value;

      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          aria-pressed={isActive}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive
              ? 'bg-base-200 text-content-100 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const ProviderSummary: React.FC<{
  title: string;
  details: string;
  note?: string;
}> = ({ title, details, note }) => (
  <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
    <p className="text-sm font-semibold text-content-100">{title}</p>
    <p className="mt-1 break-all font-mono text-xs leading-relaxed text-content-200">{details}</p>
    {note && <p className="mt-3 text-xs leading-relaxed text-content-200">{note}</p>}
  </div>
);

const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  isDanger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ title, message, confirmLabel, isDanger, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-sm rounded-xl border border-base-300 bg-base-200 p-5 text-content-100 shadow-2xl">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-content-200">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-base-300 bg-transparent px-4 py-2 text-sm font-medium text-content-200 transition-colors hover:bg-base-300/50 hover:text-content-100"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
            isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-secondary'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  theme,
  setTheme,
  autoCopy,
  setAutoCopy,
  context,
  setContext,
  language,
  setLanguage,
  enableItn,
  setEnableItn,
  compressionLevel,
  setCompressionLevel,
  audioDevices,
  selectedDeviceId,
  setSelectedDeviceId,
  asrProvider,
  setAsrProvider,
  qwenApiKey,
  setQwenApiKey,
  doubaoApiKey,
  setDoubaoApiKey,
  doubaoAccessKey,
  setDoubaoAccessKey,
  geminiApiKey,
  setGeminiApiKey,
  onClearHistory,
  onRestoreDefaults,
  disabled,
  canInstall,
  onInstallApp,
}) => {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>('api');

  const tabsById = useMemo(() => new Map(tabs.map((tab) => [tab.id, tab])), []);
  const activeTabDescriptor = tabsById.get(activeTab);

  if (!isOpen) return null;

  const confirmClearHistory = () => {
    onClearHistory();
    setIsConfirmingClear(false);
  };

  const confirmRestoreDefaults = () => {
    onRestoreDefaults();
    setIsConfirmingRestore(false);
  };

  const renderApiSection = () => (
    <div className="space-y-6">
      <SectionBlock title="服务模式" icon={<SettingsIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="API 提供商" description="选择当前用于语音识别的模型服务。">
          <SegmentedControl
            ariaLabel="API 提供商"
            value={asrProvider}
            onChange={setAsrProvider}
            disabled={disabled}
            options={[
              { value: AsrProvider.QWEN, label: 'Qwen' },
              { value: AsrProvider.DOUBAO, label: '豆包' },
              { value: AsrProvider.GEMINI, label: 'Gemini' },
            ]}
          />
        </SettingRow>
      </SectionBlock>

      {asrProvider === AsrProvider.QWEN && (
        <div className="space-y-4">
          <ProviderSummary
            title="Qwen 官方 API"
            details={`${QWEN_ASR_MODEL} · ${QWEN_ASR_API_URL}`}
          />
          <SectionBlock title="凭据">
            <div className="py-3">
              <label htmlFor="qwen-api-key-setting" className="text-xs font-semibold uppercase tracking-wider text-content-200">
                API Key
              </label>
              <input
                id="qwen-api-key-setting"
                type="password"
                value={qwenApiKey}
                onChange={(event) => setQwenApiKey(event.target.value)}
                disabled={disabled}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className={`mt-2 ${inputClassName}`}
              />
              <p className="mt-2 text-xs leading-relaxed text-content-200">用于调用 Qwen 官方 OpenAI 兼容接口。</p>
            </div>
          </SectionBlock>
        </div>
      )}

      {asrProvider === AsrProvider.DOUBAO && (
        <div className="space-y-4">
          <ProviderSummary
            title="豆包语音识别极速版"
            details={`${DOUBAO_ASR_MODEL} · ${DOUBAO_ASR_RESOURCE_ID} · ${DOUBAO_ASR_API_URL}`}
            note="当前使用音频 Base64 直传、自动语种识别、ITN 和标点；上下文提示仅 Qwen 模式使用。"
          />
          <SectionBlock title="凭据">
            <div className="space-y-4 py-3">
              <div>
                <label htmlFor="doubao-api-key-setting" className="text-xs font-semibold uppercase tracking-wider text-content-200">
                  API Key / App Key
                </label>
                <input
                  id="doubao-api-key-setting"
                  type="password"
                  value={doubaoApiKey}
                  onChange={(event) => setDoubaoApiKey(event.target.value)}
                  disabled={disabled}
                  placeholder="your-api-key-or-app-key"
                  className={`mt-2 ${inputClassName}`}
                />
                <p className="mt-2 text-xs leading-relaxed text-content-200">新版控制台填写 API Key；旧版鉴权填写 App Key 并补充 Access Key。</p>
              </div>
              <div>
                <label htmlFor="doubao-access-key-setting" className="text-xs font-semibold uppercase tracking-wider text-content-200">
                  Access Key（可选）
                </label>
                <input
                  id="doubao-access-key-setting"
                  type="password"
                  value={doubaoAccessKey}
                  onChange={(event) => setDoubaoAccessKey(event.target.value)}
                  disabled={disabled}
                  placeholder="旧版 Access Key，可留空"
                  className={`mt-2 ${inputClassName}`}
                />
                <p className="mt-2 text-xs leading-relaxed text-content-200">仅旧版鉴权需要；留空时使用新版 X-Api-Key 鉴权。</p>
              </div>
            </div>
          </SectionBlock>
        </div>
      )}

      {asrProvider === AsrProvider.GEMINI && (
        <div className="space-y-4">
          <ProviderSummary
            title="Google Gemini API"
            details={`${GEMINI_ASR_MODEL} · ${GEMINI_ASR_API_URL}`}
            note="当前使用 Gemini 多模态音频输入，语言、ITN 与上下文通过提示词传入。"
          />
          <SectionBlock title="凭据">
            <div className="py-3">
              <label htmlFor="gemini-api-key-setting" className="text-xs font-semibold uppercase tracking-wider text-content-200">
                API Key
              </label>
              <input
                id="gemini-api-key-setting"
                type="password"
                value={geminiApiKey}
                onChange={(event) => setGeminiApiKey(event.target.value)}
                disabled={disabled}
                placeholder="AIza..."
                className={`mt-2 ${inputClassName}`}
              />
              <p className="mt-2 text-xs leading-relaxed text-content-200">用于调用 Google Gemini generateContent 接口。</p>
            </div>
          </SectionBlock>
        </div>
      )}
    </div>
  );

  const renderRecognitionSection = () => (
    <div className="space-y-6">
      <SectionBlock title="语言与文本" icon={<LanguageIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="语言" description="指定识别语言，或保持自动识别。">
          <select
            id="language-setting"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            disabled={disabled}
            className={`${inputClassName} sm:w-56`}
          >
            {Object.values(Language).map((langValue) => (
              <option key={langValue} value={langValue}>
                {languageDisplayNames[langValue]}
              </option>
            ))}
          </select>
        </SettingRow>
        <div className="py-3">
          <label htmlFor="context-setting" className="text-sm font-medium text-content-100">
            上下文（可选）
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-content-200">提供上下文以提高准确性，例如：人名、术语。</p>
          <textarea
            id="context-setting"
            rows={4}
            value={context}
            onChange={(event) => setContext(event.target.value)}
            disabled={disabled}
            placeholder="人名、术语等..."
            className={`mt-2 resize-y ${inputClassName}`}
          />
        </div>
        <SettingRow label="启用反向文本标准化 (ITN)" description="把数字、日期等内容转成更自然的文本格式。">
          <ToggleSwitch id="itn-setting" enabled={enableItn} onChange={setEnableItn} disabled={disabled} />
        </SettingRow>
      </SectionBlock>

      <SectionBlock title="音频" icon={<SoundWaveIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="录音设备" description="选择浏览器录音时使用的输入设备。">
          <select
            id="audio-device-setting"
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            disabled={disabled || audioDevices.length === 0}
            className={`${inputClassName} sm:w-56`}
          >
            <option value="default">默认设备</option>
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `设备 ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label="音频压缩" description="减小文件大小以加快上传速度。">
          <SegmentedControl
            ariaLabel="音频压缩"
            value={compressionLevel}
            onChange={setCompressionLevel}
            disabled={disabled}
            options={Object.values(CompressionLevel).map((level) => ({
              value: level,
              label: compressionLevelDisplayNames[level],
            }))}
          />
        </SettingRow>
      </SectionBlock>
    </div>
  );

  const renderInterfaceSection = () => (
    <div className="space-y-6">
      <SectionBlock title="界面" icon={<LanguageIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="主题" description="切换浅色或深色外观。">
          <SegmentedControl
            ariaLabel="主题"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
            ]}
          />
        </SettingRow>
        <SettingRow label="自动复制结果" description="识别完成后自动将结果复制到剪贴板。">
          <ToggleSwitch id="auto-copy" enabled={autoCopy} onChange={setAutoCopy} disabled={disabled} />
        </SettingRow>
      </SectionBlock>
    </div>
  );

  const renderDataSection = () => (
    <div className="space-y-6">
      <SectionBlock title="系统工具" icon={<SettingsIcon className="h-3.5 w-3.5" />}>
        <SettingRow label="安装应用" description={canInstall ? '将应用安装到设备，以便离线访问。' : '当前浏览器暂不提供安装入口。'}>
          <button type="button" onClick={onInstallApp} disabled={!canInstall} className={outlineButtonClassName}>
            安装
          </button>
        </SettingRow>
      </SectionBlock>

      <section className="rounded-xl border border-red-800/50 bg-gradient-to-br from-red-600 to-red-700 p-5 text-white shadow-lg">
        <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
          <DeleteIcon className="h-4 w-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider">危险区</h4>
        </div>
        <div className="divide-y divide-white/10">
          <SettingRow
            label="恢复默认设置"
            description="将所有设置重置为初始状态。"
            icon={<RestoreIcon className="h-4 w-4" />}
            labelClassName="text-white"
          >
            <button
              type="button"
              onClick={() => setIsConfirmingRestore(true)}
              disabled={disabled}
              className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              恢复默认
            </button>
          </SettingRow>
          <SettingRow
            label="清除历史记录"
            description="删除所有已保存的识别结果。"
            icon={<DeleteIcon className="h-4 w-4" />}
            labelClassName="text-white"
          >
            <button
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              disabled={disabled}
              className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              立即清除
            </button>
          </SettingRow>
        </div>
      </section>
    </div>
  );

  const renderAboutSection = () => (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-primary text-white shadow-2xl shadow-brand-primary/20">
        <LogoIcon className="h-12 w-12" />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-base-300 bg-base-100 px-4 py-1.5 font-mono text-sm font-bold text-content-100">
          v1.1.0
        </span>
        <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">ASR Studio</span>
      </div>
      <p className="mt-4 max-w-md text-sm leading-6 text-content-200">
        面向日常转写、录音和多厂商 ASR 调用的轻量语音识别工作台。
      </p>
      <a
        href="https://github.com/yeahhe365/ASR-Studio"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#24292F] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#24292F]/90 hover:shadow-xl active:translate-y-0 sm:w-auto"
      >
        GitHub 仓库
      </a>
    </div>
  );

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'api':
        return renderApiSection();
      case 'recognition':
        return renderRecognitionSection();
      case 'interface':
        return renderInterfaceSection();
      case 'data':
        return renderDataSection();
      case 'about':
        return renderAboutSection();
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4"
        aria-labelledby="settings-title"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="flex h-[100dvh] w-full transform flex-col overflow-hidden bg-base-200 text-content-100 shadow-2xl transition-all sm:h-[85vh] sm:max-h-[800px] sm:w-[90vw] sm:max-w-6xl sm:rounded-xl md:flex-row"
          onClick={(event) => event.stopPropagation()}
        >
          <aside className="flex w-full flex-shrink-0 flex-col border-b border-base-300 bg-base-100 md:w-64 md:border-b-0 md:border-r">
            <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 md:px-5 md:py-5">
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭设置"
                className="rounded-md p-2 text-content-200 transition-colors hover:bg-base-300/50 hover:text-content-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
              <span id="settings-title" className="font-semibold text-content-100 md:hidden">
                设置
              </span>
              <div className="w-9 md:hidden" />
            </div>

            <nav
              className="flex flex-1 gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:gap-1.5 md:overflow-x-hidden md:overflow-y-auto md:px-3 md:pb-3"
              role="tablist"
              aria-label="设置"
            >
              {tabGroups.map((group) => (
                <div key={group.id} className="flex flex-shrink-0 gap-1 md:w-full md:flex-col md:gap-1.5">
                  {group.tabIds.map((tabId) => {
                    const tab = tabsById.get(tabId);

                    if (!tab) return null;

                    const isActive = activeTab === tab.id;
                    const Icon = tab.Icon;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        role="tab"
                        aria-selected={isActive}
                        className={`flex w-auto flex-shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium outline-none transition-all md:w-full md:gap-3 md:px-4 md:py-3 ${
                          isActive
                            ? 'bg-base-200 text-content-100 shadow-sm'
                            : 'text-content-200 hover:bg-base-300/50 hover:text-content-100'
                        } focus-visible:ring-2 focus-visible:ring-brand-primary/40`}
                      >
                        <Icon className={`h-4 w-4 md:h-[18px] md:w-[18px] ${isActive ? 'text-content-100' : 'text-content-200'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-base-200">
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
              <div className="mx-auto hidden w-full max-w-3xl pb-6 md:block">
                <h2 className="text-xl font-semibold text-content-100">{activeTabDescriptor?.label}</h2>
                <p className="mt-1 text-sm text-content-200">{activeTabDescriptor?.description}</p>
              </div>
              <div className="mx-auto w-full max-w-3xl">{renderActiveContent()}</div>
            </div>
          </main>
        </div>
      </div>

      {isConfirmingClear && (
        <ConfirmDialog
          title="确认清除历史记录"
          message="您确定要清除所有识别历史记录吗？此操作无法撤销。"
          confirmLabel="确认清除"
          isDanger
          onCancel={() => setIsConfirmingClear(false)}
          onConfirm={confirmClearHistory}
        />
      )}

      {isConfirmingRestore && (
        <ConfirmDialog
          title="确认恢复默认设置"
          message="您确定要将所有设置恢复为默认值吗？此操作无法撤销。"
          confirmLabel="确认恢复"
          onCancel={() => setIsConfirmingRestore(false)}
          onConfirm={confirmRestoreDefaults}
        />
      )}
    </>
  );
};
