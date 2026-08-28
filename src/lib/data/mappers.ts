import type { Analysis, Course, Criterion, EnrollmentMode, Profile } from '@/lib/mockdata';
import { splitIntoMessages } from '@/lib/prompts';
import type { ChatView } from './types';

export const CRITERIA_META: Record<string, { name: string; weight: number }> = {
  ownership: { name: 'Autoría del trabajo', weight: 30 },
  critical_engagement: { name: 'Compromiso crítico', weight: 25 },
  ai_as_tutor: { name: 'IA como tutor', weight: 20 },
  integration_originality: { name: 'Integración y originalidad', weight: 15 },
  process_awareness: { name: 'Conciencia del proceso', weight: 10 },
};

const MODE_FROM_DB: Record<string, EnrollmentMode> = {
  open: 'open',
  approval: 'requires_approval',
  whitelist: 'whitelist',
};

export const MODE_TO_DB: Record<EnrollmentMode, string> = {
  open: 'open',
  requires_approval: 'approval',
  whitelist: 'whitelist',
};

interface BreakdownShape {
  profile?: Profile;
  criteria?: Array<{
    key: string;
    rating: number;
    band?: Criterion['band'];
    explanation?: string;
    evidence?: Criterion['evidence'];
  }>;
  strengths?: unknown;
  improvements?: unknown;
}

export function mapAnalysis(row: Record<string, unknown>): Analysis {
  const breakdown = (row.breakdown ?? null) as BreakdownShape | null;
  const criteria: Criterion[] = Object.entries(CRITERIA_META).map(([key, meta]) => {
    const found = breakdown?.criteria?.find((c) => c.key === key);
    return {
      key,
      name: meta.name,
      weight: meta.weight,
      rating: found?.rating ?? 0,
      band:
        found?.band ??
        ({ level: 1, label: '—', description: 'Sin datos.' } as Criterion['band']),
      explanation: found?.explanation ?? '',
      evidence: found?.evidence ?? [],
    };
  });
  return {
    id: String(row.id),
    submission_id: String(row.submission_id),
    score: row.score != null ? Number(row.score) : 0,
    flagged: Boolean(row.flagged),
    profile: (breakdown?.profile ?? 'productive_passenger') as Profile,
    summary: (row.justification as string) ?? '',
    criteria,
    strengths: Array.isArray(breakdown?.strengths) ? (breakdown!.strengths as string[]) : [],
    improvements: Array.isArray(breakdown?.improvements)
      ? (breakdown!.improvements as string[])
      : [],
  };
}

export function mapChat(row: Record<string, unknown>): ChatView {
  const extracted = (row.extracted_text as string | null) ?? null;
  return {
    id: String(row.id),
    url: String(row.chat_url),
    platform: (row.platform as ChatView['platform']) ?? 'other',
    gem_status: row.approved_gem_id
      ? 'verified'
      : row.is_gem
        ? 'unverified'
        : null,
    extraction_error: (row.extraction_error as string | null) ?? null,
    prompts: extracted ? splitIntoMessages(extracted) : [],
  };
}

type CourseRole = 'teacher' | 'student';

export function mapCourse(
  row: { id: string; name: string; join_code: string; enrollment_mode: string; description?: string; is_enrollment_locked?: boolean },
  courseRole: CourseRole,
  enrollmentStatus: 'pending' | 'approved' | 'rejected' = 'approved',
  pendingEnrollmentsCount = 0,
): Course {
  return {
    id: row.id,
    name: row.name,
    join_code: row.join_code,
    enrollment_mode: MODE_FROM_DB[row.enrollment_mode] ?? 'open',
    role: courseRole,
    description: row.description,
    enrollment_status: enrollmentStatus,
    pending_enrollments_count: pendingEnrollmentsCount,
    is_enrollment_locked: Boolean(row.is_enrollment_locked),
  };
}
