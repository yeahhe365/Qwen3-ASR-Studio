export type BenchmarkRegressionPlan = {
  id: string;
  name: string;
  sampleLimit: number;
  intervalHours: number;
  nextRunAt: number;
  createdAt: number;
  active: boolean;
};

const STORAGE_KEY = 'benchmark-regression-plan';

export const createBenchmarkRegressionPlan = ({
  name,
  sampleLimit,
  intervalHours,
}: {
  name: string;
  sampleLimit: number;
  intervalHours: number;
}): BenchmarkRegressionPlan => {
  const now = Date.now();
  return {
    id: `benchmark-regression-${now}`,
    name: name.trim() || 'ASR Benchmark Regression',
    sampleLimit: Math.max(1, Math.floor(sampleLimit)),
    intervalHours: Math.max(1, Math.floor(intervalHours)),
    nextRunAt: now + Math.max(1, Math.floor(intervalHours)) * 60 * 60 * 1000,
    createdAt: now,
    active: true,
  };
};

export const getBenchmarkRegressionPlan = (): BenchmarkRegressionPlan | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return null;
    }
    const parsed = JSON.parse(storedValue) as BenchmarkRegressionPlan;
    return typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
};

export const saveBenchmarkRegressionPlan = (plan: BenchmarkRegressionPlan) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
};

export const clearBenchmarkRegressionPlan = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
};

export const isBenchmarkRegressionDue = (plan: BenchmarkRegressionPlan | null, now = Date.now()) => {
  return Boolean(plan?.active && now >= plan.nextRunAt);
};

export const markBenchmarkRegressionRun = (plan: BenchmarkRegressionPlan, now = Date.now()): BenchmarkRegressionPlan => ({
  ...plan,
  nextRunAt: now + plan.intervalHours * 60 * 60 * 1000,
});
