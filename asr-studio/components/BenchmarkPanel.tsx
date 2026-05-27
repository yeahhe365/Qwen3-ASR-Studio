import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CompressionLevel, type AsrProviderConfig, type Language } from '../types';
import type {
  BenchmarkAlignmentToken,
  BenchmarkExperimentRecord,
  BenchmarkModelTarget,
  BenchmarkPerturbationMode,
  BenchmarkPerturbationSettings,
  BenchmarkRunControls,
  BenchmarkRunResult,
  BenchmarkSample,
  BenchmarkScoringProfileId,
  BenchmarkScoringOptions,
} from '../services/benchmarkTypes';
import { createBenchmarkBreakdown, createBenchmarkLeaderboard, formatBenchmarkCost, formatBenchmarkMs, formatBenchmarkPercent } from '../services/benchmarkAnalytics';
import {
  analyzeBenchmarkDatasetQuality,
  compareBenchmarkModels,
  createBenchmarkErrorHeatmap,
  createBenchmarkExperimentRecord,
  createBenchmarkRadarMetrics,
} from '../services/benchmarkAdvancedAnalytics';
import { benchmarkDatasetCatalog, getBenchmarkDatasetCatalogEntry } from '../services/benchmarkCatalog';
import { parseBenchmarkManifest } from '../services/benchmarkManifest';
import { estimateBenchmarkCost, getBenchmarkModelTargets, getBenchmarkTargetLabel } from '../services/benchmarkModels';
import { benchmarkScoringProfiles, getBenchmarkScoringProfile } from '../services/benchmarkProfiles';
import {
  clearBenchmarkRegressionPlan,
  createBenchmarkRegressionPlan,
  getBenchmarkRegressionPlan,
  isBenchmarkRegressionDue,
  markBenchmarkRegressionRun,
  saveBenchmarkRegressionPlan,
  type BenchmarkRegressionPlan,
} from '../services/benchmarkRegression';
import { createBenchmarkHtmlReport, createBenchmarkMarkdownReport, downloadBenchmarkTextFile } from '../services/benchmarkReport';
import { createBenchmarkAudioFileIndex, createBenchmarkResultId, runBenchmarkTranscription } from '../services/benchmarkRunner';
import { benchmarkDefaultScoringOptions } from '../services/benchmarkScoring';
import {
  addBenchmarkExperiment,
  deleteBenchmarkExperiment,
  getBenchmarkExperiments,
} from '../services/cacheService';
import { EmptyState } from './EmptyState';
import { CheckIcon } from './icons/CheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { InfoIcon } from './icons/InfoIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { PauseIcon } from './icons/PauseIcon';
import { RestoreIcon } from './icons/RestoreIcon';
import { SaveIcon } from './icons/SaveIcon';
import { SearchIcon } from './icons/SearchIcon';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import { StopIcon } from './icons/StopIcon';
import { ToolboxIcon } from './icons/ToolboxIcon';
import { UploadIcon } from './icons/UploadIcon';

type Notify = (message: string, type: 'success' | 'error') => void;

interface BenchmarkPanelProps {
  asrConfig: AsrProviderConfig;
  language: Language;
  context: string;
  enableItn: boolean;
  compressionLevel: CompressionLevel;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
  disabled?: boolean;
  notify: Notify;
  onRunningChange?: (running: boolean) => void;
}

const formatNumber = (value: number | null | undefined, digits = 3) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return value.toFixed(digits);
};

const formatDateTime = (timestamp: number | null | undefined) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return '-';
  }

  return new Date(timestamp).toLocaleString();
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, milliseconds));
  });

const joinSampleMeta = (sample: BenchmarkSample) => {
  return [
    sample.language,
    sample.domain,
    sample.noise,
    sample.speaker,
    sample.accent,
    sample.durationSeconds ? `${sample.durationSeconds}s` : '',
    ...sample.tags,
  ]
    .filter(Boolean)
    .join(' · ');
};

const getRunStatusLabel = (status: BenchmarkRunResult['status']) => {
  const labels: Record<BenchmarkRunResult['status'], string> = {
    pending: '等待',
    running: '运行',
    done: '完成',
    error: '失败',
    cancelled: '取消',
  };

  return labels[status];
};

const perturbationModeLabels: Record<BenchmarkPerturbationMode, string> = {
  none: '无扰动',
  noise: '加噪',
  reverb: '混响',
  speed: '变速',
  volume: '音量变化',
  compression: '压缩失真',
  telephone: '电话带宽',
  'background-music': '背景音乐',
};

const reviewErrorTypes = ['替换', '漏词', '插入', '标点/大小写', 'ITN/数字', '人名/术语', '说话人', '时间戳', '其他'];

const getRunStatusClassName = (status: BenchmarkRunResult['status']) => {
  if (status === 'done') {
    return 'text-green-600 dark:text-green-400';
  }
  if (status === 'error') {
    return 'text-red-500';
  }
  if (status === 'running') {
    return 'text-brand-primary';
  }
  return 'text-content-200';
};

