import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
  clearBenchmarkRegressionPlan,
  createBenchmarkRegressionPlan,
  getBenchmarkRegressionPlan,
  isBenchmarkRegressionDue,
  markBenchmarkRegressionRun,
  saveBenchmarkRegressionPlan,
} from '../services/benchmarkRegression.ts';
import { createBenchmarkHtmlReport, createBenchmarkMarkdownReport } from '../services/benchmarkReport.ts';
import type { BenchmarkExperimentRecord } from '../services/benchmarkTypes.ts';

const storage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
});

afterEach(() => {
  storage.clear();
});

const experiment: BenchmarkExperimentRecord = {
  id: 1,
  name: 'Smoke',
  datasetVersion: 'dataset-v1',
  createdAt: 1_700_000_000_000,
  samples: [],
  selectedSampleIds: ['s1'],
  selectedModelIds: ['m1'],
  scoringProfileId: 'open-asr',
  scoringOptions: { ignorePunctuation: true, normalizeCase: true, normalizeItn: true },
  runControls: { concurrency: 1, rateLimitMs: 0, retryLimit: 0, budgetLimitUsd: 0 },
  perturbation: { enabled: false, mode: 'none', intensity: 0.5 },
  results: [{ id: 's1__m1', sampleId: 's1', modelId: 'm1', status: 'done' }],
  leaderboard: [
    {
      modelId: 'm1',
      label: 'Model 1',
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
  ],
  breakdown: [],
  errorHeatmap: [{ bucket: 'number', label: '数字/日期', count: 2, examples: ['2026'] }],
  datasetIssues: [{ severity: 'warning', sampleId: 's1', message: '时长异常或为 0。' }],
};

describe('benchmark reports and regression plans', () => {
  test('creates markdown and escaped HTML reports', () => {
    const markdown = createBenchmarkMarkdownReport(experiment, {
      radar: [{ axis: '总体准确率', value: 0.9, detail: '1 - WER' }],
      comparisons: [
        {
          leftModelId: 'm1',
          rightModelId: 'm2',
          pairedCount: 1,
          meanWerDelta: -0.1,
          confidenceLow: -0.1,
          confidenceHigh: -0.1,
          likelySignificant: true,
        },
      ],
    });
    const html = createBenchmarkHtmlReport({ ...experiment, name: '<Smoke>' });

    assert.match(markdown, /ASR Benchmark Report/);
    assert.match(markdown, /Model 1/);
    assert.match(markdown, /数字\/日期/);
    assert.match(html, /&lt;Smoke&gt;/);
  });

  test('persists and advances local regression plans', () => {
    const plan = createBenchmarkRegressionPlan({ name: 'Daily smoke', sampleLimit: 3.8, intervalHours: 12.2 });
    saveBenchmarkRegressionPlan(plan);

    const storedPlan = getBenchmarkRegressionPlan();
    assert.equal(storedPlan?.sampleLimit, 3);
    assert.equal(storedPlan?.intervalHours, 12);
    assert.equal(isBenchmarkRegressionDue(storedPlan, plan.createdAt), false);
    assert.equal(isBenchmarkRegressionDue(storedPlan, plan.nextRunAt), true);

    const updatedPlan = markBenchmarkRegressionRun(plan, plan.nextRunAt);
    assert.equal(updatedPlan.nextRunAt, plan.nextRunAt + 12 * 60 * 60 * 1000);
    clearBenchmarkRegressionPlan();
    assert.equal(getBenchmarkRegressionPlan(), null);
  });
});
