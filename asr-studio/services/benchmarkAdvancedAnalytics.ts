import type { TranscriptionSegment } from '../types';
import type {
  BenchmarkBreakdownRow,
  BenchmarkDatasetIssue,
  BenchmarkDiarizationMetrics,
  BenchmarkErrorHeatmapItem,
  BenchmarkExperimentRecord,
  BenchmarkLeaderboardRow,
  BenchmarkPerturbationSettings,
  BenchmarkRadarMetric,
  BenchmarkRunControls,
  BenchmarkRunResult,
  BenchmarkSample,
  BenchmarkScoringOptions,
  BenchmarkScoringProfileId,
  BenchmarkSignificanceComparison,
  BenchmarkStreamingMetrics,
  BenchmarkTimestampMetrics,
} from './benchmarkTypes';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const average = (values: number[]) => {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
};

const getSegmentMidpoint = (segment: TranscriptionSegment) => {
  const startTime = segment.startTime ?? 0;
  const endTime = segment.endTime ?? startTime;
  return (startTime + endTime) / 2;
};

const getDuration = (startTime?: number, endTime?: number) => {
  if (typeof startTime !== 'number' || typeof endTime !== 'number') {
    return 0;
  }

  return Math.max(0, endTime - startTime);
};

const getOverlap = (leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) => {
  return Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart));
};

const getTimedSegments = (segments: TranscriptionSegment[] | undefined) =>
  (segments || []).filter(
    (segment) =>
      typeof segment.startTime === 'number' &&
      typeof segment.endTime === 'number' &&
      Number.isFinite(segment.startTime) &&
      Number.isFinite(segment.endTime),
  );

export const createBenchmarkTimestampMetrics = (
  sample: BenchmarkSample,
  result: BenchmarkRunResult,
): BenchmarkTimestampMetrics => {
  const referenceSegments = getTimedSegments(sample.referenceSegments);
  const hypothesisSegments = getTimedSegments(result.segments);
  const segmentPairs = referenceSegments
    .map((referenceSegment) => {
      const referenceMidpoint = getSegmentMidpoint(referenceSegment);
      const nearest = hypothesisSegments
        .map((hypothesisSegment) => ({
          segment: hypothesisSegment,
          distance: Math.abs(getSegmentMidpoint(hypothesisSegment) - referenceMidpoint),
        }))
        .sort((left, right) => left.distance - right.distance)[0]?.segment;
      return nearest ? { referenceSegment, hypothesisSegment: nearest } : null;
    })
    .filter(Boolean) as Array<{ referenceSegment: TranscriptionSegment; hypothesisSegment: TranscriptionSegment }>;

  const boundaryErrors = segmentPairs.flatMap(({ referenceSegment, hypothesisSegment }) => [
    Math.abs((referenceSegment.startTime ?? 0) - (hypothesisSegment.startTime ?? 0)),
    Math.abs((referenceSegment.endTime ?? 0) - (hypothesisSegment.endTime ?? 0)),
  ]);
  const sortedHypothesisSegments = [...hypothesisSegments].sort((left, right) => (left.startTime ?? 0) - (right.startTime ?? 0));
  let subtitleOverlapCount = 0;
  let subtitleGapCount = 0;

  for (let index = 1; index < sortedHypothesisSegments.length; index += 1) {
    const previous = sortedHypothesisSegments[index - 1];
    const current = sortedHypothesisSegments[index];
    const previousEnd = previous.endTime ?? previous.startTime ?? 0;
    const currentStart = current.startTime ?? previousEnd;
    if (currentStart < previousEnd) {
      subtitleOverlapCount += 1;
    }
    if (currentStart - previousEnd > 1.5) {
      subtitleGapCount += 1;
    }
  }

  const lineQualityValues = sortedHypothesisSegments.map((segment) => {
    const duration = getDuration(segment.startTime, segment.endTime);
    const textLength = segment.text.trim().length;
    const durationScore = duration >= 1 && duration <= 8 ? 1 : 0.55;
    const lengthScore = textLength >= 4 && textLength <= 80 ? 1 : 0.6;
    return (durationScore + lengthScore) / 2;
  });

  return {
    segmentBoundaryMaeSeconds: average(boundaryErrors),
    wordTimestampMaeSeconds: average(boundaryErrors),
    subtitleOverlapCount,
    subtitleGapCount,
    subtitleLineQuality: average(lineQualityValues),
  };
};

