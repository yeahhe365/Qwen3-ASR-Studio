import type {
  BenchmarkBreakdownRow,
  BenchmarkLeaderboardRow,
  BenchmarkModelTarget,
  BenchmarkRunResult,
  BenchmarkSample,
} from './benchmarkTypes';
import { getBenchmarkTargetLabel } from './benchmarkModels';

const average = (values: number[]) => {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
};

const percentile = (values: number[], percentileValue: number) => {
  if (values.length === 0) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(percentileValue * sortedValues.length) - 1));
  return sortedValues[index];
};

const definedNumbers = (values: Array<number | null | undefined>) => {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
};

export const createBenchmarkLeaderboard = (
  results: BenchmarkRunResult[],
  targets: BenchmarkModelTarget[],
): BenchmarkLeaderboardRow[] => {
  const targetsById = new Map(targets.map((target) => [target.id, target]));

  return targets
    .map((target) => {
      const modelResults = results.filter((result) => result.modelId === target.id);
      const completedResults = modelResults.filter((result) => result.status === 'done');
      const failedResults = modelResults.filter((result) => result.status === 'error');
      const costValues = definedNumbers(completedResults.map((result) => result.runCostUsd ?? result.estimatedCostUsd));
      const totalCost = costValues.length ? costValues.reduce((total, value) => total + value, 0) : null;

      return {
        modelId: target.id,
        label: getBenchmarkTargetLabel(targetsById.get(target.id) || target),
        totalCount: modelResults.length,
        completedCount: completedResults.length,
        failedCount: failedResults.length,
        failureRate: modelResults.length ? failedResults.length / modelResults.length : 0,
        averageWer: average(definedNumbers(completedResults.map((result) => result.score?.wer))),
        averageCer: average(definedNumbers(completedResults.map((result) => result.score?.cer))),
        p50LatencyMs: percentile(definedNumbers(completedResults.map((result) => result.latencyMs)), 0.5),
        p95LatencyMs: percentile(definedNumbers(completedResults.map((result) => result.latencyMs)), 0.95),
        p50Rtf: percentile(definedNumbers(completedResults.map((result) => result.rtf)), 0.5),
        p95Rtf: percentile(definedNumbers(completedResults.map((result) => result.rtf)), 0.95),
        averageEstimatedCostUsd: average(costValues),
        totalEstimatedCostUsd: totalCost,
        averageKeywordRecall: average(
          definedNumbers(completedResults.map((result) => result.score?.keywordRecall.recall)),
        ),
        averageNameAccuracy: average(definedNumbers(completedResults.map((result) => result.score?.nameAccuracy.recall))),
        averageTermAccuracy: average(definedNumbers(completedResults.map((result) => result.score?.termAccuracy.recall))),
      };
    })
    .filter((row) => row.totalCount > 0)
    .sort((left, right) => {
      const leftWer = left.averageWer ?? Number.POSITIVE_INFINITY;
      const rightWer = right.averageWer ?? Number.POSITIVE_INFINITY;
      if (leftWer !== rightWer) {
        return leftWer - rightWer;
      }
      return (left.p50LatencyMs ?? Number.POSITIVE_INFINITY) - (right.p50LatencyMs ?? Number.POSITIVE_INFINITY);
    });
};

const getSampleDimensionValues = (sample: BenchmarkSample, dimension: string) => {
  switch (dimension) {
    case 'language':
      return [sample.language || 'unknown'];
    case 'domain':
      return [sample.domain || 'unknown'];
    case 'noise':
      return [sample.noise || 'unknown'];
    case 'speaker':
      return [sample.speaker || 'unknown'];
    case 'accent':
      return [sample.accent || 'unknown'];
    case 'tags':
      return sample.tags.length ? sample.tags : ['untagged'];
    case 'duration':
      if (!sample.durationSeconds) {
        return ['unknown'];
      }
      if (sample.durationSeconds >= 600) {
        return ['long'];
      }
      if (sample.durationSeconds >= 60) {
        return ['medium'];
      }
      return ['short'];
    default:
      return ['unknown'];
  }
};

export const createBenchmarkBreakdown = (
  results: BenchmarkRunResult[],
  samples: BenchmarkSample[],
  dimensions = ['language', 'domain', 'noise', 'speaker', 'accent', 'tags', 'duration'],
): BenchmarkBreakdownRow[] => {
  const samplesById = new Map(samples.map((sample) => [sample.id, sample]));
  const rows: BenchmarkBreakdownRow[] = [];

  dimensions.forEach((dimension) => {
    const buckets = new Map<string, BenchmarkRunResult[]>();
    results.forEach((result) => {
      const sample = samplesById.get(result.sampleId);
      if (!sample) {
        return;
      }

      getSampleDimensionValues(sample, dimension).forEach((value) => {
        buckets.set(value, [...(buckets.get(value) || []), result]);
      });
    });

    buckets.forEach((bucketResults, value) => {
      const completedResults = bucketResults.filter((result) => result.status === 'done');
      const failedResults = bucketResults.filter((result) => result.status === 'error');
      rows.push({
        dimension,
        value,
        totalCount: bucketResults.length,
        completedCount: completedResults.length,
        averageWer: average(definedNumbers(completedResults.map((result) => result.score?.wer))),
        averageCer: average(definedNumbers(completedResults.map((result) => result.score?.cer))),
        failureRate: bucketResults.length ? failedResults.length / bucketResults.length : 0,
        averageKeywordRecall: average(
          definedNumbers(completedResults.map((result) => result.score?.keywordRecall.recall)),
        ),
        averageNameAccuracy: average(definedNumbers(completedResults.map((result) => result.score?.nameAccuracy.recall))),
        averageTermAccuracy: average(definedNumbers(completedResults.map((result) => result.score?.termAccuracy.recall))),
      });
    });
  });

  return rows.sort((left, right) => {
    if (left.dimension !== right.dimension) {
      return left.dimension.localeCompare(right.dimension);
    }
    return (right.averageWer ?? 0) - (left.averageWer ?? 0);
  });
};

export const formatBenchmarkPercent = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return `${(value * 100).toFixed(1)}%`;
};

export const formatBenchmarkMs = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }

  return `${Math.round(value)}ms`;
};

export const formatBenchmarkCost = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  if (value === 0) {
    return '$0';
  }

  return `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
};
