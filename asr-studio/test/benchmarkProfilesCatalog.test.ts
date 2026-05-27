import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { benchmarkDatasetCatalog, getBenchmarkDatasetCatalogEntry } from '../services/benchmarkCatalog.ts';
import { benchmarkScoringProfiles, getBenchmarkScoringProfile } from '../services/benchmarkProfiles.ts';

describe('benchmark profiles and public catalog', () => {
  test('includes the requested scoring profiles with concrete options', () => {
    const profileIds = benchmarkScoringProfiles.map((profile) => profile.id);

    assert.deepEqual(profileIds, [
      'open-asr',
      'zh-cer',
      'punctuation-sensitive',
      'itn-sensitive',
      'keyword-terms',
    ]);
    assert.equal(getBenchmarkScoringProfile('zh-cer').primaryMetric, 'cer');
    assert.equal(getBenchmarkScoringProfile('punctuation-sensitive').options.ignorePunctuation, false);
    assert.equal(getBenchmarkScoringProfile('itn-sensitive').options.normalizeItn, false);
  });

  test('lists public dataset templates without bundling audio', () => {
    const catalogIds = benchmarkDatasetCatalog.map((entry) => entry.id);

    assert.deepEqual(catalogIds, [
      'librispeech',
      'aishell-1',
      'fleurs',
      'common-voice',
      'earnings22',
      'ami',
      'chime',
    ]);
    assert.match(getBenchmarkDatasetCatalogEntry('fleurs').downloadUrl, /huggingface/);
    assert.equal(benchmarkDatasetCatalog.every((entry) => entry.manifestTemplate.includes('fileName')), true);
    assert.equal(benchmarkDatasetCatalog.every((entry) => /^https:\/\//.test(entry.downloadUrl)), true);
  });
});
