import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import {
  AboutSettingsSection,
  ApiSettingsSection,
  ConfirmDialog,
  DataSettingsSection,
  InterfaceSettingsSection,
  RecognitionSettingsSection,
  tabGroups,
  tabs,
  type SettingTab,
  type SettingsDataOperation,
  type SettingsPanelProps,
} from './settings';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  values,
  setters,
  audioDevices,
  onClearHistory,
  onClearTranscriptionCache,
  onClearRecordingCache,
  onImportHistory,
  onRestoreDefaults,
  storageEstimate,
  disabled,
  canInstall,
  onInstallApp,
}) => {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>('api');
  const [pendingOperation, setPendingOperation] = useState<SettingsDataOperation | null>(null);
  const pendingOperationRef = useRef<SettingsDataOperation | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const tabsById = useMemo(() => new Map(tabs.map((tab) => [tab.id, tab])), []);
  const activeTabDescriptor = tabsById.get(activeTab);
  const isOperationPending = Boolean(pendingOperation);

  const handleClose = useCallback(() => {
    if (pendingOperationRef.current) {
      return;
    }

    onClose();
  }, [onClose]);

  const runOperation = useCallback(async <T,>(operation: SettingsDataOperation, action: () => T | Promise<T>) => {
    if (pendingOperationRef.current) {
      return undefined;
    }

    pendingOperationRef.current = operation;
    if (isMountedRef.current) {
      setPendingOperation(operation);
    }
    try {
      return await action();
    } finally {
      pendingOperationRef.current = null;
      if (isMountedRef.current) {
        setPendingOperation(null);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallApp = () => {
    void runOperation('install', onInstallApp);
  };

  const handleImportHistory = (file: File) => {
    void runOperation('importHistory', () => onImportHistory(file));
  };

  const handleClearTranscriptionCache = () => {
    void runOperation('clearTranscriptionCache', onClearTranscriptionCache);
  };

  const handleClearRecordingCache = () => {
    void runOperation('clearRecordingCache', onClearRecordingCache);
  };

  const confirmClearHistory = async () => {
    const cleared = await runOperation('clearHistory', onClearHistory);
    if (cleared && isMountedRef.current) {
      setIsConfirmingClear(false);
    }
  };

  const confirmRestoreDefaults = async () => {
    await runOperation('restoreDefaults', onRestoreDefaults);
    if (isMountedRef.current) {
      setIsConfirmingRestore(false);
    }
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'api':
        return <ApiSettingsSection values={values} setters={setters} disabled={disabled} />;
      case 'recognition':
        return (
          <RecognitionSettingsSection
            values={values}
            setters={setters}
            audioDevices={audioDevices}
            disabled={disabled}
          />
        );
      case 'interface':
        return <InterfaceSettingsSection values={values} setters={setters} disabled={disabled} />;
      case 'data':
        return (
          <DataSettingsSection
            canInstall={canInstall}
            onInstallApp={handleInstallApp}
            disabled={disabled}
            storageEstimate={storageEstimate}
            onClearTranscriptionCache={handleClearTranscriptionCache}
            onClearRecordingCache={handleClearRecordingCache}
            onImportHistory={handleImportHistory}
            onRequestClearHistory={() => setIsConfirmingClear(true)}
            onRequestRestoreDefaults={() => setIsConfirmingRestore(true)}
            pendingOperation={pendingOperation}
          />
        );
      case 'about':
        return <AboutSettingsSection />;
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-0 backdrop-blur-sm sm:p-4"
        aria-labelledby="settings-title"
        role="dialog"
        aria-modal="true"
        onClick={handleClose}
      >
        <div
          className="flex h-[100dvh] w-full transform flex-col overflow-hidden bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-2xl transition-all sm:h-[85vh] sm:max-h-[800px] sm:w-[90vw] sm:max-w-6xl sm:rounded-lg md:flex-row"
          onClick={(event) => event.stopPropagation()}
        >
          <aside className="flex w-full flex-shrink-0 flex-col border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] md:w-64 md:border-b-0 md:border-r">
            <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 md:px-5 md:py-5">
              <button
                type="button"
                onClick={handleClose}
                disabled={isOperationPending}
                aria-label="关闭设置"
                className="rounded-md p-2 text-[var(--theme-text-tertiary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
              <span id="settings-title" className="font-semibold text-[var(--theme-text-primary)] md:hidden">
                设置
              </span>
              <div className="w-9 md:hidden" />
            </div>

            <nav
              className="custom-scrollbar flex flex-1 gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:gap-1.5 md:overflow-x-hidden md:overflow-y-auto md:px-3 md:pb-3"
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
                        onClick={() => {
                          if (!isOperationPending) {
                            setActiveTab(tab.id);
                          }
                        }}
                        disabled={isOperationPending}
                        role="tab"
                        aria-selected={isActive}
                        className={`flex w-auto flex-shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 md:w-full md:gap-3 md:px-4 md:py-3 ${
                          isActive
                            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                            : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                        } focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)]`}
                      >
                        <Icon
                          className={`h-4 w-4 md:h-[18px] md:w-[18px] ${isActive ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}
                        />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--theme-bg-primary)]">
            <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
              <div className="mx-auto hidden w-full max-w-3xl pb-6 md:block">
                <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">{activeTabDescriptor?.label}</h2>
                <p className="mt-1 text-sm text-[var(--theme-text-tertiary)]">{activeTabDescriptor?.description}</p>
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
          isBusy={pendingOperation === 'clearHistory'}
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
          isBusy={pendingOperation === 'restoreDefaults'}
          onCancel={() => setIsConfirmingRestore(false)}
          onConfirm={confirmRestoreDefaults}
        />
      )}
    </>
  );
};
