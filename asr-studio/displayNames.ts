import { CompressionLevel, Language } from './types';

export const languageDisplayNames: Record<Language, string> = {
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

export const compressionLevelDisplayNames: Record<CompressionLevel, string> = {
  [CompressionLevel.ORIGINAL]: '原始',
  [CompressionLevel.MEDIUM]: '中等',
  [CompressionLevel.MINIMUM]: '最小',
};
