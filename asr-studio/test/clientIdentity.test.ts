import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { getClientUid } from '../services/clientIdentity.ts';

const originalWindow = globalThis.window;

const createMemoryStorage = (initialValues: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initialValues));

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  } as Storage;
};

const setWindowStorage = (storage: Storage) => {
  globalThis.window = {
    localStorage: storage,
  } as Window & typeof globalThis;
};

afterEach(() => {
  globalThis.window = originalWindow;
});

describe('client identity', () => {
  test('falls back outside the browser', () => {
    globalThis.window = undefined as unknown as Window & typeof globalThis;

    assert.equal(getClientUid(), 'asr-studio-web');
  });

  test('returns existing valid client uid', () => {
    setWindowStorage(createMemoryStorage({ 'asr-studio-client-uid': 'asr-studio-existing_12345678' }));

    assert.equal(getClientUid(), 'asr-studio-existing_12345678');
  });

  test('replaces malformed stored client uid values', () => {
    const storage = createMemoryStorage({ 'asr-studio-client-uid': '../bad uid' });
    setWindowStorage(storage);

    const uid = getClientUid();

    assert.match(uid, /^asr-studio-[a-zA-Z0-9._-]{8,96}$/);
    assert.equal(storage.getItem('asr-studio-client-uid'), uid);
  });

  test('falls back when localStorage access throws', () => {
    globalThis.window = {} as Window & typeof globalThis;
    Object.defineProperty(globalThis.window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });

    assert.equal(getClientUid(), 'asr-studio-web');
  });
});
