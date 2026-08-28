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
  return (
    <div className="mb-3 rounded-lg border border-[#EEF1F6] bg-[#FAFBFC] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-1.5 font-mono text-xs font-medium text-[#1E5AA8] hover:underline"
        >
          <span className="truncate">{url.length > 50 ? url.slice(0, 50) + '…' : url}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>

        <div className="flex items-center gap-3">
          <PlatformChip platform={platform} />

          {prompts.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E5AA8] hover:text-[#174A8C]"
            >
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Ver prompts ({prompts.length})
            </button>
          )}
        </div>
      </div>

      {extractionError && (
        <div className="mt-3 flex items-start gap-2 rounded-md border-l-4 border-[#B3372F] bg-[#FBEDEB] p-3 text-xs text-[#1A2332]">
          <AlertTriangle size={15} className="text-[#B3372F] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Advertencia de extracción:</span>
            <span>{extractionError}</span>
          </div>
        </div>
      )}

      {open && prompts.length > 0 && (
        <div className="mt-3 space-y-2 rounded-md border border-[#EEF1F6] bg-[#F6F8FB] p-3">
          {prompts.map((prompt, promptPos) => (
            <div key={`prompt-${chatIndex}-${prompt.slice(0, 40)}-${promptPos}`} className="flex items-start gap-2.5">
              <span className="shrink-0 rounded border border-[#D9E0EA] bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8B95A5]">
                [C{chatIndex + 1}-M{promptPos + 1}]
              </span>
              <div className="flex-1 rounded border border-[#EEF1F6] bg-white p-2.5 text-xs text-[#1A2332] shadow-2xs">
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
          <div className="overflow-hidden rounded-xl border border-[#D9E0EA] bg-white">
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
            <div className="h-[82px] rounded-lg border border-[#D9E0EA] bg-white animate-pulse" />
            <div className="h-[82px] rounded-lg border border-[#D9E0EA] bg-white animate-pulse" />
            <div className="h-[82px] rounded-lg border border-[#D9E0EA] bg-white animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-[72px] rounded-xl border border-[#D9E0EA] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#D9E0EA] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#D9E0EA] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#D9E0EA] bg-white animate-pulse" />
            <div className="h-[72px] rounded-xl border border-[#D9E0EA] bg-white animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

if (!course || !task || !submission) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
        {error && (
          <p className="mb-5 rounded-md border-l-[3px] border-[#B3372F] bg-[#FBEDEB] px-4 py-3 text-sm text-[#1A2332]">{error}</p>
        )}
        <EmptyState title="Entrega no encontrada" hint="Puede que no tengas acceso o que el enlace sea incorrecto." />
      </main>
    );
  }

const backToTask = `/courses/${cid}/tasks/${tid}`;

  const { meta: statusMeta } = submissionStatus(analysis);
  const scoreColor = analysis == null ? '#8B95A5' : analysis.score >= 70 ? '#1F7A4D' : analysis.score >= 40 ? '#B45309' : '#B3372F';

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

{/* Cabecera de la entrega - Tarjeta de resumen */}
      <section className="mb-6 overflow-hidden rounded-xl border border-[#D9E0EA] bg-white shadow-xs">
        <div style={{ height: 6, background: statusMeta.strip }} />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0 flex-1">
            {/* Anillo de progreso circular */}
            <div className="relative flex size-24 shrink-0 items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                {/* Círculo base */}
                <path
                  className="text-[#E5EAF1]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.08 a 15.92 15.92 0 0 1 0 31.83 a 15.92 15.92 0 0 1 0 -31.83"
                />
                {/* Círculo de progreso coloreado */}
                {analysis != null && (
                  <path
                    style={{
                      stroke: analysis.score >= 80 ? '#1F7A4D' : analysis.score >= 60 ? '#B45309' : '#B3372F',
                    }}
                    strokeDasharray={`${analysis.score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                  d="M18 2.08 a 15.92 15.92 0 0 1 0 31.83 a 15.92 15.92 0 0 1 0 -31.83"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span
                  style={{
                    color: analysis == null ? '#8B95A5' : analysis.score >= 80 ? '#1F7A4D' : analysis.score >= 60 ? '#B45309' : '#B3372F',
                  }}
                  className="font-mono text-2xl font-extrabold leading-none"
                >
                  {analysis?.score ?? '—'}
                </span>
                {analysis != null && (
                  <span className="text-[10px] font-semibold text-[#8B95A5]">/100</span>
                )}
              </div>
            </div>

            {/* Info del estudiante y metadata */}
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-[#1A2332]">
                {submission.student.name}
              </h1>

              <div>
                <span
                  style={{
                    background: analysis ? getProfileBg(analysis.profile) : '#F0F3F8',
                    color: analysis ? getProfileColor(analysis.profile) : '#8B95A5',
                  }}
                  className="inline-block rounded px-2.5 py-1 text-xs font-semibold"
                >
                  {analysis ? `${statusMeta.label} · ${getProfileLabel(analysis.profile)}` : 'Pendiente de evaluación'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                <span>Versión {submission.version}</span>
                <span>·</span>
                <span>Entregada el {formatDate(submission.submitted_at)}</span>
                <span>·</span>
                <span>{submission.chats.length} chat(s)</span>
                {task.is_group_task && (
                  <>
                    <span>·</span>
                    <span>Entrega grupal</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {isTeacher && (
            <div className="shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => void handleEvaluate()}
                disabled={evaluating}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1E5AA8] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#174A8C] disabled:opacity-75"
              >
                {evaluating && <Loader2 size={14} className="animate-spin" />}
                {evaluating ? 'Evaluando…' : analysis ? 'Re-evaluar' : 'Evaluar entrega'}
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="mx-6 mb-5 rounded-md border-l-4 border-[#B3372F] bg-[#FBEDEB] p-3 text-xs text-[#1A2332]">
            {error}
          </div>
        )}
      </section>

      {/* Trabajo del estudiante */}
      <section className="mb-8">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1A2332', marginBottom: 12 }}>Chats entregados</h2>
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
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1A2332', marginBottom: 12 }}>Evaluación</h2>
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
