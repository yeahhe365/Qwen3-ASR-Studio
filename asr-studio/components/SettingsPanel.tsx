import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { Language, CompressionLevel, ApiProvider } from '../types';

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
  apiProvider: ApiProvider;
  setApiProvider: (provider: ApiProvider) => void;
  modelScopeApiUrl: string;
  setModelScopeApiUrl: (url: string) => void;
  bailianApiKey: string;
  setBailianApiKey: (key: string) => void;
  onClearHistory: () => void;
  onRestoreDefaults: () => void;
  disabled?: boolean;
  canInstall: boolean;
  onInstallApp: () => void;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean; id: string; }> = ({ enabled, onChange, disabled, id }) => {
  return (
    <button
      type="button"
      id={id}
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-200 focus:ring-brand-primary ${
        enabled ? 'bg-brand-primary' : 'bg-base-300'
      } disabled:opacity-60`}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

const languageDisplayNames: Record<Language, string> = {
  [Language.AUTO]: "自动识别",
  [Language.CHINESE]: "中文",
  [Language.ENGLISH]: "英文",
  [Language.JAPANESE]: "日文",
  [Language.KOREAN]: "韩文",
  [Language.SPANISH]: "西班牙文",
  [Language.FRENCH]: "法文",
  [Language.GERMAN]: "德文",
  [Language.ARABIC]: "阿拉伯文",
  [Language.ITALIAN]: "意大利文",
  [Language.RUSSIAN]: "俄文",
  [Language.PORTUGUESE]: "葡萄牙文",
};

const compressionLevelDisplayNames: Record<CompressionLevel, string> = {
  [CompressionLevel.ORIGINAL]: "原始",
  [CompressionLevel.MEDIUM]: "中等",
  [CompressionLevel.MINIMUM]: "最小",
};

type SettingTab = 'general' | 'transcription' | 'about';

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
  apiProvider,
  setApiProvider,
  modelScopeApiUrl,
  setModelScopeApiUrl,
  bailianApiKey,
  setBailianApiKey,
  onClearHistory,
  onRestoreDefaults,
  disabled,
  canInstall,
  onInstallApp,
}) => {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>('general');

  if (!isOpen) return null;

  const handleClearHistory = () => setIsConfirmingClear(true);
  const confirmClearHistory = () => {
    onClearHistory();
    setIsConfirmingClear(false);
  }

  const handleRestoreDefaults = () => setIsConfirmingRestore(true);
  const confirmRestoreDefaults = () => {
    onRestoreDefaults();
    setIsConfirmingRestore(false);
  }

  const TabButton: React.FC<{ tabName: SettingTab; label: string }> = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        activeTab === tabName
          ? 'bg-brand-primary text-white shadow-sm'
          : 'text-content-200 hover:bg-base-300/60 hover:text-content-100'
      }`}
      role="tab"
      aria-selected={activeTab === tabName}
    >
      {label}
    </button>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-base font-medium">主题</label>
              <div className="flex items-center gap-2 p-1 rounded-lg bg-base-100 border border-base-300">
                <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${theme === 'light' ? 'bg-brand-primary text-white' : 'hover:bg-base-300'}`}>浅色</button>
                <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'bg-brand-primary text-white' : 'hover:bg-base-300'}`}>深色</button>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="auto-copy" className="text-base font-medium flex-1">
                自动复制结果
                <p className="text-sm text-content-200 font-normal">识别完成后自动将结果复制到剪贴板。</p>
              </label>
              <ToggleSwitch id="auto-copy" enabled={autoCopy} onChange={setAutoCopy} />
            </div>
            {canInstall && (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-base font-medium">
                  安装应用
                  <p className="text-sm text-content-200 font-normal">将应用安装到设备，以便离线访问。</p>
                </label>
                <button onClick={onInstallApp} className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-white bg-brand-primary hover:bg-brand-secondary">安装</button>
              </div>
            )}
            <hr className="border-base-300" />
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-base font-medium">
                恢复默认设置
                <p className="text-sm text-content-200 font-normal">将所有设置重置为初始状态。</p>
              </label>
              <button onClick={handleRestoreDefaults} disabled={disabled} className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-content-100 bg-base-300 hover:bg-base-300/80 disabled:opacity-60">恢复默认</button>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-base font-medium">
                清除历史记录
                <p className="text-sm text-content-200 font-normal">删除所有已保存的识别结果。</p>
              </label>
              <button onClick={handleClearHistory} disabled={disabled} className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed">立即清除</button>
            </div>
          </div>
        );
      case 'transcription':
        return (
          <div className="space-y-6">
             <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-base font-medium">API 提供商</label>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-base-100 border border-base-300">
                <button onClick={() => setApiProvider(ApiProvider.MODELSCOPE)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${apiProvider === ApiProvider.MODELSCOPE ? 'bg-brand-primary text-white' : 'hover:bg-base-300'}`}>ModelScope</button>
                <button onClick={() => setApiProvider(ApiProvider.BAILIAN)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${apiProvider === ApiProvider.BAILIAN ? 'bg-brand-primary text-white' : 'hover:bg-base-300'}`}>阿里云百炼</button>
              </div>
            </div>
            {apiProvider === ApiProvider.BAILIAN && (
              <div>
                <label htmlFor="bailian-api-key-setting" className="text-base font-medium">
                  API Key
                  <p className="text-sm text-content-200 font-normal">从 <a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">阿里云百炼平台</a> 获取。</p>
                </label>
                <input id="bailian-api-key-setting" type="password" value={bailianApiKey} onChange={(e) => setBailianApiKey(e.target.value)} disabled={disabled} placeholder="sk-xxxxxxxxxxxxxxxx" className="mt-2 w-full px-3 py-2 text-sm rounded-md shadow-sm bg-base-100 border border-base-300 text-content-100 placeholder-content-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60" />
              </div>
            )}
            {apiProvider === ApiProvider.MODELSCOPE && (
              <div>
                <label htmlFor="modelscope-api-url-setting" className="text-base font-medium">
                  API Base URL
                  <p className="text-sm text-content-200 font-normal">自定义 ModelScope API 端点 URL。</p>
                </label>
                <input id="modelscope-api-url-setting" type="text" value={modelScopeApiUrl} onChange={(e) => setModelScopeApiUrl(e.target.value)} disabled={disabled} placeholder="https://.../api/asr-inference" className="mt-2 w-full px-3 py-2 text-sm rounded-md shadow-sm bg-base-100 border border-base-300 text-content-100 placeholder-content-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60" />
              </div>
            )}
            <hr className="border-base-300" />
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="language-setting" className="text-base font-medium">语言</label>
              <select id="language-setting" value={language} onChange={(e) => setLanguage(e.target.value as Language)} disabled={disabled} className="w-full sm:w-56 px-3 py-2 text-sm rounded-md shadow-sm bg-base-100 border border-base-300 text-content-100 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60">
                {Object.values(Language).map((langValue) => (<option key={langValue} value={langValue}>{languageDisplayNames[langValue]}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="context-setting" className="text-base font-medium">
                上下文 (可选)
                <p className="text-sm text-content-200 font-normal">提供上下文以提高准确性，例如：人名、术语。</p>
              </label>
              <textarea id="context-setting" rows={3} value={context} onChange={(e) => setContext(e.target.value)} disabled={disabled} placeholder="人名、术语等..." className="mt-2 w-full px-3 py-2 text-sm rounded-md shadow-sm bg-base-100 border border-base-300 text-content-100 placeholder-content-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60" />
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="itn-setting" className="text-base font-medium flex-1">启用反向文本标准化 (ITN)</label>
              <ToggleSwitch id="itn-setting" enabled={enableItn} onChange={setEnableItn} disabled={disabled} />
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="audio-device-setting" className="text-base font-medium">录音设备</label>
              <select id="audio-device-setting" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)} disabled={disabled || audioDevices.length === 0} className="w-full sm:w-56 px-3 py-2 text-sm rounded-md shadow-sm bg-base-100 border border-base-300 text-content-100 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-60">
                <option value="default">默认设备</option>
                {audioDevices.map((device) => (<option key={device.deviceId} value={device.deviceId}>{device.label || `设备 ${device.deviceId.substring(0, 8)}`}</option>))}
              </select>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-base font-medium">
                音频压缩
                <p className="text-sm text-content-200 font-normal">减小文件大小以加快上传速度。</p>
              </label>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-base-100 border border-base-300">
                {Object.values(CompressionLevel).map((level) => (<button key={level} onClick={() => setCompressionLevel(level)} disabled={disabled} className={`px-2 py-1 text-sm font-medium rounded-md transition-colors ${compressionLevel === level ? 'bg-brand-primary text-white' : 'hover:bg-base-300'}`}>{compressionLevelDisplayNames[level]}</button>))}
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-4 flex flex-col">
            <img 
              src="https://modelscope.oss-cn-beijing.aliyuncs.com/resource/00EE8C99-9C05-4236-A6D0-B58FF172D31B.png"
              alt="ASR Studio Logo"
              className="h-16 w-auto mx-auto mb-2" 
            />
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-content-100">关于 ASR Studio</h3>
              <span className="text-xs font-mono text-content-200 bg-base-100 px-2 py-1 rounded-md">v1.1.0</span>
            </div>
            <div>
              <p className="text-sm text-content-200">您可以在 GitHub 上找到此项目的源代码。</p>
              <a href="https://github.com/yeahhe365/ASR-Studio" target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-brand-primary hover:underline">GitHub 仓库</a>
            </div>
            <div>
              <p className="text-sm text-content-200">您可以在此处找到 ModelScope API 文档。</p>
              <a href="https://c0rpr74ughd0-deploy.space.z.ai/" target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-brand-primary hover:underline block truncate">https://c0rpr74ughd0-deploy.space.z.ai/</a>
            </div>
            <div>
              <p className="text-sm text-content-200">您可以在此处找到阿里云百炼 API 文档。</p>
              <a href="https://r0vrc7kjd4q0-deploy.space.z.ai/" target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-brand-primary hover:underline block truncate">https://r0vrc7kjd4q0-deploy.space.z.ai/</a>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50" aria-labelledby="settings-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" aria-hidden="true" onClick={onClose}></div>
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="relative flex max-h-[90vh] w-full max-w-xl transform flex-col overflow-hidden rounded-lg border border-base-300 bg-base-200 text-content-100 shadow-xl transition-all">
          <div className="flex flex-shrink-0 items-start justify-between gap-4 bg-base-200 p-5 pb-4 sm:p-6">
            <div>
              <h2 id="settings-title" className="text-xl font-bold">设置</h2>
              <p className="mt-1 text-sm text-content-200">调整识别、录音和应用偏好。</p>
            </div>
            <button onClick={onClose} aria-label="关闭设置" className="rounded-lg p-2 text-content-200 transition-colors hover:bg-base-300 hover:text-content-100">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-shrink-0 border-y border-base-300 px-5 py-3 sm:px-6">
            <nav className="grid grid-cols-3 gap-1 rounded-lg border border-base-300 bg-base-100 p-1" role="tablist" aria-label="设置">
              <TabButton tabName="general" label="常规" />
              <TabButton tabName="transcription" label="转录" />
              <TabButton tabName="about" label="关于" />
            </nav>
          </div>
          <div className="h-[min(600px,62vh)] flex-grow overflow-y-auto p-5 sm:p-6" role="tabpanel">
            {renderTabContent()}
          </div>
        </div>
      </div>
      {isConfirmingClear && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" aria-hidden="true" onClick={() => setIsConfirmingClear(false)}></div>
            <div className="relative w-full max-w-sm p-6 bg-base-200 text-content-100 rounded-lg shadow-xl border border-base-300">
                <h3 className="text-lg font-bold">确认清除历史记录</h3>
                <p className="mt-2 text-sm text-content-200">您确定要清除所有识别历史记录吗？此操作无法撤销。</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setIsConfirmingClear(false)} className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-base-300 text-content-100 hover:bg-base-300/80">取消</button>
                    <button onClick={confirmClearHistory} className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-white bg-red-600 hover:bg-red-700">确认清除</button>
                </div>
            </div>
        </div>
      )}
      {isConfirmingRestore && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" aria-hidden="true" onClick={() => setIsConfirmingRestore(false)}></div>
            <div className="relative w-full max-w-sm p-6 bg-base-200 text-content-100 rounded-lg shadow-xl border border-base-300">
                <h3 className="text-lg font-bold">确认恢复默认设置</h3>
                <p className="mt-2 text-sm text-content-200">您确定要将所有设置恢复为默认值吗？此操作无法撤销。</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setIsConfirmingRestore(false)} className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-base-300 text-content-100 hover:bg-base-300/80">取消</button>
                    <button onClick={confirmRestoreDefaults} className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-white bg-brand-primary hover:bg-brand-secondary">确认恢复</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
