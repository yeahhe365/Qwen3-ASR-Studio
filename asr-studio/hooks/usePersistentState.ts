import { useEffect, useState } from 'react';

type PersistentStateOptions<T> = {
  parse?: (storedValue: string | null) => T;
  serialize?: (value: T) => string;
};

export const getLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

export function usePersistentState<T>(key: string, fallbackValue: T, options: PersistentStateOptions<T> = {}) {
  const parse =
    options.parse ??
    ((storedValue: string | null) => {
      return storedValue === null ? fallbackValue : (storedValue as T);
    });
  const serialize = options.serialize ?? String;

  const [value, setValue] = useState<T>(() => {
    const storage = getLocalStorage();
    if (!storage) {
      return fallbackValue;
    }

    try {
      return parse(storage.getItem(key));
    } catch (error) {
      console.warn(`Failed to read ${key} from localStorage:`, error);
      return fallbackValue;
    }
  });

  useEffect(() => {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(key, serialize(value));
    } catch (error) {
      console.warn(`Failed to persist ${key} to localStorage:`, error);
    }
  }, [key, serialize, value]);

  return [value, setValue] as const;
}
