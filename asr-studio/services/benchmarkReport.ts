import type {
  BenchmarkDatasetIssue,
  BenchmarkErrorHeatmapItem,
  BenchmarkExperimentRecord,
  BenchmarkLeaderboardRow,
  BenchmarkRadarMetric,
  BenchmarkSignificanceComparison,
} from './benchmarkTypes';
import { formatBenchmarkCost, formatBenchmarkMs, formatBenchmarkPercent } from './benchmarkAnalytics';

const formatIssue = (issue: BenchmarkDatasetIssue) =>
  `- [${issue.severity}] ${issue.sampleId ? `${issue.sampleId}: ` : ''}${issue.message}`;

const createLeaderboardTable = (leaderboard: BenchmarkLeaderboardRow[]) => {
  const header = '| Model | Done | WER | CER | P50 | P95 | RTF | Fail | Cost |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|';
  const rows = leaderboard.map(
    (row) =>
      `| ${row.label} | ${row.completedCount}/${row.totalCount} | ${formatBenchmarkPercent(row.averageWer)} | ${formatBenchmarkPercent(
        row.averageCer,
      )} | ${formatBenchmarkMs(row.p50LatencyMs)} | ${formatBenchmarkMs(row.p95LatencyMs)} | ${
        row.p50Rtf?.toFixed(2) ?? '-'
      } | ${formatBenchmarkPercent(row.failureRate)} | ${formatBenchmarkCost(row.totalEstimatedCostUsd)} |`,
  );
  return [header, ...rows].join('\n');
};

const createHeatmapList = (heatmap: BenchmarkErrorHeatmapItem[]) => {
  if (heatmap.length === 0) {
    return '- No errors collected.';
  }

  return heatmap
    .map((item) => `- ${item.label}: ${item.count} (${item.examples.slice(0, 5).join(', ') || '-'})`)
    .join('\n');
};

const createRadarList = (radar: BenchmarkRadarMetric[]) => {
  if (radar.length === 0) {
    return '- No radar metrics.';
  }

  return radar.map((item) => `- ${item.axis}: ${(item.value * 100).toFixed(1)}% (${item.detail})`).join('\n');
};

const createSignificanceList = (comparisons: BenchmarkSignificanceComparison[]) => {
  if (comparisons.length === 0) {
    return '- No paired model comparison.';
  }

  return comparisons
    .map(
      (comparison) =>
        `- ${comparison.leftModelId} vs ${comparison.rightModelId}: ΔWER ${
          comparison.meanWerDelta?.toFixed(4) ?? '-'
        }, 95% CI [${comparison.confidenceLow?.toFixed(4) ?? '-'}, ${
          comparison.confidenceHigh?.toFixed(4) ?? '-'
        }], ${comparison.likelySignificant ? 'likely significant' : 'not significant'}`,
    )
    .join('\n');
};

export const createBenchmarkMarkdownReport = (
  experiment: BenchmarkExperimentRecord,
  {
    radar = [],
    comparisons = [],
  }: {
    radar?: BenchmarkRadarMetric[];
    comparisons?: BenchmarkSignificanceComparison[];
  } = {},
) => {
  const completed = experiment.results.filter((result) => result.status === 'done').length;
  const failed = experiment.results.filter((result) => result.status === 'error').length;

  return [
    `# ASR Benchmark Report: ${experiment.name}`,
    '',
    `- Created: ${new Date(experiment.createdAt).toISOString()}`,
    `- Dataset version: ${experiment.datasetVersion}`,
    `- Samples: ${experiment.selectedSampleIds.length}/${experiment.samples.length}`,
    `- Models: ${experiment.selectedModelIds.length}`,
    `- Runs: ${experiment.results.length} (${completed} completed, ${failed} failed)`,
    `- Scoring profile: ${experiment.scoringProfileId}`,
    `- Perturbation: ${experiment.perturbation.enabled ? `${experiment.perturbation.mode} (${experiment.perturbation.intensity})` : 'none'}`,
    '',
    '## Leaderboard',
    '',
    createLeaderboardTable(experiment.leaderboard),
    '',
    '## Dataset Issues',
    '',
    experiment.datasetIssues.length ? experiment.datasetIssues.map(formatIssue).join('\n') : '- No dataset issues.',
    '',
    '## Error Heatmap',
    '',
    createHeatmapList(experiment.errorHeatmap),
    '',
    '## Significance',
    '',
    createSignificanceList(comparisons),
    '',
    '## Capability Radar',
    '',
    createRadarList(radar),
  ].join('\n');
};

export const createBenchmarkHtmlReport = (
  experiment: BenchmarkExperimentRecord,
  options?: Parameters<typeof createBenchmarkMarkdownReport>[1],
) => {
  const markdown = createBenchmarkMarkdownReport(experiment, options);
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${experiment.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; color: #0f172a; }
    pre { white-space: pre-wrap; line-height: 1.55; }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
</body>
</html>`;
};

export const downloadBenchmarkTextFile = (fileName: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};
