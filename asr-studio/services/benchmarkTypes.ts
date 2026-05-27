import type {
  AsrProvider,
  AsrProviderConfig,
  CompressionLevel,
  Language,
  MainstreamAsrModel,
  TranscriptionSegment,
} from '../types';

export type BenchmarkWorkspace = 'studio' | 'benchmark';

export type BenchmarkSample = {
  id: string;
  audioUrl?: string;
  fileName?: string;
  referenceText: string;
  language?: string;
  domain?: string;
  durationSeconds?: number;
  speaker?: string;
  noise?: string;
  accent?: string;
  tags: string[];
  keywords: string[];
  names: string[];
  terms: string[];
  referenceSegments?: TranscriptionSegment[];
  speakerTurns?: BenchmarkSpeakerTurn[];
};

export type BenchmarkSpeakerTurn = {
  speaker: string;
  startTime: number;
  endTime: number;
};

export type BenchmarkManifestParseError = {
  row: number;
  message: string;
};

export type BenchmarkManifestParseResult = {
  samples: BenchmarkSample[];
  errors: BenchmarkManifestParseError[];
};

export type BenchmarkScoringOptions = {
  ignorePunctuation: boolean;
  normalizeCase: boolean;
  normalizeItn: boolean;
};

export type BenchmarkScoringProfileId =
  | 'open-asr'
  | 'zh-cer'
  | 'punctuation-sensitive'
  | 'itn-sensitive'
  | 'keyword-terms';

export type BenchmarkScoringProfile = {
  id: BenchmarkScoringProfileId;
  label: string;
  description: string;
  primaryMetric: 'wer' | 'cer' | 'keywordRecall' | 'termAccuracy';
  options: BenchmarkScoringOptions;
};

export type BenchmarkAlignmentOperation = 'equal' | 'substitute' | 'insert' | 'delete';

export type BenchmarkAlignmentToken = {
  operation: BenchmarkAlignmentOperation;
  reference?: string;
  hypothesis?: string;
};

export type BenchmarkTermMetric = {
  total: number;
  matched: number;
  recall: number | null;
};

export type BenchmarkScore = {
  wer: number | null;
  cer: number | null;
  wordHits: number;
  wordSubstitutions: number;
  wordDeletions: number;
  wordInsertions: number;
  referenceWordCount: number;
  characterHits: number;
  characterSubstitutions: number;
  characterDeletions: number;
  characterInsertions: number;
  referenceCharacterCount: number;
  wordAlignment: BenchmarkAlignmentToken[];
  characterAlignment: BenchmarkAlignmentToken[];
  keywordRecall: BenchmarkTermMetric;
  nameAccuracy: BenchmarkTermMetric;
  termAccuracy: BenchmarkTermMetric;
};

export type BenchmarkTimestampMetrics = {
  segmentBoundaryMaeSeconds: number | null;
  wordTimestampMaeSeconds: number | null;
  subtitleOverlapCount: number;
  subtitleGapCount: number;
  subtitleLineQuality: number | null;
};

export type BenchmarkDiarizationMetrics = {
  der: number | null;
  jer: number | null;
  speakerTurnBoundaryMaeSeconds: number | null;
  speakerLabelConsistency: number | null;
};

export type BenchmarkStreamingMetrics = {
  firstTokenLatencyMs: number | null;
  finalLatencyMs: number | null;
  partialStability: number | null;
  endpointingLatencyMs: number | null;
  interruptionRecoveryMs: number | null;
  longSilenceFalseTriggerRate: number | null;
  emptyAudioHallucinationRate: number | null;
};

export type BenchmarkErrorHeatmapItem = {
  bucket: string;
  label: string;
  count: number;
  examples: string[];
};

export type BenchmarkSignificanceComparison = {
  leftModelId: string;
  rightModelId: string;
  pairedCount: number;
  meanWerDelta: number | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  likelySignificant: boolean;
};

