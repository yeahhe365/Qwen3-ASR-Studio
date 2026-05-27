import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  analyzeBenchmarkDatasetQuality,
  compareBenchmarkModels,
  createBenchmarkDiarizationMetrics,
  createBenchmarkErrorHeatmap,
  createBenchmarkRadarMetrics,
  createBenchmarkStreamingMetrics,
  createBenchmarkTimestampMetrics,
} from '../services/benchmarkAdvancedAnalytics.ts';
import type { BenchmarkBreakdownRow, BenchmarkLeaderboardRow, BenchmarkRunResult, BenchmarkSample } from '../services/benchmarkTypes.ts';

const sample: BenchmarkSample = {
  id: 'meeting-1',
  fileName: 'meeting.wav',
  referenceText: 'Alice reports 2026 revenue',
  language: 'en',
  domain: 'meeting',
  durationSeconds: 10,
  speaker: 'multi',
  noise: 'clean',
  accent: 'us',
  tags: ['meeting', 'long-silence'],
  keywords: ['revenue'],
  names: ['Alice'],
  terms: ['revenue'],
  referenceSegments: [
    { id: 'ref-1', text: 'Alice reports', startTime: 0, endTime: 2, speaker: 'spk1' },
    { id: 'ref-2', text: '2026 revenue', startTime: 2.5, endTime: 5, speaker: 'spk2' },
  ],
  speakerTurns: [
    { speaker: 'spk1', startTime: 0, endTime: 2 },
    { speaker: 'spk2', startTime: 2.5, endTime: 5 },
  ],
};

const doneResult: BenchmarkRunResult = {
  id: 'meeting-1__left',
  sampleId: 'meeting-1',
  modelId: 'left',
  status: 'done',
  hypothesis: 'Alice reports 2025 revenue',
  latencyMs: 1500,
  score: {
    wer: 0.25,
    cer: 0.1,
    wordHits: 3,
    wordSubstitutions: 1,
    wordDeletions: 0,
    wordInsertions: 0,
    referenceWordCount: 4,
    characterHits: 20,
    characterSubstitutions: 2,
    characterDeletions: 0,
    characterInsertions: 0,
    referenceCharacterCount: 22,
    wordAlignment: [
      { operation: 'equal', reference: 'Alice', hypothesis: 'Alice' },
      { operation: 'equal', reference: 'reports', hypothesis: 'reports' },
      { operation: 'substitute', reference: '2026', hypothesis: '2025' },
      { operation: 'equal', reference: 'revenue', hypothesis: 'revenue' },
    ],
    characterAlignment: [],
    keywordRecall: { total: 1, matched: 1, recall: 1 },
    nameAccuracy: { total: 1, matched: 1, recall: 1 },
    termAccuracy: { total: 1, matched: 1, recall: 1 },
  },
  segments: [
    { id: 'hyp-1', text: 'Alice reports', startTime: 0.2, endTime: 2.1, speaker: 'spk1' },
    { id: 'hyp-2', text: '2025 revenue', startTime: 2.6, endTime: 5.2, speaker: 'spkX' },
  ],
};

describe('benchmark advanced analytics', () => {
  test('scores timestamp, diarization, streaming, and heatmap metrics', () => {
    const timestampMetrics = createBenchmarkTimestampMetrics(sample, doneResult);
    const diarizationMetrics = createBenchmarkDiarizationMetrics(sample, doneResult);
    const streamingMetrics = createBenchmarkStreamingMetrics(sample, doneResult);
    const heatmap = createBenchmarkErrorHeatmap([doneResult], [sample]);

    assert.equal(timestampMetrics.subtitleOverlapCount, 0);
    assert.equal(timestampMetrics.subtitleGapCount, 0);
    assert.ok((timestampMetrics.segmentBoundaryMaeSeconds ?? 0) > 0);
    assert.equal(diarizationMetrics.speakerLabelConsistency, 0.5);
    assert.ok((diarizationMetrics.der ?? 0) > 0.5);
    assert.equal(streamingMetrics.finalLatencyMs, 1500);
    assert.equal(streamingMetrics.longSilenceFalseTriggerRate, 1);
    assert.equal(heatmap[0].bucket, 'number');
  });

  test('compares paired model WER and checks dataset/radar signals', () => {
    const rightResult: BenchmarkRunResult = {
      ...doneResult,
      id: 'meeting-1__right',
      modelId: 'right',
      score: {
        ...doneResult.score!,
        wer: 0,
      },
    };
    const comparison = compareBenchmarkModels([doneResult, rightResult], 'left', 'right', 20);
    const issues = analyzeBenchmarkDatasetQuality([{ ...sample, id: 'training-sample', tags: [] }]);
    const leaderboard: BenchmarkLeaderboardRow[] = [
      {
        modelId: 'right',
        label: 'Right',
        totalCount: 1,
        completedCount: 1,
        failedCount: 0,
        failureRate: 0,
        averageWer: 0.1,
        averageCer: 0.05,
        p50LatencyMs: 1000,
        p95LatencyMs: 1000,
        p50Rtf: 0.5,
        p95Rtf: 0.5,
        averageEstimatedCostUsd: 0.01,
        totalEstimatedCostUsd: 0.01,
        averageKeywordRecall: 1,
        averageNameAccuracy: 1,
        averageTermAccuracy: 1,
      },
    ];
    const breakdown: BenchmarkBreakdownRow[] = [
      { dimension: 'language', value: 'en', totalCount: 1, completedCount: 1, averageWer: 0.1, averageCer: 0.05, failureRate: 0, averageKeywordRecall: 1, averageNameAccuracy: 1, averageTermAccuracy: 1 },
      { dimension: 'noise', value: 'clean', totalCount: 1, completedCount: 1, averageWer: 0.1, averageCer: 0.05, failureRate: 0, averageKeywordRecall: 1, averageNameAccuracy: 1, averageTermAccuracy: 1 },
    ];

    assert.equal(comparison.pairedCount, 1);
    assert.equal(comparison.meanWerDelta, 0.25);
    assert.ok(issues.some((issue) => /训练集|污染/.test(issue.message)));
    assert.ok(createBenchmarkRadarMetrics(leaderboard, breakdown).some((metric) => metric.axis === '术语'));
  });
});
