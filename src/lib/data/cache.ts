import type { SubmissionDetail, TaskBundle } from './types';

const CACHE_PREFIX = 'awt:bundle:';
const DETAIL_PREFIX = 'awt:detail:';
const CACHE_TTL_MS = 60_000;

export function readStoredBundle(taskId: string): TaskBundle | null | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + taskId);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as { expires: number; value: TaskBundle | null };
    if (Date.now() > entry.expires) {
      localStorage.removeItem(CACHE_PREFIX + taskId);
      return undefined;
    }
    return entry.value;
  } catch {
    return undefined;
  }
}

export function writeStoredBundle(taskId: string, value: TaskBundle | null): void {
  try {
    localStorage.setItem(CACHE_PREFIX + taskId, JSON.stringify({ expires: Date.now() + CACHE_TTL_MS, value }));
  } catch {
    /* storage full */
  }
}

export function invalidateTaskBundleCache(taskId: string): void {
  localStorage.removeItem(CACHE_PREFIX + taskId);
}

export function readStoredDetail(submissionId: string): SubmissionDetail | null | undefined {
  try {
    const raw = localStorage.getItem(DETAIL_PREFIX + submissionId);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as { expires: number; value: SubmissionDetail | null };
    if (Date.now() > entry.expires) {
      localStorage.removeItem(DETAIL_PREFIX + submissionId);
      return undefined;
    }
    return entry.value;
  } catch {
    return undefined;
  }
}

export function writeStoredDetail(submissionId: string, value: SubmissionDetail | null): void {
  try {
    localStorage.setItem(DETAIL_PREFIX + submissionId, JSON.stringify({ expires: Date.now() + CACHE_TTL_MS, value }));
  } catch {
    /* storage full */
  }
}

export function invalidateSubmissionDetailCache(submissionId: string): void {
  localStorage.removeItem(DETAIL_PREFIX + submissionId);
}

// === Evaluation Timing Benchmarks Persistence ===
const BENCHMARK_KEY = 'awt:benchmark:eval_timings_v1';

export interface EvaluationBenchmark {
  baseLatencyMs: number;
  perChatMs: number;
  sampleCount: number;
  lastUpdated: number;
}

const DEFAULT_BENCHMARK: EvaluationBenchmark = {
  baseLatencyMs: 3800,
  perChatMs: 3200,
  sampleCount: 1,
  lastUpdated: 0,
};

export function getEvaluationBenchmark(): EvaluationBenchmark {
  try {
    const raw = localStorage.getItem(BENCHMARK_KEY);
    if (!raw) return DEFAULT_BENCHMARK;
    const parsed = JSON.parse(raw) as EvaluationBenchmark;
    if (parsed && typeof parsed.baseLatencyMs === 'number' && typeof parsed.perChatMs === 'number') {
      return {
        baseLatencyMs: Math.max(1500, Math.min(10000, parsed.baseLatencyMs)),
        perChatMs: Math.max(1500, Math.min(12000, parsed.perChatMs)),
        sampleCount: parsed.sampleCount || 1,
        lastUpdated: parsed.lastUpdated || 0,
      };
    }
  } catch {}
  return DEFAULT_BENCHMARK;
}

export function recordEvaluationBenchmark(chatCount: number, totalDurationMs: number): void {
  try {
    const safeChatCount = Math.max(1, chatCount);
    const current = getEvaluationBenchmark();

    // Estimate per-chat and base latency using exponential moving average (alpha = 0.35)
    // base latency is approx 35% of total, rest is per-chat work
    const measuredBase = Math.max(1500, Math.min(6000, totalDurationMs * 0.35));
    const measuredPerChat = Math.max(1500, Math.min(10000, (totalDurationMs - measuredBase) / safeChatCount));

    const alpha = 0.35;
    const newBase = Math.round(current.baseLatencyMs * (1 - alpha) + measuredBase * alpha);
    const newPerChat = Math.round(current.perChatMs * (1 - alpha) + measuredPerChat * alpha);

    const updated: EvaluationBenchmark = {
      baseLatencyMs: newBase,
      perChatMs: newPerChat,
      sampleCount: current.sampleCount + 1,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(BENCHMARK_KEY, JSON.stringify(updated));
  } catch {}
}