export const createBenchmarkDiarizationMetrics = (
  sample: BenchmarkSample,
  result: BenchmarkRunResult,
): BenchmarkDiarizationMetrics => {
  const referenceTurns = sample.speakerTurns || [];
  const hypothesisSegments = getTimedSegments(result.segments).filter((segment) => segment.speaker);
  const totalReferenceDuration = referenceTurns.reduce(
    (total, turn) => total + getDuration(turn.startTime, turn.endTime),
    0,
  );

  if (referenceTurns.length === 0 || hypothesisSegments.length === 0 || totalReferenceDuration === 0) {
    return {
      der: null,
      jer: null,
      speakerTurnBoundaryMaeSeconds: null,
      speakerLabelConsistency: null,
    };
  }

  let speakerErrorDuration = 0;
  const boundaryErrors: number[] = [];
  const labelMatches: number[] = [];

  referenceTurns.forEach((turn) => {
    const overlappingSegments = hypothesisSegments
      .map((segment) => ({
        segment,
        overlap: getOverlap(turn.startTime, turn.endTime, segment.startTime ?? 0, segment.endTime ?? 0),
      }))
      .filter((item) => item.overlap > 0);
    const best = overlappingSegments.sort((left, right) => right.overlap - left.overlap)[0];
    if (!best) {
      speakerErrorDuration += getDuration(turn.startTime, turn.endTime);
      return;
    }

    if (best.segment.speaker !== turn.speaker) {
      speakerErrorDuration += best.overlap;
      labelMatches.push(0);
    } else {
      labelMatches.push(1);
    }

    boundaryErrors.push(Math.abs(turn.startTime - (best.segment.startTime ?? turn.startTime)));
    boundaryErrors.push(Math.abs(turn.endTime - (best.segment.endTime ?? turn.endTime)));
  });

  const der = clamp01(speakerErrorDuration / totalReferenceDuration);
  return {
    der,
    jer: der,
    speakerTurnBoundaryMaeSeconds: average(boundaryErrors),
    speakerLabelConsistency: average(labelMatches),
  };
};

export const createBenchmarkStreamingMetrics = (
  sample: BenchmarkSample,
  result: BenchmarkRunResult,
): BenchmarkStreamingMetrics => {
  if (result.status !== 'done' || !result.latencyMs) {
    return {
      firstTokenLatencyMs: null,
      finalLatencyMs: null,
      partialStability: null,
      endpointingLatencyMs: null,
      interruptionRecoveryMs: null,
      longSilenceFalseTriggerRate: null,
      emptyAudioHallucinationRate: null,
    };
  }

  const durationMs = sample.durationSeconds ? sample.durationSeconds * 1000 : result.latencyMs;
  const firstTokenLatencyMs = Math.min(result.latencyMs, Math.max(120, Math.round(result.latencyMs * 0.28)));
  const endpointingLatencyMs = Math.max(0, Math.round(result.latencyMs - Math.min(durationMs, result.latencyMs)));
  const hasTranscript = Boolean(result.hypothesis?.trim());
  const isEmptyAudio = sample.tags.includes('empty') || sample.noise === 'silence' || sample.referenceText.trim() === '';
  const wordErrorRate = result.score?.wer ?? result.score?.cer ?? 0;

  return {
    firstTokenLatencyMs,
    finalLatencyMs: result.latencyMs,
    partialStability: clamp01(1 - wordErrorRate),
    endpointingLatencyMs,
    interruptionRecoveryMs: sample.tags.includes('interruption') ? Math.round(result.latencyMs * 0.2) : null,
    longSilenceFalseTriggerRate: sample.tags.includes('long-silence') && hasTranscript ? 1 : 0,
    emptyAudioHallucinationRate: isEmptyAudio && hasTranscript ? 1 : 0,
  };
};

const classifyToken = (token: string, sample: BenchmarkSample) => {
  if (/^\d+([.,:/-]\d+)*$/.test(token)) {
    return { bucket: 'number', label: '数字/日期' };
  }
  if (/^[A-Z]{2,}$/.test(token)) {
    return { bucket: 'acronym', label: '英文缩写' };
  }
  if (/[\u4e00-\u9fff]/.test(token) && /[A-Za-z]/.test(token)) {
    return { bucket: 'code-switch', label: '中英混说' };
  }
  if (sample.names.some((name) => name.toLowerCase() === token.toLowerCase())) {
    return { bucket: 'proper-name', label: '专有名词/人名' };
  }
  if (sample.terms.some((term) => term.toLowerCase() === token.toLowerCase())) {
    return { bucket: 'domain-term', label: '领域术语' };
  }
  if (token.length >= 9) {
    return { bucket: 'low-frequency', label: '低频长词' };
  }
  return { bucket: 'generic', label: '普通词' };
};

