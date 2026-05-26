import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Header } from './components/Header';
import { AudioInputPanel, type AudioInputPanelHandle } from './components/AudioInputPanel';
import { ResultDisplay } from './components/ResultDisplay';
import { AsrProvider } from './types';
import type { HistoryItem, Notification } from './types';
import { Toast } from './components/Toast';
import { SettingsPanel } from './components/SettingsPanel';
import { AudioPreview } from './components/AudioPreview';
import { HistoryPanel } from './components/HistoryPanel';
import { PipView } from './components/PipView';
import { SessionParametersPanel } from './components/SessionParametersPanel';
import { TranscriptionActions } from './components/TranscriptionActions';
import { useAppSettings } from './hooks/useAppSettings';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useDocumentPip } from './hooks/useDocumentPip';
import { useHistoryItems } from './hooks/useHistoryItems';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useTranscriptionFlow } from './hooks/useTranscriptionFlow';
import { languageDisplayNames } from './displayNames';
import { clearCachedRecording, clearTranscriptionCache, getStorageEstimate } from './services/cacheService';
import { getTranscriptSaveState } from './services/transcriptSaveState';
import { isAsrProvider, isCompressionLevel, isLanguage } from './services/typeGuards';
import { isSelectedAudioDeviceAvailable } from './services/audioDeviceUtils';

