import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createBenchmarkBreakdown, createBenchmarkLeaderboard } from '../services/benchmarkAnalytics.ts';
import type { BenchmarkModelTarget, BenchmarkRunResult, BenchmarkSample } from '../services/benchmarkTypes.ts';
import { AsrProvider } from '../types.ts';

const targets: BenchmarkModelTarget[] = [
  {
    id: 'fast',
    label: 'Fast',
    provider: AsrProvider.QWEN,
    modelLabel: 'fast-model',
    costPerMinuteUsd: 0,
  },
  {
    id: 'accurate',
    label: 'Accurate',
    provider: AsrProvider.GEMINI,
    modelLabel: 'accurate-model',
    costPerMinuteUsd: 0,
  },
];

const samples: BenchmarkSample[] = [
  {
    id: 's1',
    fileName: 'a.wav',
    referenceText: 'hello',
    language: 'en',
    domain: 'meeting',
    durationSeconds: 40,
    speaker: 'spk1',
    noise: 'clean',
    accent: 'us',
    tags: ['short'],
    keywords: [],
    names: [],
    terms: [],
  },
  {
    id: 's2',
    fileName: 'b.wav',
    referenceText: '你好',
    language: 'zh',
    domain: 'phone',
    durationSeconds: 700,
    speaker: 'spk2',
    noise: 'noisy',
    accent: 'mandarin',
    tags: ['long'],
    keywords: [],
    names: [],
    terms: [],
  },
];

const results: BenchmarkRunResult[] = [
  {
    id: 's1__fast',
    sampleId: 's1',
    modelId: 'fast',
    status: 'done',
    score: {
      wer: 0.2,
      cer: 0.1,
      wordHits: 4,
      wordSubstitutions: 1,
      wordDeletions: 0,
      wordInsertions: 0,
      referenceWordCount: 5,
      characterHits: 9,
      characterSubstitutions: 1,
      characterDeletions: 0,
      characterInsertions: 0,
      referenceCharacterCount: 10,
      wordAlignment: [],
      characterAlignment: [],
      keywordRecall: { total: 0, matched: 0, recall: null },
      nameAccuracy: { total: 0, matched: 0, recall: null },
      termAccuracy: { total: 0, matched: 0, recall: null },
    },
    latencyMs: 1000,
    rtf: 0.025,
    estimatedCostUsd: 0.01,
  },
  {
    id: 's2__fast',
    sampleId: 's2',
    modelId: 'fast',
    status: 'error',
    errorMessage: 'failed',
  },
  {
    id: 's1__accurate',
    sampleId: 's1',
    modelId: 'accurate',
    status: 'done',
    score: {
      wer: 0,
      cer: 0,
      wordHits: 5,
      wordSubstitutions: 0,
      wordDeletions: 0,
      wordInsertions: 0,
      referenceWordCount: 5,
      characterHits: 10,
      characterSubstitutions: 0,
      characterDeletions: 0,
      characterInsertions: 0,
      referenceCharacterCount: 10,
      wordAlignment: [],
      characterAlignment: [],
      keywordRecall: { total: 0, matched: 0, recall: null },
      nameAccuracy: { total: 0, matched: 0, recall: null },
      termAccuracy: { total: 0, matched: 0, recall: null },
    },
    latencyMs: 3000,
    rtf: 0.075,
    estimatedCostUsd: 0.02,
  },
];

describe('benchmark analytics', () => {
  test('creates a model leaderboard sorted by WER', () => {
    const leaderboard = createBenchmarkLeaderboard(results, targets);

    assert.equal(leaderboard[0].modelId, 'accurate');
    assert.equal(leaderboard[0].averageWer, 0);
    assert.equal(leaderboard[1].failureRate, 0.5);
  });

  test('creates dataset breakdown rows for language and duration', () => {
    const breakdown = createBenchmarkBreakdown(results, samples);
    const englishRow = breakdown.find((row) => row.dimension === 'language' && row.value === 'en');
    const longRow = breakdown.find((row) => row.dimension === 'duration' && row.value === 'long');

    assert.equal(englishRow?.completedCount, 2);
    assert.equal(longRow?.totalCount, 1);
    assert.equal(longRow?.failureRate, 1);
  });
});
