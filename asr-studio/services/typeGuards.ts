import { AsrProvider, CompressionLevel, Language } from '../types';

const isEnumValue = <T extends Record<string, string>>(enumObject: T, value: unknown): value is T[keyof T] => {
  return typeof value === 'string' && Object.values(enumObject).includes(value as T[keyof T]);
};

export const isAsrProvider = (value: unknown): value is AsrProvider => {
  return isEnumValue(AsrProvider, value);
};

export const isLanguage = (value: unknown): value is Language => {
  return isEnumValue(Language, value);
};

export const isCompressionLevel = (value: unknown): value is CompressionLevel => {
  return isEnumValue(CompressionLevel, value);
};
