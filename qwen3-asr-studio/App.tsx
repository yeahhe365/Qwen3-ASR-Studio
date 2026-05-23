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
    <div className="min-h-screen bg-base-100 text-content-100 font-sans p-3 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Header onSettingsClick={() => setIsSettingsOpen(true)} onPipClick={togglePip} />
        <main className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="md:col-start-1 md:row-start-1">
              <AudioPreview
                file={audioFile}
                onFileChange={changeAudioFile}
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col md:col-start-2 md:row-start-1 md:row-span-2">
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
              <div className="pt-6">
                <div className="flex items-stretch gap-3">
                  <button
                    onClick={handleTranscribe}
                    disabled={(!audioFile && !isRecording) || isLoading}
                    className="flex-grow flex items-center justify-center px-4 sm:px-6 py-3 text-base sm:text-lg font-semibold text-white transition-all duration-300 rounded-lg shadow-lg bg-brand-primary hover:bg-brand-secondary disabled:bg-base-300 disabled:cursor-not-allowed disabled:text-content-200 focus:outline-none focus:ring-4 focus:ring-brand-primary focus:ring-opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <LoaderIcon color="white" className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                        <span>正在识别...</span>
                        <span className="font-mono ml-2 tabular-nums w-[60px] text-left">
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
                      className="flex-shrink-0 p-3 text-white transition-colors duration-300 bg-red-600 rounded-lg shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50"
                    >
                      <StopIcon className="w-6 h-6" />
                    </button>
                  ) : (
                    transcription && audioFile && (
                      <>
                        <button
                          onClick={handleCopy}
                          title={copied ? '已复制!' : '复制'}
                          aria-label="复制识别结果"
                          className="flex-shrink-0 p-3 text-content-100 transition-colors duration-300 rounded-lg shadow-lg bg-base-200 border border-base-300 hover:bg-base-300 focus:outline-none focus:ring-4 focus:ring-brand-primary focus:ring-opacity-50"
                        >
                          {copied ? <CheckIcon className="w-6 h-6 text-brand-primary" /> : <CopyIcon className="w-6 h-6" />}
                        </button>
                        <button
                          onClick={handleRetry}
                          title="重试"
                          aria-label="重试识别"
                          className="flex-shrink-0 p-3 text-content-100 transition-colors duration-300 rounded-lg shadow-lg bg-base-200 border border-base-300 hover:bg-base-300 focus:outline-none focus:ring-4 focus:ring-brand-primary focus:ring-opacity-50"
                        >
                          <RetryIcon className="w-6 h-6" />
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-start-1 md:row-start-2">
              <AudioUploader
                ref={audioUploaderRef}
                onFileChange={changeAudioFile}
                onRecordingChange={handleRecordingChange}
                disabled={isLoading}
                onRecordingError={handleError}
                theme={theme}
                selectedDeviceId={selectedDeviceId}
              />
            </div>

            <div className="md:col-start-2 md:row-start-3">
              <HistoryPanel
                items={history}
                onDelete={removeHistoryItem}
                onRestore={handleRestoreHistory}
                onError={handleError}
                disabled={isLoading}
              />
            </div>

            <div className="md:col-start-1 md:row-start-3">
              <NotesPanel
                items={notes}
                onDelete={removeNote}
                onRestore={handleRestoreNote}
                onError={handleError}
                disabled={isLoading}
              />
            </div>

            <div className="md:col-span-2">
              <ExampleButtons onLoadExample={handleLoadExample} disabled={isLoading} />
            </div>
          </div>
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
