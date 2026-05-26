import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AsrProvider, CompressionLevel, Language } from '../types';
import type { AsrProviderConfig, Theme } from '../types';
import {
  createEnumParser,
  parsePersistedBooleanDefaultFalse,
  parsePersistedBooleanDefaultTrue,
  parseTheme,
} from './appSettingsParsers';
import { usePersistentState } from './usePersistentState';

export type AppSettingsValues = {
  context: string;
  language: Language;
  enableItn: boolean;
  autoCopy: boolean;
  theme: Theme;
  compressionLevel: CompressionLevel;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
  selectedDeviceId: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  asrProvider: AsrProvider;
  qwenApiKey: string;
  doubaoApiKey: string;
  doubaoAccessKey: string;
  geminiApiKey: string;
  nvidiaNimBaseUrl: string;
  nvidiaNimApiKey: string;
};

export type AppSettingsSetters = {
  setContext: Dispatch<SetStateAction<string>>;
  setLanguage: Dispatch<SetStateAction<Language>>;
  setEnableItn: Dispatch<SetStateAction<boolean>>;
  setAutoCopy: Dispatch<SetStateAction<boolean>>;
  setTheme: Dispatch<SetStateAction<Theme>>;
  setCompressionLevel: Dispatch<SetStateAction<CompressionLevel>>;
  setTrimSilence: Dispatch<SetStateAction<boolean>>;
  setEnableLongAudioChunking: Dispatch<SetStateAction<boolean>>;
  setSelectedDeviceId: Dispatch<SetStateAction<string>>;
  setEchoCancellation: Dispatch<SetStateAction<boolean>>;
  setNoiseSuppression: Dispatch<SetStateAction<boolean>>;
  setAutoGainControl: Dispatch<SetStateAction<boolean>>;
  setAsrProvider: Dispatch<SetStateAction<AsrProvider>>;
  setQwenApiKey: Dispatch<SetStateAction<string>>;
  setDoubaoApiKey: Dispatch<SetStateAction<string>>;
  setDoubaoAccessKey: Dispatch<SetStateAction<string>>;
  setGeminiApiKey: Dispatch<SetStateAction<string>>;
  setNvidiaNimBaseUrl: Dispatch<SetStateAction<string>>;
  setNvidiaNimApiKey: Dispatch<SetStateAction<string>>;
};

const DEFAULT_SETTINGS: AppSettingsValues = {
  context: '',
  language: Language.AUTO,
  enableItn: false,
  autoCopy: true,
  theme: 'light',
  compressionLevel: CompressionLevel.ORIGINAL,
  trimSilence: false,
  enableLongAudioChunking: true,
  selectedDeviceId: 'default',
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  asrProvider: AsrProvider.QWEN,
  qwenApiKey: '',
  doubaoApiKey: '',
  doubaoAccessKey: '',
  geminiApiKey: '',
  nvidiaNimBaseUrl: '',
  nvidiaNimApiKey: '',
};

const parseLanguage = createEnumParser(Language, DEFAULT_SETTINGS.language);
const parseCompressionLevel = createEnumParser(CompressionLevel, DEFAULT_SETTINGS.compressionLevel);
const parseAsrProvider = createEnumParser(AsrProvider, DEFAULT_SETTINGS.asrProvider);