const downloadJson = (fileName: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const renderAlignment = (alignment: BenchmarkAlignmentToken[], limit = 80) => {
  if (alignment.length === 0) {
    return <span className="text-content-200">-</span>;
  }

  return alignment.slice(0, limit).map((token, index) => {
    const key = `${index}-${token.operation}-${token.reference || ''}-${token.hypothesis || ''}`;
    if (token.operation === 'equal') {
      return (
        <span key={key} className="rounded bg-green-500/10 px-1 text-green-700 dark:text-green-300">
          {token.reference}
        </span>
      );
    }
    if (token.operation === 'insert') {
      return (
        <span key={key} className="rounded bg-blue-500/10 px-1 text-blue-700 dark:text-blue-300">
          +{token.hypothesis}
        </span>
      );
    }
    if (token.operation === 'delete') {
      return (
        <span key={key} className="rounded bg-red-500/10 px-1 text-red-600 line-through dark:text-red-300">
          -{token.reference}
        </span>
      );
    }
    return (
      <span key={key} className="rounded bg-amber-500/10 px-1 text-amber-700 dark:text-amber-300">
        {token.reference}→{token.hypothesis}
      </span>
    );
  });
};

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({
  asrConfig,
  language,
  context,
  enableItn,
  compressionLevel,
  trimSilence,
  enableLongAudioChunking,
  disabled,
  notify,
  onRunningChange,
}) => {
  const manifestInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const baseTargets = useMemo(() => getBenchmarkModelTargets(), []);
  const [costOverrides, setCostOverrides] = useState<Record<string, string>>(() =>
    Object.fromEntries(baseTargets.map((target) => [target.id, String(target.costPerMinuteUsd)])),
  );
  const allTargets = useMemo(
    () =>
      baseTargets.map((target) => {
        const parsedCost = Number(costOverrides[target.id]);
        return {
          ...target,
          costPerMinuteUsd: Number.isFinite(parsedCost) && parsedCost >= 0 ? parsedCost : target.costPerMinuteUsd,
        };
      }),
    [baseTargets, costOverrides],
  );
  const defaultTargetId =
    asrConfig.provider === 'mainstream'
      ? `mainstream:${asrConfig.mainstreamAsrModel}`
      : asrConfig.provider;

  const [samples, setSamples] = useState<BenchmarkSample[]>([]);
  const [sampleQuery, setSampleQuery] = useState('');
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [manifestErrors, setManifestErrors] = useState<string[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([defaultTargetId]);
  const [results, setResults] = useState<BenchmarkRunResult[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [datasetVersion, setDatasetVersion] = useState('local-dataset');
  const [scoringProfileId, setScoringProfileId] = useState<BenchmarkScoringProfileId>('open-asr');
  const [scoringOptions, setScoringOptions] = useState<BenchmarkScoringOptions>(benchmarkDefaultScoringOptions);
  const [runControls, setRunControls] = useState<BenchmarkRunControls>({
    concurrency: 1,
    rateLimitMs: 0,
    retryLimit: 0,
    budgetLimitUsd: 0,
  });
  const [perturbation, setPerturbation] = useState<BenchmarkPerturbationSettings>({
    enabled: false,
    mode: 'none',
    intensity: 0.5,
  });
  const [selectedCatalogId, setSelectedCatalogId] = useState(benchmarkDatasetCatalog[0]?.id || '');
  const [experiments, setExperiments] = useState<BenchmarkExperimentRecord[]>([]);
  const [selectedExperimentIds, setSelectedExperimentIds] = useState<number[]>([]);
  const [leftCompareModelId, setLeftCompareModelId] = useState('');
  const [rightCompareModelId, setRightCompareModelId] = useState('');
  const [regressionPlan, setRegressionPlan] = useState<BenchmarkRegressionPlan | null>(null);
  const [regressionName, setRegressionName] = useState('ASR Benchmark Regression');
  const [regressionSampleLimit, setRegressionSampleLimit] = useState(12);
  const [regressionIntervalHours, setRegressionIntervalHours] = useState(24);
  const [reviewCorrectedReference, setReviewCorrectedReference] = useState('');
  const [reviewErrorType, setReviewErrorType] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const pauseRef = useRef(false);

  const refreshExperiments = async () => {
    const storedExperiments = await getBenchmarkExperiments();
    setExperiments(storedExperiments);
    setSelectedExperimentIds((currentIds) => currentIds.filter((id) => storedExperiments.some((experiment) => experiment.id === id)));
  };

  useEffect(() => {
    onRunningChange?.(isRunning);
  }, [isRunning, onRunningChange]);

  useEffect(() => {
    setSelectedModelIds((currentIds) => (currentIds.length ? currentIds : [defaultTargetId]));
  }, [defaultTargetId]);

  useEffect(() => {
    setScoringOptions(getBenchmarkScoringProfile(scoringProfileId).options);
  }, [scoringProfileId]);

  useEffect(() => {
    pauseRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    void refreshExperiments();
    setRegressionPlan(getBenchmarkRegressionPlan());
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const audioFileIndex = useMemo(() => createBenchmarkAudioFileIndex(audioFiles), [audioFiles]);
  const selectedSamples = useMemo(
    () => samples.filter((sample) => selectedSampleIds.includes(sample.id)),
    [samples, selectedSampleIds],
  );
  const selectedTargets = useMemo(
    () => allTargets.filter((target) => selectedModelIds.includes(target.id)),
    [allTargets, selectedModelIds],
  );
  const filteredSamples = useMemo(() => {
    const query = sampleQuery.trim().toLowerCase();
    if (!query) {
      return samples;
    }

    return samples.filter((sample) =>
      [sample.id, sample.fileName, sample.audioUrl, sample.referenceText, sample.language, sample.domain, sample.noise, ...sample.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [sampleQuery, samples]);
  const selectedResult = useMemo(
    () => results.find((result) => result.id === selectedResultId) || results.find((result) => result.status === 'done'),
    [results, selectedResultId],
  );
  const selectedResultSample = selectedResult ? samples.find((sample) => sample.id === selectedResult.sampleId) : undefined;
  const leaderboard = useMemo(() => createBenchmarkLeaderboard(results, allTargets), [allTargets, results]);
  const breakdown = useMemo(() => createBenchmarkBreakdown(results, samples), [results, samples]);
  const datasetIssues = useMemo(() => analyzeBenchmarkDatasetQuality(samples), [samples]);
  const errorHeatmap = useMemo(() => createBenchmarkErrorHeatmap(results, samples), [results, samples]);
  const radarMetrics = useMemo(() => createBenchmarkRadarMetrics(leaderboard, breakdown), [breakdown, leaderboard]);
  const selectedCatalogEntry = getBenchmarkDatasetCatalogEntry(selectedCatalogId);
  const currentScoringProfile = getBenchmarkScoringProfile(scoringProfileId);
  const modelOptions = leaderboard.length
    ? leaderboard.map((row) => ({ id: row.modelId, label: row.label }))
    : selectedTargets.map((target) => ({ id: target.id, label: getBenchmarkTargetLabel(target) }));
  const comparisonLeftModelId = leftCompareModelId || leaderboard[0]?.modelId || modelOptions[0]?.id || '';
  const comparisonRightModelId = rightCompareModelId || leaderboard[1]?.modelId || modelOptions[1]?.id || '';
  const significanceComparison =
    comparisonLeftModelId && comparisonRightModelId && comparisonLeftModelId !== comparisonRightModelId
      ? compareBenchmarkModels(results, comparisonLeftModelId, comparisonRightModelId)
      : null;
  const selectedExperiments = selectedExperimentIds
    .map((id) => experiments.find((experiment) => experiment.id === id))
    .filter((experiment): experiment is BenchmarkExperimentRecord => Boolean(experiment));
  const experimentComparisonRows =
    selectedExperiments.length >= 2
      ? selectedExperiments[0].leaderboard.map((leftRow) => {
          const rightRow = selectedExperiments[1].leaderboard.find((row) => row.modelId === leftRow.modelId);
          return {
            modelId: leftRow.modelId,
            label: leftRow.label,
            leftWer: leftRow.averageWer,
            rightWer: rightRow?.averageWer ?? null,
            leftCer: leftRow.averageCer,
            rightCer: rightRow?.averageCer ?? null,
            leftCost: leftRow.totalEstimatedCostUsd,
            rightCost: rightRow?.totalEstimatedCostUsd ?? null,
          };
        })
      : [];
  const projectedBudgetUsd = selectedSamples.reduce((total, sample) => {
    return total + selectedTargets.reduce((targetTotal, target) => targetTotal + (estimateBenchmarkCost(sample.durationSeconds, target.costPerMinuteUsd) ?? 0), 0);
  }, 0);
  const maxHeatmapCount = Math.max(1, ...errorHeatmap.map((item) => item.count));
  const runTotal = selectedSamples.length * selectedTargets.length;
  const completedRunCount = results.filter((result) => result.status === 'done').length;
  const failedRunCount = results.filter((result) => result.status === 'error').length;
  const runningDisabled = Boolean(disabled || isRunning || selectedSamples.length === 0 || selectedTargets.length === 0);

  useEffect(() => {
    if (!selectedResult || !selectedResultSample) {
      setReviewCorrectedReference('');
      setReviewErrorType('');
      setReviewNote('');
      return;
    }

    setReviewCorrectedReference(selectedResult.reviewAnnotation?.correctedReference ?? selectedResultSample.referenceText);
    setReviewErrorType(selectedResult.reviewAnnotation?.errorType ?? '');
    setReviewNote(selectedResult.reviewAnnotation?.note ?? '');
  }, [selectedResult, selectedResultSample]);

  const handleManifestFile = async (file: File) => {
    const content = await file.text();
    const parsed = parseBenchmarkManifest(content, file.name);
    setDatasetVersion(`${file.name}:${file.lastModified || Date.now()}`);
    setSamples(parsed.samples);
    setSelectedSampleIds(parsed.samples.map((sample) => sample.id));
    setManifestErrors(parsed.errors.map((error) => `第 ${error.row} 行：${error.message}`));
    setResults([]);
    setSelectedResultId(null);
    notify(
      parsed.samples.length > 0 ? `已导入 ${parsed.samples.length} 条题库样本。` : '题库导入完成，但没有可用样本。',
      parsed.samples.length > 0 ? 'success' : 'error',
    );
  };

  const handleManifestInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    void handleManifestFile(file).catch((error) => {
      console.error('Failed to import benchmark manifest:', error);
      notify(error instanceof Error ? error.message : '题库导入失败。', 'error');
    });
  };

  const handleAudioFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setAudioFiles(files);
    notify(files.length ? `已载入 ${files.length} 个本地音频文件。` : '未选择音频文件。', files.length ? 'success' : 'error');
  };

  const handleLoadCatalogTemplate = () => {
    const parsed = parseBenchmarkManifest(`${selectedCatalogEntry.manifestTemplate}\n`, `${selectedCatalogEntry.id}.jsonl`);
    setDatasetVersion(`${selectedCatalogEntry.id}:${selectedCatalogEntry.recommendedSubset}`);
    setSamples(parsed.samples);
    setSelectedSampleIds(parsed.samples.map((sample) => sample.id));
    setManifestErrors(parsed.errors.map((error) => `第 ${error.row} 行：${error.message}`));
    setResults([]);
    setSelectedResultId(null);
    notify(`已载入 ${selectedCatalogEntry.name} manifest 模板。`, 'success');
  };

  const createCurrentExperiment = (
    experimentResults = results,
    experimentSampleIds = selectedSampleIds,
    experimentModelIds = selectedModelIds,
  ) =>
    createBenchmarkExperimentRecord({
      name: `ASR Benchmark ${new Date().toLocaleString()}`,
      datasetVersion,
      samples,
      selectedSampleIds: experimentSampleIds,
      selectedModelIds: experimentModelIds,
      scoringProfileId,
      scoringOptions,
      runControls,
      perturbation,
      results: experimentResults,
      leaderboard: createBenchmarkLeaderboard(experimentResults, allTargets),
      breakdown: createBenchmarkBreakdown(experimentResults, samples),
    });

  const handleSaveExperiment = async (
    experimentResults = results,
    experimentSampleIds = selectedSampleIds,
    experimentModelIds = selectedModelIds,
  ) => {
    if (experimentResults.length === 0) {
      notify('没有可保存的 Benchmark 结果。', 'error');
      return null;
    }

    const experiment = createCurrentExperiment(experimentResults, experimentSampleIds, experimentModelIds);
    await addBenchmarkExperiment(experiment);
    await refreshExperiments();
    notify('Benchmark 实验已保存到 IndexedDB。', 'success');
    return experiment;
  };

  const toggleSample = (sampleId: string) => {
    if (isRunning) {
      return;
    }

    setSelectedSampleIds((currentIds) =>
      currentIds.includes(sampleId) ? currentIds.filter((id) => id !== sampleId) : [...currentIds, sampleId],
    );
  };

  const toggleTarget = (targetId: string) => {
    if (isRunning) {
      return;
    }

    setSelectedModelIds((currentIds) =>
      currentIds.includes(targetId) ? currentIds.filter((id) => id !== targetId) : [...currentIds, targetId],
    );
  };

  const waitWhilePaused = async (controller: AbortController) => {
    while (pauseRef.current && !controller.signal.aborted) {
      setActiveMessage('已暂停');
      await sleep(250);
    }
  };

  const handleRunBenchmark = async (
    matrixSamples = selectedSamples,
    matrixTargets = selectedTargets,
  ) => {
    if (disabled || isRunning || matrixSamples.length === 0 || matrixTargets.length === 0) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRunning(true);
    setIsPaused(false);
    pauseRef.current = false;
    setActiveMessage('');
    const jobs = matrixSamples.flatMap((sample) => matrixTargets.map((target) => ({ sample, target })));
    const experimentSampleIds = matrixSamples.map((sample) => sample.id);
    const experimentModelIds = matrixTargets.map((target) => target.id);
    const pendingResults: BenchmarkRunResult[] = jobs.map(({ sample, target }) => ({
      id: createBenchmarkResultId(sample.id, target.id),
      sampleId: sample.id,
      modelId: target.id,
      status: 'pending',
      message: '等待',
    }));
    let currentResults = pendingResults;
    let reservedBudgetUsd = 0;
    let nextJobIndex = 0;
    setResults(pendingResults);
    setSelectedResultId(pendingResults[0]?.id || null);

    const updateResult = (resultId: string, patch: Partial<BenchmarkRunResult> | BenchmarkRunResult) => {
      currentResults = currentResults.map((currentResult) =>
        currentResult.id === resultId ? { ...currentResult, ...patch } : currentResult,
      );
      setResults(currentResults);
    };

    const runJob = async (sample: BenchmarkSample, target: BenchmarkModelTarget) => {
      const resultId = createBenchmarkResultId(sample.id, target.id);
      const projectedCost = estimateBenchmarkCost(sample.durationSeconds, target.costPerMinuteUsd) ?? 0;
      if (runControls.budgetLimitUsd > 0 && reservedBudgetUsd + projectedCost > runControls.budgetLimitUsd) {
        updateResult(resultId, {
          status: 'cancelled',
          message: '预算上限跳过',
          errorMessage: `预计成本 ${formatBenchmarkCost(projectedCost)} 会超过预算 ${formatBenchmarkCost(runControls.budgetLimitUsd)}。`,
          finishedAt: Date.now(),
        });
        return;
      }
      reservedBudgetUsd += projectedCost;

      let finalResult: BenchmarkRunResult | null = null;
      for (let attempt = 0; attempt <= runControls.retryLimit; attempt += 1) {
        if (controller.signal.aborted) {
          updateResult(resultId, { status: 'cancelled', message: '已取消', finishedAt: Date.now() });
          return;
        }

        await waitWhilePaused(controller);
        if (runControls.rateLimitMs > 0 && attempt === 0) {
          setActiveMessage(`速率限制 ${runControls.rateLimitMs}ms`);
          await sleep(runControls.rateLimitMs);
        }

        setActiveRunId(resultId);
        setActiveMessage(attempt > 0 ? `重试 ${attempt}/${runControls.retryLimit}` : '准备运行');
        updateResult(resultId, {
          status: 'running',
          message: attempt > 0 ? `重试 ${attempt}/${runControls.retryLimit}` : '运行中',
          startedAt: Date.now(),
        });

        finalResult = await runBenchmarkTranscription({
          sample,
          target,
          baseConfig: asrConfig,
          language,
          context,
          enableItn,
          compressionLevel,
          trimSilence,
          enableLongAudioChunking,
          scoringOptions,
          perturbation,
          audioFiles: audioFileIndex,
          signal: controller.signal,
          onProgress: (message) => {
            setActiveMessage(message);
            updateResult(resultId, { message });
          },
        });

        updateResult(resultId, finalResult);
        setSelectedResultId((currentId) => currentId || resultId);
        if (finalResult.status !== 'error' || attempt >= runControls.retryLimit) {
          break;
        }
      }
    };

    try {
      const workerCount = Math.min(Math.max(1, Math.floor(runControls.concurrency)), Math.max(1, jobs.length));
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (!controller.signal.aborted) {
            const jobIndex = nextJobIndex;
            nextJobIndex += 1;
            const job = jobs[jobIndex];
            if (!job) {
              return;
            }

            await runJob(job.sample, job.target);
          }
        }),
      );

      if (controller.signal.aborted) {
        setResults((currentResults) =>
          currentResults.map((result) =>
            result.status === 'pending' ? { ...result, status: 'cancelled', message: '已取消' } : result,
          ),
        );
        return;
      }

      await handleSaveExperiment(currentResults, experimentSampleIds, experimentModelIds);
      if (regressionPlan && isBenchmarkRegressionDue(regressionPlan)) {
        const updatedPlan = markBenchmarkRegressionRun(regressionPlan);
        saveBenchmarkRegressionPlan(updatedPlan);
        setRegressionPlan(updatedPlan);
      }
      notify('Benchmark 运行完成。', 'success');
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setActiveRunId(null);
      setActiveMessage('');
      setIsRunning(false);
      setIsPaused(false);
      pauseRef.current = false;
    }
  };

  const handleCancelBenchmark = () => {
    abortControllerRef.current?.abort();
    setResults((currentResults) =>
      currentResults.map((result) =>
        result.status === 'pending' || result.status === 'running'
          ? { ...result, status: 'cancelled', message: '已取消' }
          : result,
      ),
    );
    notify('Benchmark 已取消。', 'success');
  };

  const handleTogglePause = () => {
    if (!isRunning) {
      return;
    }

    setIsPaused((currentValue) => {
      pauseRef.current = !currentValue;
      return !currentValue;
    });
  };

  const handleExportResults = () => {
    if (results.length === 0) {
      notify('没有可导出的 Benchmark 结果。', 'error');
      return;
    }

    downloadJson('asr-benchmark-results.json', {
      exportedAt: new Date().toISOString(),
      samples,
      selectedSampleIds,
      selectedModelIds,
      datasetVersion,
      scoringProfileId,
      scoringOptions,
      runControls,
      perturbation,
      results,
      leaderboard,
      breakdown,
      errorHeatmap,
      datasetIssues,
      radarMetrics,
      significanceComparison,
    });
  };

  const handleExportReport = (format: 'md' | 'html') => {
    if (results.length === 0) {
      notify('没有可导出的 Benchmark 报告。', 'error');
      return;
    }

    const experiment = createCurrentExperiment();
    const options = {
      radar: radarMetrics,
      comparisons: significanceComparison ? [significanceComparison] : [],
    };
    if (format === 'md') {
      downloadBenchmarkTextFile(
        'asr-benchmark-report.md',
        createBenchmarkMarkdownReport(experiment, options),
        'text/markdown;charset=utf-8',
      );
      return;
    }

    downloadBenchmarkTextFile(
      'asr-benchmark-report.html',
      createBenchmarkHtmlReport(experiment, options),
      'text/html;charset=utf-8',
    );
  };

  const handleClearResults = () => {
    if (!isRunning) {
      setResults([]);
      setSelectedResultId(null);
    }
  };

  const handleLoadExperiment = (experiment: BenchmarkExperimentRecord) => {
    if (isRunning) {
      return;
    }

    setDatasetVersion(experiment.datasetVersion);
    setSamples(experiment.samples);
    setSelectedSampleIds(experiment.selectedSampleIds);
    setSelectedModelIds(experiment.selectedModelIds);
    setScoringProfileId(experiment.scoringProfileId);
    setScoringOptions(experiment.scoringOptions);
    setRunControls(experiment.runControls);
    setPerturbation(experiment.perturbation);
    setResults(experiment.results);
    setSelectedResultId(experiment.results.find((result) => result.status === 'done')?.id || experiment.results[0]?.id || null);
    notify('已载入历史 Benchmark 实验。', 'success');
  };

  const handleDeleteExperiment = async (experimentId: number) => {
    await deleteBenchmarkExperiment(experimentId);
    await refreshExperiments();
    notify('已删除历史实验。', 'success');
  };

  const toggleExperimentSelection = (experimentId: number) => {
    setSelectedExperimentIds((currentIds) => {
      if (currentIds.includes(experimentId)) {
        return currentIds.filter((id) => id !== experimentId);
      }

      return [...currentIds.slice(-1), experimentId];
    });
  };

  const handleSaveReviewAnnotation = () => {
    if (!selectedResult) {
      return;
    }

    const reviewAnnotation = {
      resultId: selectedResult.id,
      correctedReference: reviewCorrectedReference.trim(),
      errorType: reviewErrorType,
      note: reviewNote.trim(),
      updatedAt: Date.now(),
    };
    setResults((currentResults) =>
      currentResults.map((result) =>
        result.id === selectedResult.id
          ? {
              ...result,
              reviewAnnotation,
            }
          : result,
      ),
    );
    notify('人工复核标注已写入当前结果。', 'success');
  };

  const handleCreateRegressionPlan = () => {
    const plan = createBenchmarkRegressionPlan({
      name: regressionName,
      sampleLimit: regressionSampleLimit,
      intervalHours: regressionIntervalHours,
    });
    saveBenchmarkRegressionPlan(plan);
    setRegressionPlan(plan);
    notify('定时回归计划已保存到本地。', 'success');
  };

  const handleClearRegressionPlan = () => {
    clearBenchmarkRegressionPlan();
    setRegressionPlan(null);
    notify('定时回归计划已清除。', 'success');
  };

  const handleRunRegressionSubset = () => {
    if (!regressionPlan || samples.length === 0 || isRunning) {
      return;
    }

    const regressionSamples = samples.slice(0, regressionPlan.sampleLimit);
    const regressionSampleIds = regressionSamples.map((sample) => sample.id);
    setSelectedSampleIds(regressionSampleIds);
    notify(`开始回归子集：${regressionSampleIds.length} 条样本。`, 'success');
    void handleRunBenchmark(regressionSamples, selectedTargets);
  };

  const matchedLocalCount = samples.filter(
    (sample) =>
      !sample.fileName ||
      audioFileIndex.has(sample.fileName.trim().toLowerCase()) ||
      audioFileIndex.has(sample.fileName.split('/').pop()?.trim().toLowerCase() || ''),
  ).length;

  return (
    <main className="custom-scrollbar min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden py-3">
      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[23rem_minmax(0,1fr)] xl:gap-4">
        <aside className="space-y-3 xl:sticky xl:top-0 xl:self-start">
          <section className="surface-panel overflow-hidden">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Benchmark</p>
                <h2 className="panel-title mt-1">题库输入</h2>
              </div>
              <DatabaseIcon className="h-5 w-5 text-content-200" />
            </div>
            <div className="space-y-3 p-4">
              <input
                ref={manifestInputRef}
                type="file"
                accept=".csv,.json,.jsonl,application/json,text/csv"
                className="hidden"
                onChange={handleManifestInputChange}
              />
              <button
                type="button"
                onClick={() => manifestInputRef.current?.click()}
                disabled={disabled || isRunning}
                className="secondary-action w-full"
              >
                <UploadIcon className="h-4 w-4" />
                <span>导入 CSV / JSONL</span>
              </button>

              <input
                ref={audioInputRef}
                type="file"
                multiple
                accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.webm,.aac"
                className="hidden"
                onChange={handleAudioFilesChange}
              />
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                disabled={disabled || isRunning}
                className="secondary-action w-full"
              >
                <SoundWaveIcon className="h-4 w-4" />
                <span>载入本地音频</span>
              </button>

              <label className="block">
                <span className="eyebrow">Dataset Version</span>
                <input
                  value={datasetVersion}
                  onChange={(event) => setDatasetVersion(event.target.value)}
                  disabled={disabled || isRunning}
                  className="field-control mt-1"
                />
              </label>

              <div className="surface-inset space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="eyebrow">Public Catalog</p>
                    <p className="truncate text-sm font-semibold text-content-100">{selectedCatalogEntry.name}</p>
                  </div>
                  <span className="status-pill shrink-0">{selectedCatalogEntry.recommendedSubset}</span>
                </div>
                <select
                  value={selectedCatalogId}
                  onChange={(event) => setSelectedCatalogId(event.target.value)}
                  disabled={disabled || isRunning}
                  className="field-control"
                >
                  {benchmarkDatasetCatalog.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-content-200">{selectedCatalogEntry.scenario} · {selectedCatalogEntry.license}</p>
                <p className="text-xs leading-5 text-content-200">{selectedCatalogEntry.notes}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={handleLoadCatalogTemplate} disabled={disabled || isRunning} className="secondary-action h-9 px-2 text-xs">
                    <RestoreIcon className="h-3.5 w-3.5" />
                    <span>载入</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(selectedCatalogEntry.manifestTemplate);
                      notify('manifest 模板已复制。', 'success');
                    }}
                    className="secondary-action h-9 px-2 text-xs"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    <span>复制</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadBenchmarkTextFile(`${selectedCatalogEntry.id}-manifest.jsonl`, `${selectedCatalogEntry.manifestTemplate}\n`, 'application/x-ndjson;charset=utf-8')
                    }
                    className="secondary-action h-9 px-2 text-xs"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    <span>模板</span>
                  </button>
                </div>
                <a className="block truncate text-xs text-brand-primary hover:underline" href={selectedCatalogEntry.downloadUrl} target="_blank" rel="noreferrer">
                  {selectedCatalogEntry.downloadUrl}
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="surface-inset px-3 py-2">
                  <p className="eyebrow">Samples</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-content-100">{samples.length}</p>
                </div>
                <div className="surface-inset px-3 py-2">
                  <p className="eyebrow">Audio</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-content-100">{audioFiles.length}</p>
                </div>
                <div className="surface-inset px-3 py-2">
                  <p className="eyebrow">Matched</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-content-100">{matchedLocalCount}</p>
                </div>
              </div>

              {manifestErrors.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  {manifestErrors.slice(0, 4).map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                  {manifestErrors.length > 4 && <p>还有 {manifestErrors.length - 4} 条解析提示。</p>}
                </div>
              )}
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Scoring</p>
                <h2 className="panel-title mt-1">评分设置</h2>
              </div>
              <ToolboxIcon className="h-5 w-5 text-content-200" />
            </div>
            <div className="space-y-3 p-4">
              <label className="block">
                <span className="eyebrow">Profile</span>
                <select
                  value={scoringProfileId}
                  onChange={(event) => setScoringProfileId(event.target.value as BenchmarkScoringProfileId)}
                  disabled={disabled || isRunning}
                  className="field-control mt-1"
                >
                  {benchmarkScoringProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="surface-inset p-3 text-xs leading-5 text-content-200">
                <p className="font-semibold text-content-100">{currentScoringProfile.primaryMetric.toUpperCase()}</p>
                <p>{currentScoringProfile.description}</p>
              </div>
              {[
                ['ignorePunctuation', '忽略标点'],
                ['normalizeCase', '大小写归一'],
                ['normalizeItn', 'ITN 归一'],
              ].map(([key, label]) => (
                <label key={key} className="surface-inset flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm font-medium text-content-100">{label}</span>
                  <input
                    type="checkbox"
                    checked={scoringOptions[key as keyof BenchmarkScoringOptions]}
                    disabled={disabled || isRunning}
                    onChange={(event) =>
                      setScoringOptions((currentOptions) => ({
                        ...currentOptions,
                        [key]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[var(--color-brand-primary)]"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Batch Control</p>
                <h2 className="panel-title mt-1">运行控制</h2>
              </div>
              <ToolboxIcon className="h-5 w-5 text-content-200" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <label className="block">
                <span className="eyebrow">并发</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={runControls.concurrency}
                  disabled={disabled || isRunning}
                  onChange={(event) =>
                    setRunControls((current) => ({ ...current, concurrency: Math.max(1, Number(event.target.value) || 1) }))
                  }
                  className="field-control mt-1"
                />
              </label>
              <label className="block">
                <span className="eyebrow">重试</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={runControls.retryLimit}
                  disabled={disabled || isRunning}
                  onChange={(event) =>
                    setRunControls((current) => ({ ...current, retryLimit: Math.max(0, Number(event.target.value) || 0) }))
                  }
                  className="field-control mt-1"
                />
              </label>
              <label className="block">
                <span className="eyebrow">速率 ms</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={runControls.rateLimitMs}
                  disabled={disabled || isRunning}
                  onChange={(event) =>
                    setRunControls((current) => ({ ...current, rateLimitMs: Math.max(0, Number(event.target.value) || 0) }))
                  }
                  className="field-control mt-1"
                />
              </label>
              <label className="block">
                <span className="eyebrow">预算 USD</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={runControls.budgetLimitUsd}
                  disabled={disabled || isRunning}
                  onChange={(event) =>
                    setRunControls((current) => ({ ...current, budgetLimitUsd: Math.max(0, Number(event.target.value) || 0) }))
                  }
                  className="field-control mt-1"
                />
              </label>
              <div className="surface-inset col-span-2 px-3 py-2">
                <p className="eyebrow">预计费用</p>
                <p className="mt-1 font-mono text-sm font-semibold text-content-100">{formatBenchmarkCost(projectedBudgetUsd)}</p>
              </div>
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Robustness</p>
                <h2 className="panel-title mt-1">扰动样本</h2>
              </div>
              <SoundWaveIcon className="h-5 w-5 text-content-200" />
            </div>
            <div className="space-y-3 p-4">
              <label className="surface-inset flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm font-medium text-content-100">启用扰动</span>
                <input
                  type="checkbox"
                  checked={perturbation.enabled}
                  disabled={disabled || isRunning}
                  onChange={(event) => setPerturbation((current) => ({ ...current, enabled: event.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-brand-primary)]"
                />
              </label>
              <label className="block">
                <span className="eyebrow">模式</span>
                <select
                  value={perturbation.mode}
                  disabled={disabled || isRunning || !perturbation.enabled}
                  onChange={(event) => setPerturbation((current) => ({ ...current, mode: event.target.value as BenchmarkPerturbationMode }))}
                  className="field-control mt-1"
                >
                  {Object.entries(perturbationModeLabels).map(([mode, label]) => (
                    <option key={mode} value={mode}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="eyebrow">强度 {Math.round(perturbation.intensity * 100)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={perturbation.intensity}
                  disabled={disabled || isRunning || !perturbation.enabled}
                  onChange={(event) => setPerturbation((current) => ({ ...current, intensity: Number(event.target.value) }))}
                  className="w-full accent-[var(--color-brand-primary)]"
                />
              </label>
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Regression</p>
                <h2 className="panel-title mt-1">定时回归</h2>
              </div>
              <RestoreIcon className="h-5 w-5 text-content-200" />
            </div>
            <div className="space-y-3 p-4">
              <div className="surface-inset px-3 py-2 text-xs leading-5 text-content-200">
                {regressionPlan ? (
                  <>
                    <p className="font-semibold text-content-100">{regressionPlan.name}</p>
                    <p>每 {regressionPlan.intervalHours} 小时 · {regressionPlan.sampleLimit} 条样本 · 下次 {formatDateTime(regressionPlan.nextRunAt)}</p>
                    <p className={isBenchmarkRegressionDue(regressionPlan) ? 'font-semibold text-amber-600 dark:text-amber-300' : ''}>
                      {isBenchmarkRegressionDue(regressionPlan) ? '已到期，可选择回归子集后运行。' : '计划未到期。'}
                    </p>
                  </>
                ) : (
                  <p>本地计划保存在 localStorage，用来固定小样本集做周期性质量回归。</p>
                )}
              </div>
              <input
                value={regressionName}
                onChange={(event) => setRegressionName(event.target.value)}
                disabled={disabled || isRunning}
                className="field-control"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="eyebrow">样本数</span>
                  <input
                    type="number"
                    min="1"
                    value={regressionSampleLimit}
                    disabled={disabled || isRunning}
                    onChange={(event) => setRegressionSampleLimit(Math.max(1, Number(event.target.value) || 1))}
                    className="field-control mt-1"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">间隔小时</span>
                  <input
                    type="number"
                    min="1"
                    value={regressionIntervalHours}
                    disabled={disabled || isRunning}
                    onChange={(event) => setRegressionIntervalHours(Math.max(1, Number(event.target.value) || 1))}
                    className="field-control mt-1"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={handleCreateRegressionPlan} disabled={disabled || isRunning} className="secondary-action h-9 px-2 text-xs">
                  <SaveIcon className="h-3.5 w-3.5" />
                  <span>保存</span>
                </button>
                <button type="button" onClick={handleRunRegressionSubset} disabled={!regressionPlan || samples.length === 0 || isRunning} className="secondary-action h-9 px-2 text-xs">
                  <CheckIcon className="h-3.5 w-3.5" />
                  <span>子集</span>
                </button>
                <button type="button" onClick={handleClearRegressionPlan} disabled={!regressionPlan || isRunning} className="secondary-action h-9 px-2 text-xs">
                  <DeleteIcon className="h-3.5 w-3.5" />
                  <span>清除</span>
                </button>
              </div>
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Experiments</p>
                <h2 className="panel-title mt-1">历史与对比</h2>
              </div>
              <DatabaseIcon className="h-5 w-5 text-content-200" />
            </div>
            <div className="space-y-2 p-4">
              {experiments.length === 0 ? (
                <EmptyState icon={<DatabaseIcon className="h-5 w-5" />} title="暂无历史实验" description="每次 Benchmark 完成后会自动保存。" />
              ) : (
                experiments.slice(0, 8).map((experiment) => {
                  const selectedForCompare = selectedExperimentIds.includes(experiment.id);
                  return (
                    <div key={experiment.id} className="surface-inset space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => handleLoadExperiment(experiment)} disabled={isRunning} className="min-w-0 text-left">
                          <span className="block truncate text-sm font-semibold text-content-100">{experiment.name}</span>
                          <span className="block truncate text-xs text-content-200">{experiment.datasetVersion}</span>
                          <span className="block text-xs text-content-200">{formatDateTime(experiment.createdAt)} · {experiment.results.length} runs</span>
                        </button>
                        <button type="button" onClick={() => handleDeleteExperiment(experiment.id)} disabled={isRunning} className="secondary-action h-8 px-2 text-xs">
                          <DeleteIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-content-200">
                        <input
                          type="checkbox"
                          checked={selectedForCompare}
                          onChange={() => toggleExperimentSelection(experiment.id)}
                          className="h-4 w-4 accent-[var(--color-brand-primary)]"
                        />
                        <span>加入两次实验对比</span>
                      </label>
                    </div>
                  );
                })
              )}
              {experimentComparisonRows.length > 0 && (
                <div className="surface-inset p-3">
                  <p className="eyebrow">Experiment Delta</p>
                  <div className="mt-2 space-y-1">
                    {experimentComparisonRows.slice(0, 5).map((row) => (
                      <div key={row.modelId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                        <span className="truncate text-content-100">{row.label}</span>
                        <span className="font-mono text-content-200">
                          ΔWER {typeof row.leftWer === 'number' && typeof row.rightWer === 'number' ? formatBenchmarkPercent(row.rightWer - row.leftWer) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-3 xl:space-y-4">
          <div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-6">
            <div className="surface-panel min-w-0 px-3 py-2">
              <p className="eyebrow">Selected</p>
              <p className="mt-1 font-mono text-sm font-semibold text-content-100">{selectedSamples.length}</p>
            </div>
            <div className="surface-panel min-w-0 px-3 py-2">
              <p className="eyebrow">Models</p>
              <p className="mt-1 font-mono text-sm font-semibold text-content-100">{selectedTargets.length}</p>
            </div>
            <div className="surface-panel min-w-0 px-3 py-2">
              <p className="eyebrow">Matrix</p>
              <p className="mt-1 font-mono text-sm font-semibold text-content-100">{runTotal}</p>
            </div>
            <div className="surface-panel min-w-0 px-3 py-2">
              <p className="eyebrow">Done</p>
              <p className="mt-1 font-mono text-sm font-semibold text-content-100">{completedRunCount}</p>
            </div>
            <div className="surface-panel min-w-0 px-3 py-2">
              <p className="eyebrow">Failed</p>
              <p className="mt-1 font-mono text-sm font-semibold text-content-100">{failedRunCount}</p>
            </div>
            <div className="surface-panel min-w-0 px-3 py-2">
              <p className="eyebrow">Budget</p>
              <p className="mt-1 font-mono text-sm font-semibold text-content-100">{formatBenchmarkCost(projectedBudgetUsd)}</p>
            </div>
          </div>

          <section className="surface-panel overflow-hidden">
            <div className="panel-header flex-col items-stretch gap-2 md:flex-row md:items-center">
              <div className="min-w-0">
                <p className="eyebrow">Run Matrix</p>
                <h2 className="panel-title mt-1">样本 × 模型</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isRunning && activeRunId && (
                  <span className="status-pill max-w-[18rem] truncate font-mono" title={activeMessage || activeRunId}>
                    {activeMessage || activeRunId}
                  </span>
                )}
                <button
                  type="button"
                  onClick={isRunning ? handleCancelBenchmark : () => {
                    void handleRunBenchmark();
                  }}
                  disabled={isRunning ? false : runningDisabled}
                  className={isRunning ? 'secondary-action text-red-500' : 'primary-action min-h-10 px-4'}
                >
                  {isRunning ? <StopIcon className="h-4 w-4" /> : <SoundWaveIcon className="h-4 w-4" />}
                  <span>{isRunning ? '取消' : '运行 Benchmark'}</span>
                </button>
                {isRunning && (
                  <button type="button" onClick={handleTogglePause} className="secondary-action">
                    {isPaused ? <RestoreIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                    <span>{isPaused ? '恢复' : '暂停'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveExperiment();
                  }}
                  disabled={results.length === 0 || isRunning}
                  className="secondary-action"
                >
                  <SaveIcon className="h-4 w-4" />
                  <span>保存</span>
                </button>
                <button type="button" onClick={handleExportResults} disabled={results.length === 0} className="secondary-action">
                  <DownloadIcon className="h-4 w-4" />
                  <span>JSON</span>
                </button>
                <button type="button" onClick={() => handleExportReport('md')} disabled={results.length === 0} className="secondary-action">
                  <DownloadIcon className="h-4 w-4" />
                  <span>MD</span>
                </button>
                <button type="button" onClick={() => handleExportReport('html')} disabled={results.length === 0} className="secondary-action">
                  <DownloadIcon className="h-4 w-4" />
                  <span>HTML</span>
                </button>
                <button type="button" onClick={handleClearResults} disabled={isRunning || results.length === 0} className="secondary-action">
                  <DeleteIcon className="h-4 w-4" />
                  <span>清空</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
              <div className="min-w-0">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={sampleQuery}
                    onChange={(event) => setSampleQuery(event.target.value)}
                    placeholder="搜索样本、语言、domain、tags..."
                    className="field-control min-w-0"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSampleIds(filteredSamples.map((sample) => sample.id))}
                      disabled={isRunning || filteredSamples.length === 0}
                      className="secondary-action"
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSampleIds([])}
                      disabled={isRunning || selectedSampleIds.length === 0}
                      className="secondary-action"
                    >
                      清除
                    </button>
                  </div>
                </div>
                <div className="custom-scrollbar h-80 space-y-1 overflow-y-auto pr-1">
                  {samples.length === 0 ? (
                    <EmptyState icon={<DatabaseIcon className="h-5 w-5" />} title="等待题库" description="导入 CSV 或 JSONL 后可选择样本。" />
                  ) : filteredSamples.length === 0 ? (
                    <EmptyState icon={<SearchIcon className="h-5 w-5" />} title="没有匹配样本" />
                  ) : (
                    filteredSamples.map((sample) => {
                      const isSelected = selectedSampleIds.includes(sample.id);
                      return (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => toggleSample(sample.id)}
                          disabled={isRunning}
                          className={`grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                            isSelected ? 'bg-brand-primary/10 ring-1 ring-brand-primary/30' : 'hover:bg-base-100'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-brand-primary bg-brand-primary text-[var(--theme-text-accent)]' : 'border-base-300'}`}>
                            {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-content-100">{sample.id}</span>
                            <span className="block truncate text-xs text-content-200">{sample.fileName || sample.audioUrl}</span>
                            <span className="block truncate text-xs text-content-200">{joinSampleMeta(sample) || '未标注'}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-content-100">模型候选</p>
                  <button
                    type="button"
                    onClick={() => setSelectedModelIds([])}
                    disabled={isRunning || selectedModelIds.length === 0}
                    className="secondary-action h-9 px-3 text-xs"
                  >
                    清除
                  </button>
                </div>
                <div className="custom-scrollbar h-80 space-y-1 overflow-y-auto pr-1">
                  {allTargets.map((target) => {
                    const isSelected = selectedModelIds.includes(target.id);
                    return (
                      <div
                        key={target.id}
                        className={`grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_6rem] items-start gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                          isSelected ? 'bg-brand-primary/10 ring-1 ring-brand-primary/30' : 'hover:bg-base-100'
                        } ${isRunning ? 'opacity-60' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTarget(target.id)}
                          disabled={isRunning}
                          aria-label={`${isSelected ? '取消选择' : '选择'} ${target.label}`}
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border disabled:cursor-not-allowed ${
                            isSelected
                              ? 'border-brand-primary bg-brand-primary text-[var(--theme-text-accent)]'
                              : 'border-base-300'
                          }`}
                        >
                          {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleTarget(target.id)}
                          disabled={isRunning}
                          className="min-w-0 text-left disabled:cursor-not-allowed"
                        >
                          <span className="block truncate text-sm font-semibold text-content-100">{target.label}</span>
                          <span className="block truncate font-mono text-xs text-content-200">{target.modelLabel}</span>
                          <span className="block truncate text-xs text-content-200">
                            {target.costPerMinuteUsd > 0
                              ? `${formatBenchmarkCost(target.costPerMinuteUsd)}/min`
                              : '成本按 0 计'}
                          </span>
                        </button>
                        <label className="block min-w-0">
                          <span className="eyebrow">USD/min</span>
                          <input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={costOverrides[target.id] ?? ''}
                            disabled={isRunning}
                            onChange={(event) => {
                              setCostOverrides((currentOverrides) => ({
                                ...currentOverrides,
                                [target.id]: event.target.value,
                              }));
                            }}
                            className="field-control mt-1 h-8 px-2 py-1 text-xs"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-panel overflow-hidden">
            <div className="panel-header">
              <div className="min-w-0">
                <p className="eyebrow">Leaderboard</p>
                <h2 className="panel-title mt-1">模型排行榜</h2>
              </div>
            </div>
            <div className="custom-scrollbar overflow-x-auto p-3">
              {leaderboard.length === 0 ? (
                <EmptyState icon={<InfoIcon className="h-5 w-5" />} title="暂无排行榜" description="运行 Benchmark 后会按模型聚合 WER、CER、延迟、RTF、失败率和成本。" />
              ) : (
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead className="text-content-200">
                    <tr className="border-b border-base-300">
                      <th className="px-2 py-2 font-semibold">模型</th>
                      <th className="px-2 py-2 font-semibold">完成</th>
                      <th className="px-2 py-2 font-semibold">WER</th>
                      <th className="px-2 py-2 font-semibold">CER</th>
                      <th className="px-2 py-2 font-semibold">P50</th>
                      <th className="px-2 py-2 font-semibold">P95</th>
                      <th className="px-2 py-2 font-semibold">RTF</th>
                      <th className="px-2 py-2 font-semibold">失败</th>
                      <th className="px-2 py-2 font-semibold">成本</th>
                      <th className="px-2 py-2 font-semibold">关键词</th>
                      <th className="px-2 py-2 font-semibold">人名</th>
                      <th className="px-2 py-2 font-semibold">术语</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr key={row.modelId} className="border-b border-base-300/60 text-content-100">
                        <td className="max-w-[18rem] truncate px-2 py-2 font-semibold" title={row.label}>{row.label}</td>
                        <td className="px-2 py-2 font-mono">{row.completedCount}/{row.totalCount}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageWer)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageCer)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkMs(row.p50LatencyMs)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkMs(row.p95LatencyMs)}</td>
                        <td className="px-2 py-2 font-mono">{formatNumber(row.p50Rtf, 2)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.failureRate)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkCost(row.totalEstimatedCostUsd)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageKeywordRecall)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageNameAccuracy)}</td>
                        <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageTermAccuracy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-4">
            <div className="surface-panel min-w-0 overflow-hidden">
              <div className="panel-header">
                <div className="min-w-0">
                  <p className="eyebrow">Dataset Quality</p>
                  <h2 className="panel-title mt-1">数据集检查</h2>
                </div>
              </div>
              <div className="custom-scrollbar h-64 space-y-2 overflow-y-auto p-3 text-xs">
                {datasetIssues.length === 0 ? (
                  <EmptyState icon={<CheckIcon className="h-5 w-5" />} title="未发现问题" />
                ) : (
                  datasetIssues.slice(0, 12).map((issue, index) => (
                    <div key={`${issue.sampleId || 'dataset'}-${index}`} className="surface-inset p-2">
                      <span className={`font-semibold ${issue.severity === 'error' ? 'text-red-500' : issue.severity === 'warning' ? 'text-amber-600 dark:text-amber-300' : 'text-content-200'}`}>
                        {issue.severity}
                      </span>
                      <p className="mt-1 text-content-100">{issue.sampleId ? `${issue.sampleId}: ` : ''}{issue.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="surface-panel min-w-0 overflow-hidden">
              <div className="panel-header">
                <div className="min-w-0">
                  <p className="eyebrow">Error Heatmap</p>
                  <h2 className="panel-title mt-1">错误热力图</h2>
                </div>
              </div>
              <div className="custom-scrollbar h-64 space-y-2 overflow-y-auto p-3 text-xs">
                {errorHeatmap.length === 0 ? (
                  <EmptyState icon={<InfoIcon className="h-5 w-5" />} title="暂无错误聚合" />
                ) : (
                  errorHeatmap.map((item) => (
                    <div key={item.bucket} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-content-100">{item.label}</span>
                        <span className="font-mono text-content-200">{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-base-300">
                        <div className="h-full rounded bg-brand-primary" style={{ width: `${Math.max(6, (item.count / maxHeatmapCount) * 100)}%` }} />
                      </div>
                      <p className="truncate text-content-200">{item.examples.join(' · ') || '-'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="surface-panel min-w-0 overflow-hidden">
              <div className="panel-header">
                <div className="min-w-0">
                  <p className="eyebrow">Significance</p>
                  <h2 className="panel-title mt-1">显著性比较</h2>
                </div>
              </div>
              <div className="space-y-2 p-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select value={comparisonLeftModelId} onChange={(event) => setLeftCompareModelId(event.target.value)} className="field-control text-xs">
                    {modelOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select value={comparisonRightModelId} onChange={(event) => setRightCompareModelId(event.target.value)} className="field-control text-xs">
                    {modelOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {!significanceComparison ? (
                  <EmptyState icon={<InfoIcon className="h-5 w-5" />} title="需要两组模型结果" />
                ) : (
                  <div className="surface-inset space-y-2 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="eyebrow">Paired</p>
                        <p className="font-mono text-content-100">{significanceComparison.pairedCount}</p>
                      </div>
                      <div>
                        <p className="eyebrow">ΔWER</p>
                        <p className="font-mono text-content-100">{formatBenchmarkPercent(significanceComparison.meanWerDelta)}</p>
                      </div>
                    </div>
                    <p className="font-mono text-content-200">
                      95% CI [{formatBenchmarkPercent(significanceComparison.confidenceLow)}, {formatBenchmarkPercent(significanceComparison.confidenceHigh)}]
                    </p>
                    <p className={significanceComparison.likelySignificant ? 'font-semibold text-green-600 dark:text-green-300' : 'text-content-200'}>
                      {significanceComparison.likelySignificant ? '差异可能显著' : '差异未达显著'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="surface-panel min-w-0 overflow-hidden">
              <div className="panel-header">
                <div className="min-w-0">
                  <p className="eyebrow">Capability Radar</p>
                  <h2 className="panel-title mt-1">能力雷达</h2>
                </div>
              </div>
              <div className="custom-scrollbar h-64 space-y-2 overflow-y-auto p-3 text-xs">
                {radarMetrics.length === 0 ? (
                  <EmptyState icon={<InfoIcon className="h-5 w-5" />} title="暂无雷达指标" />
                ) : (
                  radarMetrics.map((metric) => (
                    <div key={metric.axis} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-content-100">{metric.axis}</span>
                        <span className="font-mono text-content-200">{formatBenchmarkPercent(metric.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-base-300">
                        <div className="h-full rounded bg-brand-primary" style={{ width: `${Math.max(4, metric.value * 100)}%` }} />
                      </div>
                      <p className="text-content-200">{metric.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="surface-panel min-w-0 overflow-hidden">
              <div className="panel-header">
                <div className="min-w-0">
                  <p className="eyebrow">Breakdown</p>
                  <h2 className="panel-title mt-1">题库维度</h2>
                </div>
              </div>
              <div className="custom-scrollbar h-96 overflow-auto p-3">
                {breakdown.length === 0 ? (
                  <EmptyState icon={<DatabaseIcon className="h-5 w-5" />} title="暂无维度分析" />
                ) : (
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="text-content-200">
                      <tr className="border-b border-base-300">
                        <th className="px-2 py-2 font-semibold">维度</th>
                        <th className="px-2 py-2 font-semibold">值</th>
                        <th className="px-2 py-2 font-semibold">完成</th>
                        <th className="px-2 py-2 font-semibold">WER</th>
                        <th className="px-2 py-2 font-semibold">CER</th>
                        <th className="px-2 py-2 font-semibold">术语</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.slice(0, 80).map((row) => (
                        <tr key={`${row.dimension}-${row.value}`} className="border-b border-base-300/60 text-content-100">
                          <td className="px-2 py-2 font-mono">{row.dimension}</td>
                          <td className="max-w-[10rem] truncate px-2 py-2" title={row.value}>{row.value}</td>
                          <td className="px-2 py-2 font-mono">{row.completedCount}/{row.totalCount}</td>
                          <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageWer)}</td>
                          <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageCer)}</td>
                          <td className="px-2 py-2 font-mono">{formatBenchmarkPercent(row.averageTermAccuracy)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="surface-panel min-w-0 overflow-hidden">
              <div className="panel-header">
                <div className="min-w-0">
                  <p className="eyebrow">Errors</p>
                  <h2 className="panel-title mt-1">逐条错误分析</h2>
                </div>
              </div>
              <div className="grid h-96 min-h-0 grid-rows-[10rem_minmax(0,1fr)]">
                <div className="custom-scrollbar overflow-y-auto border-b border-base-300 p-2">
                  {results.length === 0 ? (
                    <EmptyState icon={<InfoIcon className="h-5 w-5" />} title="暂无运行结果" />
                  ) : (
                    results.map((result) => {
                      const target = allTargets.find((item) => item.id === result.modelId);
                      const sample = samples.find((item) => item.id === result.sampleId);
                      const isSelected = selectedResult?.id === result.id;
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => setSelectedResultId(result.id)}
                          className={`mb-1 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md px-2 py-2 text-left ${
                            isSelected ? 'bg-brand-primary/10 ring-1 ring-brand-primary/30' : 'hover:bg-base-100'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-content-100">{sample?.id || result.sampleId}</span>
                            <span className="block truncate text-xs text-content-200">{target ? getBenchmarkTargetLabel(target) : result.modelId}</span>
                          </span>
                          <span className={`text-xs font-semibold ${getRunStatusClassName(result.status)}`}>
                            {result.status === 'running' ? <LoaderIcon className="inline h-3.5 w-3.5" /> : getRunStatusLabel(result.status)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="custom-scrollbar min-h-0 overflow-y-auto p-3">
                  {!selectedResult || !selectedResultSample ? (
                    <EmptyState icon={<InfoIcon className="h-5 w-5" />} title="选择一条结果" />
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                        <div className="surface-inset px-2 py-2">
                          <p className="eyebrow">WER</p>
                          <p className="mt-1 font-mono font-semibold text-content-100">{formatBenchmarkPercent(selectedResult.score?.wer)}</p>
                        </div>
                        <div className="surface-inset px-2 py-2">
                          <p className="eyebrow">CER</p>
                          <p className="mt-1 font-mono font-semibold text-content-100">{formatBenchmarkPercent(selectedResult.score?.cer)}</p>
                        </div>
                        <div className="surface-inset px-2 py-2">
                          <p className="eyebrow">S/D/I</p>
                          <p className="mt-1 font-mono font-semibold text-content-100">
                            {selectedResult.score ? `${selectedResult.score.wordSubstitutions}/${selectedResult.score.wordDeletions}/${selectedResult.score.wordInsertions}` : '-'}
                          </p>
                        </div>
                        <div className="surface-inset px-2 py-2">
                          <p className="eyebrow">RTF</p>
                          <p className="mt-1 font-mono font-semibold text-content-100">{formatNumber(selectedResult.rtf, 2)}</p>
                        </div>
                        <div className="surface-inset px-2 py-2">
                          <p className="eyebrow">Keywords</p>
                          <p className="mt-1 font-mono font-semibold text-content-100">
                            {formatBenchmarkPercent(selectedResult.score?.keywordRecall.recall)}
                          </p>
                        </div>
                        <div className="surface-inset px-2 py-2">
                          <p className="eyebrow">Names</p>
                          <p className="mt-1 font-mono font-semibold text-content-100">
                            {formatBenchmarkPercent(selectedResult.score?.nameAccuracy.recall)}
                          </p>
                        </div>
                        <div className="surface-inset px-2 py-2">
                          <p className="eyebrow">Terms</p>
                          <p className="mt-1 font-mono font-semibold text-content-100">
                            {formatBenchmarkPercent(selectedResult.score?.termAccuracy.recall)}
                          </p>
                        </div>
                      </div>
                      {selectedResult.errorMessage && (
                        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-600 dark:text-red-300">
                          {selectedResult.errorMessage}
                        </div>
                      )}
                      <div className="grid gap-2 xl:grid-cols-3">
                        <div className="rounded-md border border-base-300 bg-base-100 p-3">
                          <p className="eyebrow">Streaming Diagnostics</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <span className="text-content-200">首字延迟</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkMs(selectedResult.streamingMetrics?.firstTokenLatencyMs)}</span>
                            <span className="text-content-200">最终确认</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkMs(selectedResult.streamingMetrics?.finalLatencyMs)}</span>
                            <span className="text-content-200">partial 稳定</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkPercent(selectedResult.streamingMetrics?.partialStability)}</span>
                            <span className="text-content-200">endpointing</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkMs(selectedResult.streamingMetrics?.endpointingLatencyMs)}</span>
                            <span className="text-content-200">打断恢复</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkMs(selectedResult.streamingMetrics?.interruptionRecoveryMs)}</span>
                            <span className="text-content-200">静音误触发</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkPercent(selectedResult.streamingMetrics?.longSilenceFalseTriggerRate)}</span>
                            <span className="text-content-200">空音频幻觉</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkPercent(selectedResult.streamingMetrics?.emptyAudioHallucinationRate)}</span>
                          </div>
                        </div>
                        <div className="rounded-md border border-base-300 bg-base-100 p-3">
                          <p className="eyebrow">Timestamp Quality</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <span className="text-content-200">Segment MAE</span>
                            <span className="text-right font-mono text-content-100">{formatNumber(selectedResult.timestampMetrics?.segmentBoundaryMaeSeconds, 2)}s</span>
                            <span className="text-content-200">Word MAE</span>
                            <span className="text-right font-mono text-content-100">{formatNumber(selectedResult.timestampMetrics?.wordTimestampMaeSeconds, 2)}s</span>
                            <span className="text-content-200">字幕重叠</span>
                            <span className="text-right font-mono text-content-100">{selectedResult.timestampMetrics?.subtitleOverlapCount ?? '-'}</span>
                            <span className="text-content-200">字幕空洞</span>
                            <span className="text-right font-mono text-content-100">{selectedResult.timestampMetrics?.subtitleGapCount ?? '-'}</span>
                            <span className="text-content-200">行切分质量</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkPercent(selectedResult.timestampMetrics?.subtitleLineQuality)}</span>
                          </div>
                        </div>
                        <div className="rounded-md border border-base-300 bg-base-100 p-3">
                          <p className="eyebrow">Diarization</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <span className="text-content-200">DER</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkPercent(selectedResult.diarizationMetrics?.der)}</span>
                            <span className="text-content-200">JER</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkPercent(selectedResult.diarizationMetrics?.jer)}</span>
                            <span className="text-content-200">Turn MAE</span>
                            <span className="text-right font-mono text-content-100">{formatNumber(selectedResult.diarizationMetrics?.speakerTurnBoundaryMaeSeconds, 2)}s</span>
                            <span className="text-content-200">Label 一致</span>
                            <span className="text-right font-mono text-content-100">{formatBenchmarkPercent(selectedResult.diarizationMetrics?.speakerLabelConsistency)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="eyebrow">Reference</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-md bg-base-100 p-3 text-content-100">{selectedResultSample.referenceText}</p>
                      </div>
                      <div>
                        <p className="eyebrow">Hypothesis</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-md bg-base-100 p-3 text-content-100">{selectedResult.hypothesis || '-'}</p>
                      </div>
                      <div>
                        <p className="eyebrow">Word Diff</p>
                        <div className="mt-1 flex flex-wrap gap-1 rounded-md bg-base-100 p-3 text-xs leading-6">
                          {selectedResult.score ? renderAlignment(selectedResult.score.wordAlignment) : '-'}
                        </div>
                      </div>
                      <div className="rounded-md border border-base-300 bg-base-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="eyebrow">Human Review</p>
                          {selectedResult.reviewAnnotation?.updatedAt && (
                            <span className="text-xs text-content-200">{formatDateTime(selectedResult.reviewAnnotation.updatedAt)}</span>
                          )}
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem]">
                          <label className="block">
                            <span className="eyebrow">修正 reference</span>
                            <textarea
                              value={reviewCorrectedReference}
                              onChange={(event) => setReviewCorrectedReference(event.target.value)}
                              className="field-control mt-1 min-h-24"
                            />
                          </label>
                          <div className="space-y-2">
                            <label className="block">
                              <span className="eyebrow">错误类型</span>
                              <select
                                value={reviewErrorType}
                                onChange={(event) => setReviewErrorType(event.target.value)}
                                className="field-control mt-1"
                              >
                                <option value="">未标注</option>
                                {reviewErrorTypes.map((errorType) => (
                                  <option key={errorType} value={errorType}>
                                    {errorType}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="eyebrow">备注</span>
                              <textarea
                                value={reviewNote}
                                onChange={(event) => setReviewNote(event.target.value)}
                                className="field-control mt-1 min-h-20"
                              />
                            </label>
                            <button type="button" onClick={handleSaveReviewAnnotation} className="secondary-action w-full">
                              <SaveIcon className="h-4 w-4" />
                              <span>保存标注</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <details className="rounded-md border border-base-300 bg-base-100 p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-content-100">可复现实验快照</summary>
                        <pre className="custom-scrollbar mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-content-200">
                          {JSON.stringify(
                            {
                              cacheKey: selectedResult.cacheKey,
                              audioChecksum: selectedResult.audioChecksum,
                              audioSource: selectedResult.audioSource,
                              latencyMs: selectedResult.latencyMs,
                              estimatedCostUsd: selectedResult.estimatedCostUsd,
                              modelSnapshot: selectedResult.modelSnapshot,
                              providerConfigSnapshot: selectedResult.providerConfigSnapshot,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
};
