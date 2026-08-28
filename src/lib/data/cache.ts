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