export function useAppSettings() {
  const [context, setContext] = usePersistentState('context', DEFAULT_SETTINGS.context);
  const [language, setLanguage] = usePersistentState('language', DEFAULT_SETTINGS.language, {
    parse: parseLanguage,
  });
  const [enableItn, setEnableItn] = usePersistentState('enableItn', DEFAULT_SETTINGS.enableItn, {
    parse: parsePersistedBooleanDefaultFalse,
    serialize: String,
  });
  const [autoCopy, setAutoCopy] = usePersistentState('autoCopy', DEFAULT_SETTINGS.autoCopy, {
    parse: parsePersistedBooleanDefaultTrue,
    serialize: String,
  });
  const [theme, setTheme] = usePersistentState<Theme>('theme', DEFAULT_SETTINGS.theme, { parse: parseTheme });
  const [compressionLevel, setCompressionLevel] = usePersistentState(
    'compressionLevel',
    DEFAULT_SETTINGS.compressionLevel,
    {
      parse: parseCompressionLevel,
    },
  );
  const [trimSilence, setTrimSilence] = usePersistentState('trimSilence', DEFAULT_SETTINGS.trimSilence, {
    parse: parsePersistedBooleanDefaultFalse,
    serialize: String,
  });
  const [enableLongAudioChunking, setEnableLongAudioChunking] = usePersistentState(
    'enableLongAudioChunking',
    DEFAULT_SETTINGS.enableLongAudioChunking,
    {
      parse: parsePersistedBooleanDefaultTrue,
      serialize: String,
    },
  );
  const [selectedDeviceId, setSelectedDeviceId] = usePersistentState(
    'selectedDeviceId',
    DEFAULT_SETTINGS.selectedDeviceId,
  );
  const [echoCancellation, setEchoCancellation] = usePersistentState(
    'echoCancellation',
    DEFAULT_SETTINGS.echoCancellation,
    {
      parse: parsePersistedBooleanDefaultFalse,
      serialize: String,
    },
  );
  const [noiseSuppression, setNoiseSuppression] = usePersistentState(
    'noiseSuppression',
    DEFAULT_SETTINGS.noiseSuppression,
    {
      parse: parsePersistedBooleanDefaultFalse,
      serialize: String,
    },
  );
  const [autoGainControl, setAutoGainControl] = usePersistentState(
    'autoGainControl',
    DEFAULT_SETTINGS.autoGainControl,
    {
      parse: parsePersistedBooleanDefaultFalse,
      serialize: String,
    },
  );
  const [asrProvider, setAsrProvider] = usePersistentState('asrProvider', DEFAULT_SETTINGS.asrProvider, {
    parse: parseAsrProvider,
  });
  const [qwenApiKey, setQwenApiKey] = usePersistentState('qwenApiKey', DEFAULT_SETTINGS.qwenApiKey);
  const [doubaoApiKey, setDoubaoApiKey] = usePersistentState('doubaoApiKey', DEFAULT_SETTINGS.doubaoApiKey);
  const [doubaoAccessKey, setDoubaoAccessKey] = usePersistentState('doubaoAccessKey', DEFAULT_SETTINGS.doubaoAccessKey);
  const [geminiApiKey, setGeminiApiKey] = usePersistentState('geminiApiKey', DEFAULT_SETTINGS.geminiApiKey);
  const [nvidiaNimBaseUrl, setNvidiaNimBaseUrl] = usePersistentState(
    'nvidiaNimBaseUrl',
    DEFAULT_SETTINGS.nvidiaNimBaseUrl,
  );
  const [nvidiaNimApiKey, setNvidiaNimApiKey] = usePersistentState('nvidiaNimApiKey', DEFAULT_SETTINGS.nvidiaNimApiKey);

  const asrConfig: AsrProviderConfig = useMemo(
    () => ({
      provider: asrProvider,
      qwenApiKey,
      doubaoApiKey,
      doubaoAccessKey,
      geminiApiKey,
      nvidiaNimBaseUrl,
      nvidiaNimApiKey,
    }),
    [asrProvider, doubaoAccessKey, doubaoApiKey, geminiApiKey, nvidiaNimApiKey, nvidiaNimBaseUrl, qwenApiKey],
  );

  const resetSettings = useCallback(() => {
    setContext(DEFAULT_SETTINGS.context);
    setLanguage(DEFAULT_SETTINGS.language);
    setEnableItn(DEFAULT_SETTINGS.enableItn);
    setAutoCopy(DEFAULT_SETTINGS.autoCopy);
    setTheme(DEFAULT_SETTINGS.theme);
    setCompressionLevel(DEFAULT_SETTINGS.compressionLevel);
    setTrimSilence(DEFAULT_SETTINGS.trimSilence);
    setEnableLongAudioChunking(DEFAULT_SETTINGS.enableLongAudioChunking);
    setSelectedDeviceId(DEFAULT_SETTINGS.selectedDeviceId);
    setEchoCancellation(DEFAULT_SETTINGS.echoCancellation);
    setNoiseSuppression(DEFAULT_SETTINGS.noiseSuppression);
    setAutoGainControl(DEFAULT_SETTINGS.autoGainControl);
    setAsrProvider(DEFAULT_SETTINGS.asrProvider);
    setQwenApiKey(DEFAULT_SETTINGS.qwenApiKey);
    setDoubaoApiKey(DEFAULT_SETTINGS.doubaoApiKey);
    setDoubaoAccessKey(DEFAULT_SETTINGS.doubaoAccessKey);
    setGeminiApiKey(DEFAULT_SETTINGS.geminiApiKey);
    setNvidiaNimBaseUrl(DEFAULT_SETTINGS.nvidiaNimBaseUrl);
    setNvidiaNimApiKey(DEFAULT_SETTINGS.nvidiaNimApiKey);
  }, [
    setAsrProvider,
    setAutoCopy,
    setCompressionLevel,
    setContext,
    setDoubaoAccessKey,
    setDoubaoApiKey,
    setAutoGainControl,
    setEchoCancellation,
    setEnableLongAudioChunking,
    setEnableItn,
    setGeminiApiKey,
    setLanguage,
    setNoiseSuppression,
    setNvidiaNimApiKey,
    setNvidiaNimBaseUrl,
    setQwenApiKey,
    setSelectedDeviceId,
    setTheme,
    setTrimSilence,
  ]);

  const values: AppSettingsValues = useMemo(
    () => ({
      asrProvider,
      autoCopy,
      autoGainControl,
      compressionLevel,
      context,
      doubaoAccessKey,
      doubaoApiKey,
      enableItn,
      echoCancellation,
      enableLongAudioChunking,
      geminiApiKey,
      language,
      noiseSuppression,
      nvidiaNimApiKey,
      nvidiaNimBaseUrl,
      qwenApiKey,
      selectedDeviceId,
      theme,
      trimSilence,
    }),
    [
      asrProvider,
      autoCopy,
      autoGainControl,
      compressionLevel,
      context,
      doubaoAccessKey,
      doubaoApiKey,
      enableItn,
      echoCancellation,
      enableLongAudioChunking,
      geminiApiKey,
      language,
      noiseSuppression,
      nvidiaNimApiKey,
      nvidiaNimBaseUrl,
      qwenApiKey,
      selectedDeviceId,
      theme,
      trimSilence,
    ],
  );

  const setters: AppSettingsSetters = useMemo(
    () => ({
      setAsrProvider,
      setAutoCopy,
      setAutoGainControl,
      setCompressionLevel,
      setContext,
      setDoubaoAccessKey,
      setDoubaoApiKey,
      setEchoCancellation,
      setEnableLongAudioChunking,
      setEnableItn,
      setGeminiApiKey,
      setLanguage,
      setNoiseSuppression,
      setNvidiaNimApiKey,
      setNvidiaNimBaseUrl,
      setQwenApiKey,
      setSelectedDeviceId,
      setTheme,
      setTrimSilence,
    }),
    [
      setAsrProvider,
      setAutoCopy,
      setAutoGainControl,
      setCompressionLevel,
      setContext,
      setDoubaoAccessKey,
      setDoubaoApiKey,
      setEchoCancellation,
      setEnableLongAudioChunking,
      setEnableItn,
      setGeminiApiKey,
      setLanguage,
      setNoiseSuppression,
      setNvidiaNimApiKey,
      setNvidiaNimBaseUrl,
      setQwenApiKey,
      setSelectedDeviceId,
      setTheme,
      setTrimSilence,
    ],
  );

  return {
    asrConfig,
    resetSettings,
    setters,
    values,
  };
}
