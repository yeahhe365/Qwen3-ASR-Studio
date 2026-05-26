import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const serviceWorkerPath = new URL('../public/sw.js', import.meta.url);

describe('service worker', () => {
  test('provides offline app-shell caching without forcing open clients to reload', async () => {
    const source = await readFile(serviceWorkerPath, 'utf8');

    assert.match(source, /CACHE_NAME/);
    assert.match(source, /APP_SHELL_URLS = \['\/', '\/index\.html', '\/manifest\.json', '\/favicon\.svg'\]/);
    assert.match(source, /networkFirstNavigation/);
    assert.match(source, /cacheFirstAsset/);
    assert.match(source, /self\.clients\.claim/);
    assert.doesNotMatch(source, /client\.navigate/);
  });
});