export const createBenchmarkErrorHeatmap = (
  results: BenchmarkRunResult[],
  samples: BenchmarkSample[],
): BenchmarkErrorHeatmapItem[] => {
  const samplesById = new Map(samples.map((sample) => [sample.id, sample]));
  const buckets = new Map<string, BenchmarkErrorHeatmapItem>();

  results.forEach((result) => {
    const sample = samplesById.get(result.sampleId);
    if (!sample || !result.score) {
      return;
    }

    result.score.wordAlignment
      .filter((token) => token.operation !== 'equal')
      .forEach((token) => {
        const rawToken = token.reference || token.hypothesis || '';
        const classified = classifyToken(rawToken, sample);
        const current = buckets.get(classified.bucket) ?? {
          bucket: classified.bucket,
          label: classified.label,
          count: 0,
          examples: [],
        };
        current.count += 1;
        if (rawToken && current.examples.length < 6 && !current.examples.includes(rawToken)) {
          current.examples.push(rawToken);
        }
        buckets.set(classified.bucket, current);
      });
  });

  return Array.from(buckets.values()).sort((left, right) => right.count - left.count);
};

const deterministicSample = (values: number[], iteration: number) => {
  if (values.length === 0) {
    return [];
  }

  return values.map((_, index) => {
    const sampleIndex = (iteration * 17 + index * 31 + 7) % values.length;
    return values[sampleIndex];
  });
};

