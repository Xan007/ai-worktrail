export type SubmissionState = 'pending' | 'graded_ok' | 'graded_alert';

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
  strip: string;
}

const STATUS_META: Record<SubmissionState, StatusMeta> = {
  pending: { label: 'Sin evaluar', color: '#334155', bg: '#F0F3F8', strip: '#C7CFDA' },
  graded_ok: { label: 'Evaluada', color: '#1F7A4D', bg: '#E8F4EE', strip: '#1F7A4D' },
  graded_alert: { label: 'Requiere revisión', color: '#B3372F', bg: '#FBEDEB', strip: '#B3372F' },
};

export function submissionStatus(analysis: { score: number | null; flagged: boolean } | null | undefined): {
  meta: StatusMeta;
  state: SubmissionState;
} {
  if (!analysis || analysis.score == null) return { meta: STATUS_META.pending, state: 'pending' };
  if (analysis.flagged) return { meta: STATUS_META.graded_alert, state: 'graded_alert' };
  return { meta: STATUS_META.graded_ok, state: 'graded_ok' };
}
