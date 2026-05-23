import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Header } from './components/Header';
import { AudioUploader, type AudioUploaderHandle } from './components/AudioUploader';
import { ResultDisplay, type ResultDisplayHandle } from './components/ResultDisplay';
import { ExampleButtons } from './components/ExampleButtons';
import { ApiProvider, CompressionLevel, Language } from './types';
import type { HistoryItem, NoteItem, Notification, Theme } from './types';
import { Toast } from './components/Toast';
import { LoaderIcon } from './components/icons/LoaderIcon';
import { SettingsPanel } from './components/SettingsPanel';
import { AudioPreview } from './components/AudioPreview';
import { HistoryPanel } from './components/HistoryPanel';
import { NotesPanel } from './components/NotesPanel';
import { RetryIcon } from './components/icons/RetryIcon';
import { PipView } from './components/PipView';
import { StopIcon } from './components/icons/StopIcon';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { DEFAULT_MODELSCOPE_API_URL } from './constants';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useDocumentPip } from './hooks/useDocumentPip';
import { useHistoryItems } from './hooks/useHistoryItems';
import { useNotes } from './hooks/useNotes';
import { usePersistentState } from './hooks/usePersistentState';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useTranscriptionFlow } from './hooks/useTranscriptionFlow';

const parseLanguage = (storedValue: string | null) => {
  return Object.values(Language).includes(storedValue as Language)
    ? (storedValue as Language)
    : Language.AUTO;
};

const parseCompressionLevel = (storedValue: string | null) => {
  return Object.values(CompressionLevel).includes(storedValue as CompressionLevel)
    ? (storedValue as CompressionLevel)
    : CompressionLevel.ORIGINAL;
};

const parseApiProvider = (storedValue: string | null) => {
  return Object.values(ApiProvider).includes(storedValue as ApiProvider)
    ? (storedValue as ApiProvider)
    : ApiProvider.MODELSCOPE;
};

const parseTheme = (storedValue: string | null): Theme => {
  return storedValue === 'dark' ? 'dark' : 'light';
};

