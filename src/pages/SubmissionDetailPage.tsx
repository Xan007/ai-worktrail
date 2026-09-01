import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { AppBreadcrumb } from '@/components/AppBreadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { ScoreBlock } from '@/components/ScoreBlock';
import { useBackendClient, useProfileState } from '@/hooks/useBackend';
import type { Analysis } from '@/lib/mockdata';
import { getProfileLabel, getProfileColor, getProfileBg, formatDate } from '@/lib/mockdata';
import { evaluateSubmission, getSubmissionDetail, type SubmissionDetail } from '@/lib/data';
import { PromptText } from '@/components/PromptText';
import { PlatformChip } from '@/components/meta';
import { submissionStatus } from '@/lib/submission-status';
import { splitIntoMessages } from '@/lib/prompts';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatRowProps {
  url: string;
  platform: string;
  gemStatus: 'verified' | 'unverified' | null;
  extractionError: string | null;
  prompts: string[];
  chatIndex: number;
}

function ChatRow({ url, platform, gemStatus, extractionError, prompts, chatIndex }: ChatRowProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleFocus = (e: CustomEvent<{ chat: number; message: number }>) => {
      if (e.detail.chat === chatIndex + 1) {
        setOpen(true);
        setTimeout(() => {
          const el = document.getElementById(`prompt-${chatIndex + 1}-${e.detail.message}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-[#E0F2FE]/50', 'transition-colors', 'duration-500');
            setTimeout(() => {
              el.classList.remove('bg-[#E0F2FE]/50');
            }, 2500);
          }
        }, 100);
      }
    };
    window.addEventListener('awt:focus-prompt', handleFocus as EventListener);
    return () => window.removeEventListener('awt:focus-prompt', handleFocus as EventListener);
  }, [chatIndex]);

  return (
    <div className="mb-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformChip platform={platform} />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-xs font-medium text-[#0077CC] hover:underline max-w-[320px] sm:max-w-[480px]"
          >
            {url}
          </a>
        </div>

        <div className="flex items-center gap-3">
          {prompts.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
            >
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {open ? 'Ocultar prompts' : `Ver prompts (${prompts.length})`}
            </button>
          )}
        </div>
      </div>

      {extractionError && (
        <div className="mt-3 flex items-start gap-2 rounded-md border-l-4 border-[#B3372F] bg-[#FBEDEB] p-3 text-xs text-[#0F172A]">
          <AlertTriangle size={15} className="text-[#B3372F] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Advertencia de extracción:</span>
            <span>{extractionError}</span>
          </div>
        </div>
      )}

      {open && prompts.length > 0 && (
        <div className="mt-4 border-t border-[#EEF1F6] pt-3 divide-y divide-[#F1F5F9]">
          {prompts.map((prompt, promptPos) => (
            <div
              key={`prompt-${chatIndex}-${prompt.slice(0, 40)}-${promptPos}`}
              id={`prompt-${chatIndex + 1}-${promptPos + 1}`}
              className="flex items-start gap-3.5 py-3 first:pt-2 last:pb-1 rounded-md px-2 -mx-2 transition-colors duration-300"
            >
              <span className="shrink-0 font-mono text-[11px] font-semibold text-[#94A3B8] w-5 text-right pt-0.5">
                {String(promptPos + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <PromptText text={prompt} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SubmissionDetailPage() {
  const { cid, tid, sid } = useParams();
  const navigate = useNavigate();
  const client = useBackendClient();
  const { user } = useUser();
  const { profile } = useProfileState();

const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const course = detail?.course ?? null;
  const task = detail?.task ?? null;
  const submission = detail?.submission ?? null;
  const analysis = detail?.analysis ?? null;
  const isTeacher = !!(user && course && course.teacher_id === user.id);

  const load = useCallback(async () => {
    if (!sid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSubmissionDetail(client, sid);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, sid]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEvaluate = async () => {
    if (!sid) return;
    setEvaluating(true);
    setError(null);
    try {
      await evaluateSubmission(client, sid, tid);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    document.title = 'Entrega — AI WorkTrail';
  }, []);

if (loading) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8" aria-busy="true">
        <span className="sr-only">Cargando entrega...</span>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <div className="h-6 animate-pulse rounded-t-xl bg-[#F0F3F8]" />
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                <Skeleton className="h-9 w-28" />
                <div className="text-center"><Skeleton className="h-14 w-14" /><Skeleton className="mt-1 h-3 w-20" /></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-[82px] rounded-lg border border-[#E2E8F0] bg-white animate-pulse" />
            <div className="h-[82px] rounded-lg border border-[#E2E8F0] bg-white animate-pulse" />
            <div className="h-[82px] rounded-lg border border-[#E2E8F0] bg-white animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-[72px] rounded-xl border border-[#E2E8F0] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#E2E8F0] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#E2E8F0] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#E2E8F0] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#E2E8F0] bg-white animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

if (!course || !task || !submission) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
        {error && (
          <p className="mb-5 rounded-md border-l-[3px] border-[#B3372F] bg-[#FBEDEB] px-4 py-3 text-sm text-[#0F172A]">{error}</p>
        )}
        <EmptyState title="Entrega no encontrada" hint="Puede que no tengas acceso o que el enlace sea incorrecto." />
      </main>
    );
  }

const backToTask = `/courses/${cid}/tasks/${tid}`;

  const { meta: statusMeta } = submissionStatus(analysis);
  const scoreColor = analysis == null ? '#64748B' : analysis.score >= 70 ? '#1F7A4D' : analysis.score >= 40 ? '#B45309' : '#B3372F';

  return (
    <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
      <AppBreadcrumb
        items={[
          { label: 'Mis cursos', href: '/courses' },
          { label: course.name, href: `/courses/${cid}` },
          { label: task.name, href: backToTask },
          { label: submission.student.name },
        ]}
      />

      <section className="mb-6 rounded-xl border border-[#E2E8F0] bg-white px-6 py-5 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-[#0F172A]">
              {submission.student.name}
            </h1>

            <p className="text-xs text-[#64748B]">
              Entregado el {formatDate(submission.submitted_at)}
              {task.due_at && (
                <span
                  className={
                    new Date(submission.submitted_at) > new Date(task.due_at)
                      ? ' text-[#B3372F] font-medium'
                      : ' text-[#1F7A4D] font-medium'
                  }
                >
                  {new Date(submission.submitted_at) > new Date(task.due_at)
                    ? ' (con retraso)'
                    : ' (a tiempo)'}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {analysis != null && (
              <div className="text-right">
                <span
                  style={{
                    color:
                      analysis.score >= 80
                        ? '#1F7A4D'
                        : analysis.score >= 60
                        ? '#B45309'
                        : '#B3372F',
                  }}
                  className="font-mono text-2xl font-bold leading-none block"
                >
                  {analysis.score}
                  <span className="text-xs font-normal text-[#94A3B8]">/100</span>
                </span>
              </div>
            )}

            {isTeacher && (
              <button
                type="button"
                onClick={() => void handleEvaluate()}
                disabled={evaluating}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0077CC] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#0066B3] disabled:opacity-75 shadow-2xs"
              >
                {evaluating && <Loader2 size={14} className="animate-spin" />}
                {evaluating ? 'Evaluando…' : analysis ? 'Re-evaluar' : 'Evaluar entrega'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border-l-4 border-[#B3372F] bg-[#FBEDEB] p-3 text-xs text-[#0F172A]">
            {error}
          </div>
        )}
      </section>

      {/* Trabajo del estudiante */}
      <section className="mb-8">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Chats entregados</h2>
        {submission.chats.length === 0 ? (
          <EmptyState title="Esta entrega no tiene chats registrados" />
        ) : (
          <div>
            {submission.chats.map((chat, ci) => (
              <ChatRow
                key={chat.id}
                url={chat.url}
                platform={chat.platform}
                gemStatus={chat.gem_status}
                extractionError={chat.extraction_error}
                prompts={chat.prompts}
                chatIndex={ci}
              />
            ))}
          </div>
        )}
      </section>

      {/* Evaluación */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Evaluación</h2>
        {analysis ? (
          <>

            <ScoreBlock analysis={analysis} studentName={submission.student.name} storageKey={`detail-${analysis.id}`} />
          </>
        ) : (
          <EmptyState
            title="Aún no evaluada"
            hint={isTeacher ? 'Presiona "Evaluar entrega" para generar el análisis con IA.' : 'Tu docente generará la evaluación aquí.'}
          />
        )}
      </section>
    </main>
  );
}