export default function App() {
  const { asrConfig, resetSettings, setters, values } = useAppSettings();
  const {
    asrProvider,
    autoCopy,
    autoGainControl,
    compressionLevel,
    context,
    echoCancellation,
    enableItn,
    language,
    noiseSuppression,
    selectedDeviceId,
    theme,
    trimSilence,
    enableLongAudioChunking,
  } = values;
  const {
    setAsrProvider,
    setCompressionLevel,
    setContext,
    setEnableItn,
    setEnableLongAudioChunking,
    setLanguage,
    setSelectedDeviceId,
    setTrimSilence,
  } = setters;

  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPipBusy, setIsPipBusy] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  const audioInputPanelRef = useRef<AudioInputPanelHandle>(null);
  const isSpaceDown = useRef(false);
  const audioDevices = useAudioDevices();

  const notify = useCallback((message: string, type: Notification['type']) => {
    setNotification({ message, type });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const handleError = useCallback(
    (message: string) => {
      notify(message, 'error');
    },
    [notify],
  );

  const { canInstall, installApp } = usePwaInstall(notify);
  const {
    history,
    prependHistoryItem,
    importHistoryFile,
    updateHistoryItem,
    removeHistoryItem,
    removeHistoryItems,
    removeAllHistory,
  } = useHistoryItems(notify);
  const { isPipActive, isOpeningPip, pipContainer, togglePip } = useDocumentPip(notify);

  const refreshStorageEstimate = useCallback(async () => {
    setStorageEstimate(await getStorageEstimate());
  }, []);

  const {
    audioFile,
    transcription,
    segments,
    detectedLanguage,
    isLoading,
    loadingMessage,
    isRecording,
    isRecordingBusy,
    queue,
    isBatchProcessing,
    copied,
    elapsedTime,
    realtimeElapsedTime,
    activeHistoryItemId,
    isTranscriptionDirty,
    handleCancel,
    handleCopy,
    handleBatchTranscribe,
    handleFileChange: changeAudioFile,
    handleFilesChange,
    handleRecordingChange,
    handleRecordingBusyChange,
    handleRetry,
    removeQueueItem,
    clearQueue,
    handleTranscribe,
    handleKeyboardRecordingRelease,
    handleTranscriptionChange,
    handleSaveTranscriptionToHistory,
    handleTranscriptionResultFromPip,
    restoreHistoryItem,
  } = useTranscriptionFlow({
    context,
    language,
    enableItn,
    autoCopy,
    compressionLevel,
    trimSilence,
    enableLongAudioChunking,
    asrConfig,
    notify,
    clearNotification,
    prependHistoryItem,
    updateHistoryItem,
    audioInputPanelRef,
  });
  const isMainTranscriptionBusy = isLoading || isBatchProcessing;
  const isTranscriptionBusy = isMainTranscriptionBusy || isPipBusy;
  const isRecordingActive = isRecording || isRecordingBusy;
  const isWorkspaceBusy = isTranscriptionBusy || isRecordingActive;

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    void refreshStorageEstimate();
  }, [history.length, refreshStorageEstimate]);

  useEffect(() => {
    if (
      selectedDeviceId !== 'default' &&
      audioDevices.length > 0 &&
      !isSelectedAudioDeviceAvailable(selectedDeviceId, audioDevices)
    ) {
      setSelectedDeviceId('default');
    }
  }, [audioDevices, selectedDeviceId, setSelectedDeviceId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isSpaceDown.current || isSettingsOpen) {
        return;
      }

      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      event.preventDefault();

      if (!isRecordingActive && !isTranscriptionBusy) {
        isSpaceDown.current = true;
        audioInputPanelRef.current?.startRecording();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !isSpaceDown.current) {
        return;
      }

      event.preventDefault();
      isSpaceDown.current = false;

      handleKeyboardRecordingRelease();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyboardRecordingRelease, isRecordingActive, isSettingsOpen, isTranscriptionBusy]);

  const handleClearHistory = useCallback(async () => {
    const cleared = await removeAllHistory();
    if (cleared) {
      void refreshStorageEstimate();
      setIsSettingsOpen(false);
    }
    return cleared;
  }, [refreshStorageEstimate, removeAllHistory]);

  const handleClearTranscriptionCache = useCallback(async () => {
    try {
      await clearTranscriptionCache();
      await refreshStorageEstimate();
      notify('识别缓存已清除', 'success');
      return true;
    } catch (error) {
      console.error('Failed to clear transcription cache:', error);
      notify('清除识别缓存失败。', 'error');
      return false;
    }
  }, [notify, refreshStorageEstimate]);

  const handleClearRecordingCache = useCallback(async () => {
    try {
      await clearCachedRecording();
      await refreshStorageEstimate();
      notify('最近录音缓存已清除', 'success');
      return true;
    } catch (error) {
      console.error('Failed to clear recording cache:', error);
      notify('清除最近录音失败。', 'error');
      return false;
    }
  }, [notify, refreshStorageEstimate]);

  const handleImportHistory = useCallback(
    async (file: File) => {
      const importedCount = await importHistoryFile(file);
      if (importedCount > 0) {
        void refreshStorageEstimate();
      }
      return importedCount;
    },
    [importHistoryFile, refreshStorageEstimate],
  );

  const handleRestoreHistory = useCallback(
    (item: HistoryItem) => {
      if (isWorkspaceBusy) {
        notify('录音或识别进行中，暂不能恢复历史记录。', 'error');
        return;
      }

      if (!restoreHistoryItem(item)) {
        return;
      }

      setContext(item.context);
      if (isAsrProvider(item.provider)) {
        setAsrProvider(item.provider);
      }
      if (isLanguage(item.language)) {
        setLanguage(item.language);
      }
      if (typeof item.enableItn === 'boolean') {
        setEnableItn(item.enableItn);
      }
      if (isCompressionLevel(item.compressionLevel)) {
        setCompressionLevel(item.compressionLevel);
      }
      if (typeof item.trimSilence === 'boolean') {
        setTrimSilence(item.trimSilence);
      }
      if (typeof item.enableLongAudioChunking === 'boolean') {
        setEnableLongAudioChunking(item.enableLongAudioChunking);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      isWorkspaceBusy,
      notify,
      restoreHistoryItem,
      setAsrProvider,
      setCompressionLevel,
      setContext,
      setEnableItn,
      setEnableLongAudioChunking,
      setLanguage,
      setTrimSilence,
    ],
  );

  const handleRestoreDefaults = useCallback(() => {
    resetSettings();
    setIsSettingsOpen(false);
    notify('已恢复默认设置', 'success');
  }, [notify, resetSettings]);

  const handleTogglePip = useCallback(() => {
    if (isOpeningPip) {
      return;
    }

    if (isPipActive) {
      togglePip();
      return;
    }

    if (isMainTranscriptionBusy || isRecordingActive) {
      notify('录音或识别进行中，暂不能打开输入法模式。', 'error');
      return;
    }

    togglePip();
  }, [isMainTranscriptionBusy, isOpeningPip, isPipActive, isRecordingActive, notify, togglePip]);

  const hasResult = Boolean(transcription || detectedLanguage);
  const hasActiveHistoryItem = activeHistoryItemId !== null && history.some((item) => item.id === activeHistoryItemId);
  const transcriptSaveState = getTranscriptSaveState({
    hasTranscription: Boolean(transcription),
    hasActiveHistoryItem,
    isDirty: isTranscriptionDirty,
  });
  const handleSaveCurrentTranscription = useCallback(
    () => handleSaveTranscriptionToHistory(hasActiveHistoryItem),
    [handleSaveTranscriptionToHistory, hasActiveHistoryItem],
  );

  return (
    <div className="workspace-shell h-full min-w-0 overflow-hidden font-sans">
      <div className="mx-auto flex h-full w-full min-w-0 max-w-[1600px] flex-col px-3 py-3 sm:px-5 lg:px-6">
        <Header
          onSettingsClick={() => setIsSettingsOpen(true)}
          onPipClick={handleTogglePip}
          asrProvider={asrProvider}
          onAsrProviderChange={setAsrProvider}
          disabled={isWorkspaceBusy}
          pipDisabled={isOpeningPip || (!isPipActive && (isMainTranscriptionBusy || isRecordingActive))}
        />
        <main className="custom-scrollbar grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overflow-x-hidden py-3 lg:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-4">
          <aside className="w-full min-w-0 max-w-full space-y-3 lg:sticky lg:top-0 lg:self-start xl:space-y-4">
            <AudioInputPanel
              ref={audioInputPanelRef}
              onFileChange={changeAudioFile}
              onFilesChange={handleFilesChange}
              onRecordingChange={handleRecordingChange}
              onRecordingBusyChange={handleRecordingBusyChange}
              disabled={isTranscriptionBusy}
              isRecording={isRecordingActive}
              onRecordingError={handleError}
              theme={theme}
              selectedDeviceId={selectedDeviceId}
              echoCancellation={echoCancellation}
              noiseSuppression={noiseSuppression}
              autoGainControl={autoGainControl}
              allowRemoteUrl={asrProvider === AsrProvider.DOUBAO}
            />
            <AudioPreview file={audioFile} onFileChange={changeAudioFile} disabled={isWorkspaceBusy} />
            <SessionParametersPanel
              context={context}
              setContext={setContext}
              language={language}
              setLanguage={setLanguage}
              enableItn={enableItn}
              setEnableItn={setEnableItn}
              compressionLevel={compressionLevel}
              setCompressionLevel={setCompressionLevel}
              disabled={isWorkspaceBusy}
            />
          </aside>

          <section className="flex w-full min-w-0 max-w-full flex-col gap-3 lg:min-h-[calc(100dvh-6rem)] xl:gap-4">
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="surface-panel min-w-0 px-3 py-2">
                <p className="eyebrow">Audio</p>
                <p className="mt-1 truncate text-sm font-semibold text-content-100">
                  {isRecording ? '录音中' : isRecordingBusy ? '录音准备中' : audioFile ? audioFile.name : '空闲'}
                </p>
              </div>
              <div className="surface-panel min-w-0 px-3 py-2">
                <p className="eyebrow">State</p>
                <p className="mt-1 text-sm font-semibold text-content-100">
                  {isPipBusy
                    ? '输入法处理中'
                    : isBatchProcessing
                      ? '批处理中'
                      : isLoading
                        ? '识别中'
                        : isRecording
                          ? '录音中'
                          : isRecordingBusy
                            ? '录音处理中'
                            : hasResult
                              ? '已生成'
                              : '待处理'}
                </p>
              </div>
              <div className="surface-panel min-w-0 px-3 py-2">
                <p className="eyebrow">Language</p>
                <p className="mt-1 truncate text-sm font-semibold text-content-100">
                  {detectedLanguage || languageDisplayNames[language]}
                </p>
              </div>
              <div className="surface-panel min-w-0 px-3 py-2">
                <p className="eyebrow">History</p>
                <p className="mt-1 font-mono text-sm font-semibold text-content-100">{history.length}</p>
              </div>
            </div>

            <ResultDisplay
              transcription={transcription}
              detectedLanguage={detectedLanguage}
              isLoading={isLoading}
              loadingStatus={loadingMessage}
              elapsedTime={elapsedTime}
              segments={segments}
              sourceFileName={audioFile?.name}
              provider={asrProvider}
              saveState={transcriptSaveState}
              disabled={isWorkspaceBusy}
              onTranscriptionChange={handleTranscriptionChange}
              onSaveTranscription={handleSaveCurrentTranscription}
            />

            <TranscriptionActions
              audioFile={audioFile}
              copied={copied}
              isLoading={isLoading}
              isRecording={isRecording}
              isRecordingBusy={isRecordingBusy}
              queue={queue}
              isBatchProcessing={isBatchProcessing}
              disabled={isPipBusy}
              realtimeElapsedTime={realtimeElapsedTime}
              transcription={transcription}
              onCancel={handleCancel}
              onCopy={handleCopy}
              onStartBatch={handleBatchTranscribe}
              onClearQueue={clearQueue}
              onRemoveQueueItem={removeQueueItem}
              onRetry={handleRetry}
              onTranscribe={handleTranscribe}
            />

            <HistoryPanel
              items={history}
              onDelete={removeHistoryItem}
              onDeleteMany={removeHistoryItems}
              onRestore={handleRestoreHistory}
              onError={handleError}
              disabled={isWorkspaceBusy}
            />
          </section>
        </main>
      </div>
      {notification && (
        <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        values={values}
        setters={setters}
        audioDevices={audioDevices}
        onClearHistory={handleClearHistory}
        onClearTranscriptionCache={handleClearTranscriptionCache}
        onClearRecordingCache={handleClearRecordingCache}
        onImportHistory={handleImportHistory}
        onRestoreDefaults={handleRestoreDefaults}
        storageEstimate={storageEstimate}
        canInstall={canInstall}
        onInstallApp={installApp}
        disabled={isWorkspaceBusy}
      />
      {isPipActive &&
        pipContainer &&
        createPortal(
          <PipView
            onTranscriptionResult={handleTranscriptionResultFromPip}
            context={context}
            language={language}
            enableItn={enableItn}
            selectedDeviceId={selectedDeviceId}
            echoCancellation={echoCancellation}
            noiseSuppression={noiseSuppression}
            autoGainControl={autoGainControl}
            asrConfig={asrConfig}
            disabled={isMainTranscriptionBusy || isRecordingActive}
            onBusyChange={setIsPipBusy}
          />,
          pipContainer,
        )}
    </div>
  );
}
