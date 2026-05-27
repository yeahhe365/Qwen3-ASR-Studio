import { mainstreamAsrModelDisplayNames } from '../displayNames';
import { AsrProvider, MainstreamAsrModel, type AsrProviderConfig } from '../types';
import { asrProviderMetadata } from './providerRegistry';
import { getMainstreamAsrModelDescriptor, mainstreamAsrModelOrder } from './providers/mainstreamAsrCatalog';
import type { BenchmarkModelTarget } from './benchmarkTypes';

const baseProviderCostPerMinuteUsd: Partial<Record<AsrProvider, number>> = {
  [AsrProvider.QWEN]: 0,
  [AsrProvider.DOUBAO]: 0,
  [AsrProvider.GEMINI]: 0,
  [AsrProvider.NVIDIA_NIM]: 0,
};

const mainstreamCostPerMinuteUsd: Partial<Record<MainstreamAsrModel, number>> = {
  [MainstreamAsrModel.OPENAI_WHISPER_1]: 0.006,
  [MainstreamAsrModel.GROQ_WHISPER_LARGE_V3_TURBO]: 0.004,
  [MainstreamAsrModel.GROQ_WHISPER_LARGE_V3]: 0.006,
  [MainstreamAsrModel.GROQ_DISTIL_WHISPER_LARGE_V3_EN]: 0.002,
  [MainstreamAsrModel.FIREWORKS_WHISPER_V3]: 0.005,
  [MainstreamAsrModel.FIREWORKS_WHISPER_V3_TURBO]: 0.003,
};

const createBaseProviderTarget = (provider: Exclude<AsrProvider, AsrProvider.MAINSTREAM>): BenchmarkModelTarget => {
  const metadata = asrProviderMetadata[provider];
  return {
    id: provider,
    label: metadata.label,
    provider,
    modelLabel: metadata.model,
    costPerMinuteUsd: baseProviderCostPerMinuteUsd[provider] ?? 0,
  };
};

export const getBenchmarkModelTargets = (): BenchmarkModelTarget[] => {
  const baseTargets = [
    createBaseProviderTarget(AsrProvider.QWEN),
    createBaseProviderTarget(AsrProvider.DOUBAO),
    createBaseProviderTarget(AsrProvider.GEMINI),
    createBaseProviderTarget(AsrProvider.NVIDIA_NIM),
  ];
  const mainstreamTargets = mainstreamAsrModelOrder.map((model) => {
    const descriptor = getMainstreamAsrModelDescriptor(model);
    return {
      id: `${AsrProvider.MAINSTREAM}:${model}`,
      label: mainstreamAsrModelDisplayNames[model] || descriptor.label,
      provider: AsrProvider.MAINSTREAM,
      modelLabel: descriptor.modelName,
      mainstreamAsrModel: model,
      costPerMinuteUsd: mainstreamCostPerMinuteUsd[model] ?? 0,
    };
  });

  return [...baseTargets, ...mainstreamTargets];
};

export const createBenchmarkProviderConfig = (
  baseConfig: AsrProviderConfig,
  target: BenchmarkModelTarget,
): AsrProviderConfig => ({
  ...baseConfig,
  provider: target.provider,
  mainstreamAsrModel: target.mainstreamAsrModel ?? baseConfig.mainstreamAsrModel,
});

export const getBenchmarkTargetLabel = (target: BenchmarkModelTarget) => {
  return target.provider === AsrProvider.MAINSTREAM ? target.label : `${target.label} · ${target.modelLabel}`;
};

export const estimateBenchmarkCost = (durationSeconds: number | undefined, costPerMinuteUsd: number) => {
  if (!durationSeconds || durationSeconds <= 0 || costPerMinuteUsd <= 0) {
    return null;
  }

  return (durationSeconds / 60) * costPerMinuteUsd;
};
