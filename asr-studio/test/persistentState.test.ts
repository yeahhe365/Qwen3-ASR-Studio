import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { getLocalStorage } from '../hooks/usePersistentState.ts';

const originalWindow = globalThis.window;

const createMemoryStorage = () =>
  ({
    clear: () => undefined,
    getItem: () => null,
    key: () => null,
    length: 0,
    removeItem: () => undefined,
    setItem: () => undefined,
  }) as Storage;

afterEach(() => {
  globalThis.window = originalWindow;
});

describe('persistent state storage access', () => {
  test('returns null outside the browser', () => {
    globalThis.window = undefined as unknown as Window & typeof globalThis;

    assert.equal(getLocalStorage(), null);
  });

  test('returns localStorage when it is available', () => {
    const storage = createMemoryStorage();
    globalThis.window = {
      localStorage: storage,
    } as Window & typeof globalThis;

    assert.equal(getLocalStorage(), storage);
  });

  test('returns null when localStorage access is blocked', () => {
    globalThis.window = {} as Window & typeof globalThis;
    Object.defineProperty(globalThis.window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });

    assert.equal(getLocalStorage(), null);
  });
});
