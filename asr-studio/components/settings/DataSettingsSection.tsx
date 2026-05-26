import React, { useRef } from 'react';
import { AppWindowIcon } from '../icons/AppWindowIcon';
import { DatabaseIcon } from '../icons/DatabaseIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { RestoreIcon } from '../icons/RestoreIcon';
import { StorageIcon } from '../icons/StorageIcon';
import { ToolboxIcon } from '../icons/ToolboxIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { WarningIcon } from '../icons/WarningIcon';
import { dangerButtonClassName, outlineButtonClassName, SectionBlock, SettingRow } from './SettingsControls';
import type { SettingsDataOperation, SettingsPanelProps } from './settingsTypes';
import { formatByteSize } from '../../services/fileUtils';

type DataSettingsSectionProps = Pick<SettingsPanelProps, 'canInstall' | 'onInstallApp' | 'disabled'> & {
  storageEstimate: SettingsPanelProps['storageEstimate'];
  onClearTranscriptionCache: SettingsPanelProps['onClearTranscriptionCache'];
  onClearRecordingCache: SettingsPanelProps['onClearRecordingCache'];
  onImportHistory: SettingsPanelProps['onImportHistory'];
  onRequestClearHistory: () => void;
  onRequestRestoreDefaults: () => void;
  pendingOperation: SettingsDataOperation | null;
};

export const DataSettingsSection: React.FC<DataSettingsSectionProps> = ({
  canInstall,
  onInstallApp,
  disabled,
  storageEstimate,
  onClearTranscriptionCache,
  onClearRecordingCache,
  onImportHistory,
  onRequestClearHistory,
  onRequestRestoreDefaults,
  pendingOperation,
}) => {
  const historyImportInputRef = useRef<HTMLInputElement>(null);
  const isOperationPending = Boolean(pendingOperation);
  const controlsDisabled = disabled || isOperationPending;
  const isPending = (operation: SettingsDataOperation) => pendingOperation === operation;

  const handleInstallApp = () => {
    if (!canInstall || controlsDisabled) {
      return;
    }

    onInstallApp();
  };

  const handleHistoryImportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (controlsDisabled) {
      return;
    }

    if (file) {
      onImportHistory(file);
    }
  };

  const handleChooseHistoryFile = () => {
    if (controlsDisabled) {
      return;
    }

    historyImportInputRef.current?.click();
  };

  const handleRequestRestoreDefaults = () => {
    if (!controlsDisabled) {
      onRequestRestoreDefaults();
    }
  };

  const handleClearTranscriptionCache = () => {
    if (!controlsDisabled) {
      onClearTranscriptionCache();
    }
  };

  const handleClearRecordingCache = () => {
    if (!controlsDisabled) {
      onClearRecordingCache();
    }
  };

  const handleRequestClearHistory = () => {
    if (!controlsDisabled) {
      onRequestClearHistory();
    }
  };

  return (
    <div className="space-y-6">
      <SectionBlock title="系统工具" icon={<ToolboxIcon className="h-3.5 w-3.5" />}>
        <SettingRow
          label="安装应用"
          description={canInstall ? '将应用安装到设备，以便离线访问。' : '当前浏览器暂无安装入口。'}
          icon={<AppWindowIcon className="h-4 w-4" />}
        >
          <button
            type="button"
            onClick={handleInstallApp}
            disabled={!canInstall || controlsDisabled}
            className={outlineButtonClassName}
          >
            {isPending('install') ? '安装中' : '安装'}
          </button>
        </SettingRow>
        <SettingRow
          label="导入历史记录"
          description="从此前导出的 JSON 文件恢复转写文本、分段与元数据。"
          icon={<UploadIcon className="h-4 w-4" />}
        >
          <input
            ref={historyImportInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleHistoryImportChange}
            disabled={controlsDisabled}
          />
          <button
            type="button"
            onClick={handleChooseHistoryFile}
            disabled={controlsDisabled}
            className={outlineButtonClassName}
          >
            {isPending('importHistory') ? '导入中' : '选择 JSON'}
          </button>
        </SettingRow>
        <SettingRow
          label="本地存储"
          description={
            storageEstimate
              ? `${formatByteSize(storageEstimate.usage)} / ${formatByteSize(storageEstimate.quota)}`
              : '当前浏览器不支持精确估算。'
          }
          icon={<StorageIcon className="h-4 w-4" />}
        >
          <span className="rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-3 py-1.5 font-mono text-xs text-[var(--theme-text-secondary)]">
            {storageEstimate && storageEstimate.quota > 0
              ? `${Math.round((storageEstimate.usage / storageEstimate.quota) * 100)}%`
              : 'N/A'}
          </span>
        </SettingRow>
      </SectionBlock>

      <section className="rounded-lg border border-red-500/25 bg-red-500/10 p-5 text-red-700 shadow-sm dark:text-red-300">
        <div className="mb-3 flex items-center gap-2">
          <WarningIcon className="h-4 w-4" />
          <h4 className="text-xs font-bold uppercase">危险区</h4>
        </div>
        <div className="space-y-1">
          <SettingRow
            label="恢复默认设置"
            description="将所有设置重置为初始状态。"
            icon={<RestoreIcon className="h-4 w-4" />}
            labelClassName="text-red-700 dark:text-red-300"
          >
            <button
              type="button"
              onClick={handleRequestRestoreDefaults}
              disabled={controlsDisabled}
              className={dangerButtonClassName}
            >
              {isPending('restoreDefaults') ? '恢复中' : '恢复默认'}
            </button>
          </SettingRow>
          <SettingRow
            label="清除识别缓存"
            description="删除同一音频重复识别时复用的结果缓存，不影响历史记录。"
            icon={<StorageIcon className="h-4 w-4" />}
            labelClassName="text-red-700 dark:text-red-300"
          >
            <button
              type="button"
              onClick={handleClearTranscriptionCache}
              disabled={controlsDisabled}
              className={dangerButtonClassName}
            >
              {isPending('clearTranscriptionCache') ? '清除中' : '清除缓存'}
            </button>
          </SettingRow>
          <SettingRow
            label="清除最近录音"
            description="删除上次录音的恢复缓存。"
            icon={<StorageIcon className="h-4 w-4" />}
            labelClassName="text-red-700 dark:text-red-300"
          >
            <button
              type="button"
              onClick={handleClearRecordingCache}
              disabled={controlsDisabled}
              className={dangerButtonClassName}
            >
              {isPending('clearRecordingCache') ? '清除中' : '清除录音'}
            </button>
          </SettingRow>
          <SettingRow
            label="清除历史记录"
            description="删除所有已保存的识别结果。"
            icon={<DatabaseIcon className="h-4 w-4" />}
            labelClassName="text-red-700 dark:text-red-300"
          >
            <button
              type="button"
              onClick={handleRequestClearHistory}
              disabled={controlsDisabled}
              className={dangerButtonClassName}
            >
              {isPending('clearHistory') ? '清除中' : '立即清除'}
            </button>
          </SettingRow>
        </div>
      </section>
    </div>
  );
};
