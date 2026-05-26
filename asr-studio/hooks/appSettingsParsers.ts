import type { Theme } from '../types';

export const parsePersistedBooleanDefaultFalse = (storedValue: string | null) => storedValue === 'true';

export const parsePersistedBooleanDefaultTrue = (storedValue: string | null) => storedValue !== 'false';

export const parseTheme = (storedValue: string | null): Theme => {
  return storedValue === 'dark' ? 'dark' : 'light';
};

export const createEnumParser = <T extends Record<string, string>>(values: T, fallback: T[keyof T]) => {
  return (storedValue: string | null) =>
    Object.values(values).includes(storedValue as T[keyof T]) ? (storedValue as T[keyof T]) : fallback;
};