export default function App() {
  const [context, setContext] = usePersistentState('context', '');
  const [language, setLanguage] = usePersistentState('language', Language.AUTO, { parse: parseLanguage });
  const [enableItn, setEnableItn] = usePersistentState('enableItn', false, {
    parse: storedValue => storedValue === 'true',
    serialize: String,
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoCopy, setAutoCopy] = usePersistentState('autoCopy', true, {
    parse: storedValue => storedValue !== 'false',
    serialize: String,
  });
  const [theme, setTheme] = usePersistentState<Theme>('theme', 'light', { parse: parseTheme });
  const [compressionLevel, setCompressionLevel] = usePersistentState('compressionLevel', CompressionLevel.ORIGINAL, {
    parse: parseCompressionLevel,
  });
  const [selectedDeviceId, setSelectedDeviceId] = usePersistentState('selectedDeviceId', 'default');
  const [apiProvider, setApiProvider] = usePersistentState('apiProvider', ApiProvider.MODELSCOPE, {
    parse: parseApiProvider,
  });
  const [modelScopeApiUrl, setModelScopeApiUrl] = usePersistentState('modelScopeApiUrl', DEFAULT_MODELSCOPE_API_URL);
  const [bailianApiKey, setBailianApiKey] = usePersistentState('bailianApiKey', '');

  const audioUploaderRef = useRef<AudioUploaderHandle>(null);
  const resultDisplayRef = useRef<ResultDisplayHandle>(null);
  const isSpaceDown = useRef(false);
  const audioDevices = useAudioDevices();

  const notify = useCallback((message: string, type: Notification['type']) => {
    setNotification({ message, type });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const handleError = useCallback((message: string) => {
    notify(message, 'error');
  }, [notify]);

  const { canInstall, installApp } = usePwaInstall(notify);
  const { history, prependHistoryItem, removeHistoryItem, removeAllHistory } = useHistoryItems(notify);
  const { notes, saveNote, removeNote } = useNotes(notify);
  const { isPipActive, pipContainer, togglePip } = useDocumentPip(notify);

  const {
    audioFile,
    transcription,
    setTranscription,
    detectedLanguage,
    isLoading,
    loadingMessage,
    isRecording,
    transcriptionMode,
    copied,
    elapsedTime,
    realtimeElapsedTime,
    handleCancel,
    handleCopy,
    handleFileChange: changeAudioFile,
    handleLoadExample,
    handleModeChange,
    handleRecordingChange,
    handleRetry,
    handleSaveNote,
    handleTranscribe,
    handleTranscriptionResultFromPip,
    restoreHistoryItem,
    restoreNoteItem,
  } = useTranscriptionFlow({
    context,
    language,
    enableItn,
    autoCopy,
    compressionLevel,
    apiProvider,
    modelScopeApiUrl,
    bailianApiKey,
    notify,
    clearNotification,
    saveNote,
    prependHistoryItem,
    audioUploaderRef,
    resultDisplayRef,
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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

      if (!isRecording && !isLoading) {
        isSpaceDown.current = true;
        audioUploaderRef.current?.startRecording();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !isSpaceDown.current) {
        return;
      }

      event.preventDefault();
      isSpaceDown.current = false;

      if (isRecording) {
        void handleTranscribe();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleTranscribe, isLoading, isRecording, isSettingsOpen]);

  const handleClearHistory = useCallback(async () => {
    const cleared = await removeAllHistory();
    if (cleared) {
      setIsSettingsOpen(false);
    }
  }, [removeAllHistory]);

  const handleRestoreHistory = useCallback((item: HistoryItem) => {
    if (!restoreHistoryItem(item)) {
      return;
    }

    setContext(item.context);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [restoreHistoryItem, setContext]);

  const handleRestoreNote = useCallback((item: NoteItem) => {
    restoreNoteItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [restoreNoteItem]);

  const handleRestoreDefaults = useCallback(() => {
    setContext('');
    setLanguage(Language.AUTO);
    setEnableItn(false);
    setAutoCopy(true);
    setTheme('light');
    setCompressionLevel(CompressionLevel.ORIGINAL);
    setSelectedDeviceId('default');
    setApiProvider(ApiProvider.MODELSCOPE);
    setModelScopeApiUrl(DEFAULT_MODELSCOPE_API_URL);
    setBailianApiKey('');
    setIsSettingsOpen(false);
    notify('已恢复默认设置', 'success');
  }, [
    notify,
    setApiProvider,
    setAutoCopy,
    setBailianApiKey,
    setCompressionLevel,
    setContext,
    setEnableItn,
    setLanguage,
    setModelScopeApiUrl,
    setSelectedDeviceId,
    setTheme,
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-base-100 px-3 py-4 font-sans text-content-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <Header onSettingsClick={() => setIsSettingsOpen(true)} onPipClick={togglePip} />
        <main className="mt-4 space-y-4 sm:mt-5">
          <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-stretch">
            <div className="min-w-0 space-y-4">
              <AudioUploader
                ref={audioUploaderRef}
                onFileChange={changeAudioFile}
                onRecordingChange={handleRecordingChange}
                disabled={isLoading}
                onRecordingError={handleError}
                theme={theme}
                selectedDeviceId={selectedDeviceId}
              />
              <AudioPreview
                file={audioFile}
                onFileChange={changeAudioFile}
                disabled={isLoading}
              />
            </div>

            <div className="flex min-w-0 flex-col lg:min-h-[424px]">
              <ResultDisplay
                ref={resultDisplayRef}
                transcription={transcription}
                setTranscription={setTranscription}
                detectedLanguage={detectedLanguage}
                isLoading={isLoading}
                loadingStatus={loadingMessage}
                transcriptionMode={transcriptionMode}
                onModeChange={handleModeChange}
                onSaveNote={handleSaveNote}
                elapsedTime={elapsedTime}
              />
              <div className="pt-4">
                <div className="flex items-stretch gap-3">
                  <button
                    onClick={handleTranscribe}
                    disabled={(!audioFile && !isRecording) || isLoading}
                    className="flex min-w-0 flex-1 items-center justify-center rounded-lg bg-brand-primary px-4 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-brand-secondary focus:outline-none focus:ring-4 focus:ring-brand-primary focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-base-300 disabled:text-content-200 disabled:shadow-none sm:px-6 sm:text-lg"
                  >
                    {isLoading ? (
                      <>
                        <LoaderIcon color="white" className="mr-2 h-5 w-5 sm:mr-3 sm:h-6 sm:w-6" />
                        <span className="truncate">正在识别...</span>
                        <span className="ml-2 w-[60px] flex-shrink-0 text-left font-mono tabular-nums">
                          {realtimeElapsedTime.toFixed(1)}s
                        </span>
                      </>
                    ) : isRecording ? (
                      '停止并识别'
                    ) : (
                      '识别'
                    )}
                  </button>
                  {isLoading ? (
                    <button
                      onClick={handleCancel}
                      title="取消"
                      aria-label="取消识别"
                      className="flex-shrink-0 rounded-lg bg-red-600 p-3 text-white shadow-lg transition-colors duration-300 hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50"
                    >
                      <StopIcon className="h-6 w-6" />
                    </button>
                  ) : (
                    transcription && audioFile && (
                      <>
                        <button
                          onClick={handleCopy}
                          title={copied ? '已复制!' : '复制'}
                          aria-label="复制识别结果"
                          className="flex-shrink-0 rounded-lg border border-base-300 bg-base-200 p-3 text-content-100 shadow-lg transition-colors duration-300 hover:bg-base-300 focus:outline-none focus:ring-4 focus:ring-brand-primary focus:ring-opacity-50"
                        >
                          {copied ? <CheckIcon className="h-6 w-6 text-brand-primary" /> : <CopyIcon className="h-6 w-6" />}
                        </button>
                        <button
                          onClick={handleRetry}
                          title="重试"
                          aria-label="重试识别"
                          className="flex-shrink-0 rounded-lg border border-base-300 bg-base-200 p-3 text-content-100 shadow-lg transition-colors duration-300 hover:bg-base-300 focus:outline-none focus:ring-4 focus:ring-brand-primary focus:ring-opacity-50"
                        >
                          <RetryIcon className="h-6 w-6" />
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <HistoryPanel
                items={history}
                onDelete={removeHistoryItem}
                onRestore={handleRestoreHistory}
                onError={handleError}
                disabled={isLoading}
              />
            </div>

            <div className="min-w-0">
              <NotesPanel
                items={notes}
                onDelete={removeNote}
                onRestore={handleRestoreNote}
                onError={handleError}
                disabled={isLoading}
              />
            </div>
          </section>

          <ExampleButtons onLoadExample={handleLoadExample} disabled={isLoading} />
        </main>
      </div>
      {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        autoCopy={autoCopy}
        setAutoCopy={setAutoCopy}
        context={context}
        setContext={setContext}
        language={language}
        setLanguage={setLanguage}
        enableItn={enableItn}
        setEnableItn={setEnableItn}
        compressionLevel={compressionLevel}
        setCompressionLevel={setCompressionLevel}
        audioDevices={audioDevices}
        selectedDeviceId={selectedDeviceId}
        setSelectedDeviceId={setSelectedDeviceId}
        apiProvider={apiProvider}
        setApiProvider={setApiProvider}
        modelScopeApiUrl={modelScopeApiUrl}
        setModelScopeApiUrl={setModelScopeApiUrl}
        bailianApiKey={bailianApiKey}
        setBailianApiKey={setBailianApiKey}
        onClearHistory={handleClearHistory}
        onRestoreDefaults={handleRestoreDefaults}
        canInstall={canInstall}
        onInstallApp={installApp}
        disabled={isLoading}
      />
      {isPipActive && pipContainer && createPortal(
        <PipView
          onTranscriptionResult={handleTranscriptionResultFromPip}
          theme={theme}
          context={context}
          language={language}
          enableItn={enableItn}
          selectedDeviceId={selectedDeviceId}
          apiProvider={apiProvider}
          modelScopeApiUrl={modelScopeApiUrl}
          bailianApiKey={bailianApiKey}
        />,
        pipContainer
      )}
    </div>
  );
}
