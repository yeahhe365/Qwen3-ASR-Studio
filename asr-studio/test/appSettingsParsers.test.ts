import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createEnumParser,
  parsePersistedBooleanDefaultFalse,
  parsePersistedBooleanDefaultTrue,
  parseTheme,
} from '../hooks/appSettingsParsers.ts';
import { Language } from '../types.ts';

describe('app settings parsers', () => {
  test('parses persisted booleans with explicit default semantics', () => {
    assert.equal(parsePersistedBooleanDefaultFalse('true'), true);
    assert.equal(parsePersistedBooleanDefaultFalse('false'), false);
    assert.equal(parsePersistedBooleanDefaultFalse(null), false);

    assert.equal(parsePersistedBooleanDefaultTrue('false'), false);
    assert.equal(parsePersistedBooleanDefaultTrue('true'), true);
    assert.equal(parsePersistedBooleanDefaultTrue(null), true);
  });

  test('falls back to light theme for unknown theme values', () => {
    assert.equal(parseTheme('dark'), 'dark');
    assert.equal(parseTheme('light'), 'light');
    assert.equal(parseTheme('system'), 'light');
    assert.equal(parseTheme(null), 'light');
  });

  test('creates enum parsers that keep valid values and reject unknown values', () => {
    const parseLanguage = createEnumParser(Language, Language.AUTO);

    assert.equal(parseLanguage(Language.ENGLISH), Language.ENGLISH);
    assert.equal(parseLanguage('not-a-language'), Language.AUTO);
    assert.equal(parseLanguage(null), Language.AUTO);
  });
});
