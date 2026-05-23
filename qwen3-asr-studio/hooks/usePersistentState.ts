import { useEffect, useState } from 'react';

type PersistentStateOptions<T> = {
  parse?: (storedValue: string | null) => T;
  serialize?: (value: T) => string;
};

const canUseLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export function usePersistentState<T>(
  key: string,
  fallbackValue: T,
  options: PersistentStateOptions<T> = {}
) {
  const parse = options.parse ?? ((storedValue: string | null) => {
    return storedValue === null ? fallbackValue : (storedValue as T);
  });
  const serialize = options.serialize ?? String;

  const [value, setValue] = useState<T>(() => {
    if (!canUseLocalStorage()) {
      return fallbackValue;
    }

    try {
      return parse(window.localStorage.getItem(key));
    } catch (error) {
      console.warn(`Failed to read ${key} from localStorage:`, error);
      return fallbackValue;
    }
  });

  useEffect(() => {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(key, serialize(value));
    } catch (error) {
      console.warn(`Failed to persist ${key} to localStorage:`, error);
    }
  }, [key, serialize, value]);

  return [value, setValue] as const;
}