export type BenchmarkRadarMetric = {
  axis: string;
  value: number;
  detail: string;
};

export type BenchmarkReviewAnnotation = {
  resultId: string;
  correctedReference?: string;
  errorType?: string;
  note?: string;
  updatedAt: number;
};

export type BenchmarkDatasetIssueSeverity = 'info' | 'warning' | 'error';

export type BenchmarkDatasetIssue = {
  severity: BenchmarkDatasetIssueSeverity;
  sampleId?: string;
  message: string;
};

export type BenchmarkPerturbationMode =
  | 'none'
  | 'noise'
  | 'reverb'
  | 'speed'
  | 'volume'
  | 'compression'
  | 'telephone'
  | 'background-music';

export type BenchmarkPerturbationSettings = {
  enabled: boolean;
  mode: BenchmarkPerturbationMode;
  intensity: number;
};

export type BenchmarkModelTarget = {
  id: string;
  label: string;
  provider: AsrProvider;
  modelLabel: string;
  mainstreamAsrModel?: MainstreamAsrModel;
  costPerMinuteUsd: number;
};

export type BenchmarkRunStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled';

export type BenchmarkRunResult = {
  id: string;
  sampleId: string;
  modelId: string;
  status: BenchmarkRunStatus;
  message?: string;
  hypothesis?: string;
  detectedLanguage?: string;
  segments?: TranscriptionSegment[];
  score?: BenchmarkScore;
  timestampMetrics?: BenchmarkTimestampMetrics;
  diarizationMetrics?: BenchmarkDiarizationMetrics;
  streamingMetrics?: BenchmarkStreamingMetrics;
  latencyMs?: number;
  rtf?: number | null;
  estimatedCostUsd?: number | null;
  runCostUsd?: number | null;
  cacheKey?: string;
  audioChecksum?: string;
  audioSource?: string;
  fromCache?: boolean;
  modelSnapshot?: BenchmarkModelTarget;
  providerConfigSnapshot?: unknown;
  reviewAnnotation?: BenchmarkReviewAnnotation;
  errorMessage?: string;
  startedAt?: number;
  finishedAt?: number;
};

export type BenchmarkRunControls = {
  concurrency: number;
  rateLimitMs: number;
  retryLimit: number;
  budgetLimitUsd: number;
};

export type BenchmarkExperimentRecord = {
  id: number;
  name: string;
  datasetVersion: string;
  createdAt: number;
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
  errorHeatmap: BenchmarkErrorHeatmapItem[];
  datasetIssues: BenchmarkDatasetIssue[];
};

export type BenchmarkDatasetCatalogEntry = {
  id: string;
  name: string;
  languages: string[];
  scenario: string;
  recommendedSubset: string;
  manifestTemplate: string;
  downloadUrl: string;
  license: string;
  notes: string;
  tags: string[];
};

export type BenchmarkRunConfigSnapshot = {
  providerConfig: AsrProviderConfig;
  language: Language;
  context: string;
  enableItn: boolean;
  compressionLevel: CompressionLevel;
  trimSilence: boolean;
  enableLongAudioChunking: boolean;
  scoringOptions: BenchmarkScoringOptions;
  createdAt: string;
};

export type BenchmarkLeaderboardRow = {
  modelId: string;
  label: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  failureRate: number;
  averageWer: number | null;
  averageCer: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p50Rtf: number | null;
  p95Rtf: number | null;
  averageEstimatedCostUsd: number | null;
  totalEstimatedCostUsd: number | null;
  averageKeywordRecall: number | null;
  averageNameAccuracy: number | null;
  averageTermAccuracy: number | null;
};

export type BenchmarkBreakdownRow = {
  dimension: string;
  value: string;
  totalCount: number;
  completedCount: number;
  averageWer: number | null;
  averageCer: number | null;
  failureRate: number;
  averageKeywordRecall: number | null;
  averageNameAccuracy: number | null;
  averageTermAccuracy: number | null;
};