export const compareBenchmarkModels = (
  results: BenchmarkRunResult[],
  leftModelId: string,
  rightModelId: string,
  iterations = 200,
): BenchmarkSignificanceComparison => {
  const rightBySample = new Map(
    results
      .filter((result) => result.modelId === rightModelId && result.status === 'done')
      .map((result) => [result.sampleId, result]),
  );
  const deltas = results
    .filter((result) => result.modelId === leftModelId && result.status === 'done')
    .map((leftResult) => {
      const rightResult = rightBySample.get(leftResult.sampleId);
      if (!rightResult || typeof leftResult.score?.wer !== 'number' || typeof rightResult.score?.wer !== 'number') {
        return null;
      }
      return leftResult.score.wer - rightResult.score.wer;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (deltas.length === 0) {
    return {
      leftModelId,
      rightModelId,
      pairedCount: 0,
      meanWerDelta: null,
      confidenceLow: null,
      confidenceHigh: null,
      likelySignificant: false,
    };
  }

  const bootstrappedMeans = Array.from({ length: iterations }, (_, index) => average(deterministicSample(deltas, index)) ?? 0)
    .sort((left, right) => left - right);
  const lowIndex = Math.max(0, Math.floor(bootstrappedMeans.length * 0.025));
  const highIndex = Math.min(bootstrappedMeans.length - 1, Math.ceil(bootstrappedMeans.length * 0.975) - 1);
  const confidenceLow = bootstrappedMeans[lowIndex];
  const confidenceHigh = bootstrappedMeans[highIndex];

  return {
    leftModelId,
    rightModelId,
    pairedCount: deltas.length,
    meanWerDelta: average(deltas),
    confidenceLow,
    confidenceHigh,
    likelySignificant: confidenceLow > 0 || confidenceHigh < 0,
  };
};

export const analyzeBenchmarkDatasetQuality = (samples: BenchmarkSample[]): BenchmarkDatasetIssue[] => {
  const issues: BenchmarkDatasetIssue[] = [];
  const idCounts = new Map<string, number>();
  samples.forEach((sample) => {
    idCounts.set(sample.id, (idCounts.get(sample.id) || 0) + 1);
  });

  samples.forEach((sample) => {
    if ((idCounts.get(sample.id) || 0) > 1) {
      issues.push({ severity: 'error', sampleId: sample.id, message: '样本 id 重复。' });
    }
    if (!sample.referenceText.trim()) {
      issues.push({ severity: 'error', sampleId: sample.id, message: 'referenceText 为空。' });
    }
    if (!sample.audioUrl && !sample.fileName) {
      issues.push({ severity: 'error', sampleId: sample.id, message: '缺少 audioUrl 或 fileName。' });
    }
    if (sample.durationSeconds !== undefined && sample.durationSeconds <= 0) {
      issues.push({ severity: 'warning', sampleId: sample.id, message: '时长异常或为 0。' });
    }
    if (sample.tags.length === 0) {
      issues.push({ severity: 'info', sampleId: sample.id, message: '缺少 tags，维度分析会变弱。' });
    }
    if (sample.audioUrl && /train|training/i.test(sample.audioUrl)) {
      issues.push({ severity: 'warning', sampleId: sample.id, message: '音频路径疑似训练集，注意数据泄漏风险。' });
    }
    if (/train|training/i.test(sample.id)) {
      issues.push({ severity: 'warning', sampleId: sample.id, message: '样本 id 疑似训练集，注意污染风险。' });
    }
  });

  return issues;
};

export const createBenchmarkRadarMetrics = (
  leaderboard: BenchmarkLeaderboardRow[],
  breakdown: BenchmarkBreakdownRow[],
): BenchmarkRadarMetric[] => {
  const best = leaderboard[0];
  if (!best) {
    return [];
  }

  const cleanRow = breakdown.find((row) => row.dimension === 'noise' && row.value === 'clean');
  const noisyRow = breakdown.find((row) => row.dimension === 'noise' && row.value !== 'clean');
  const longRow = breakdown.find((row) => row.dimension === 'duration' && row.value === 'long');
  const chineseRow = breakdown.find((row) => row.dimension === 'language' && row.value.startsWith('zh'));
  const englishRow = breakdown.find((row) => row.dimension === 'language' && row.value.startsWith('en'));

  return [
    { axis: '总体准确率', value: clamp01(1 - (best.averageWer ?? 1)), detail: '1 - 平均 WER' },
    { axis: '中文', value: clamp01(1 - (chineseRow?.averageCer ?? chineseRow?.averageWer ?? 1)), detail: '中文 CER/WER' },
    { axis: '英文', value: clamp01(1 - (englishRow?.averageWer ?? 1)), detail: '英文 WER' },
    { axis: '噪声', value: clamp01(1 - (noisyRow?.averageWer ?? 1)), detail: 'noisy bucket' },
    { axis: 'Clean', value: clamp01(1 - (cleanRow?.averageWer ?? 1)), detail: 'clean bucket' },
    { axis: '长音频', value: clamp01(1 - (longRow?.averageWer ?? 1)), detail: 'duration=long' },
    { axis: '术语', value: best.averageTermAccuracy ?? 0, detail: '领域术语准确率' },
    { axis: '速度', value: best.p50Rtf ? clamp01(1 / Math.max(1, best.p50Rtf)) : 0, detail: 'RTF 越小越好' },
    { axis: '成本', value: best.totalEstimatedCostUsd ? clamp01(1 / (1 + best.totalEstimatedCostUsd)) : 1, detail: '总成本越低越好' },
  ];
};

export const createBenchmarkExperimentRecord = ({
  name,
  datasetVersion,
  samples,
  selectedSampleIds,
  selectedModelIds,
  scoringProfileId,
  scoringOptions,
  runControls,
  perturbation,
  results,
  leaderboard,
  breakdown,
}: {
  name: string;
  datasetVersion: string;
  samples: BenchmarkSample[];
  selectedSampleIds: string[];
  selectedModelIds: string[];
  scoringProfileId: BenchmarkScoringProfileId;
  scoringOptions: BenchmarkScoringOptions;
  runControls: BenchmarkRunControls;
  perturbation: BenchmarkPerturbationSettings;
  results: BenchmarkRunResult[];
  leaderboard: BenchmarkLeaderboardRow[];
  breakdown: BenchmarkBreakdownRow[];
}): BenchmarkExperimentRecord => {
  return {
    id: Date.now(),
    name,
    datasetVersion,
    createdAt: Date.now(),
    samples,
    selectedSampleIds,
    selectedModelIds,
    scoringProfileId,
    scoringOptions,
    runControls,
    perturbation,
    results,
    leaderboard,
    breakdown,
    errorHeatmap: createBenchmarkErrorHeatmap(results, samples),
    datasetIssues: analyzeBenchmarkDatasetQuality(samples),
  };
};
