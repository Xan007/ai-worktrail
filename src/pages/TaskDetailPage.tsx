import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Eye, ExternalLink, Loader2, Pencil, Search, Settings, Sparkles, Trash2 } from 'lucide-react';
import { PlatformChip, StatusChip } from '@/components/meta';
import { useUser } from '@clerk/clerk-react';
import { AppBreadcrumb } from '@/components/AppBreadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBackendClient } from '@/hooks/useBackend';
import { useCourseRole } from '@/hooks/useRoleMode';
import { createTask, deleteSubmission, deleteTask, evaluateSubmission, getSubmissionDetail, getTaskBundle, invalidateTaskBundleCache, updateTask, type TaskBundle, type SubmissionView } from '@/lib/data';
import { showError, showSuccess, showUndoDeleteTask } from '@/lib/toast';
import type { AIEvaluationMode, Analysis, GroupGradingMode, Submission, Task, TaskStatus } from '@/lib/mockdata';
import { formatDate } from '@/lib/mockdata';

const PREFETCH_DEBOUNCE_MS = 200;
const dueDateFormatterLong = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

interface SubmissionsListSectionProps {
  latestByStudent: SubmissionView[];
  isTeacher: boolean;
  taskStatus: TaskStatus;
  task: Task;
  user: ReturnType<typeof useUser>['user'];
  cid: string | undefined;
  tid: string | undefined;
  client: ReturnType<typeof useBackendClient>;
  hoverTimers: React.RefObject<Map<string, ReturnType<typeof setTimeout>>>;
  getAnalysis: (subId: string) => Analysis | undefined;
  onDeleteClick: (subId: string) => void;
  onBulkEvaluate?: () => void;
  evaluatingBulk?: boolean;
}

function SubmissionsListSection({
  latestByStudent,
  isTeacher,
  taskStatus,
  task,
  user,
  cid,
  tid,
  client,
  hoverTimers,
  getAnalysis,
  onDeleteClick,
  onBulkEvaluate,
  evaluatingBulk,
}: SubmissionsListSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleMouseEnter = (subId: string) => {
    if (hoverTimers.current?.has(subId)) return;
    const timer = setTimeout(() => {
      void getSubmissionDetail(client, subId);
      hoverTimers.current?.delete(subId);
    }, PREFETCH_DEBOUNCE_MS);
    hoverTimers.current?.set(subId, timer);
  };

  const handleMouseLeave = (subId: string) => {
    const timer = hoverTimers.current?.get(subId);
    if (timer) {
      clearTimeout(timer);
      hoverTimers.current?.delete(subId);
    }
  };

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return latestByStudent;
    return latestByStudent.filter((sub) => sub.student.name.toLowerCase().includes(q));
  }, [latestByStudent, searchQuery]);

  const unevaluatedCount = useMemo(() => {
    return latestByStudent.filter((sub) => {
      const a = getAnalysis(sub.id);
      return !a || a.score == null;
    }).length;
  }, [latestByStudent, getAnalysis]);

  if (latestByStudent.length === 0) {
    return (
      <EmptyState
        title="Aún no hay entregas"
        hint={isTeacher ? 'Las entregas de tus estudiantes aparecerán aquí.' : 'Cuando entregues, aparecerá aquí.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de control para el docente: Búsqueda y Evaluación masiva */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="pointer-events-none absolute left-3 top-3 text-[#64748B]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por estudiante..."
            className="h-9 pl-8 text-xs bg-white"
          />
        </div>

        {isTeacher && onBulkEvaluate && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={evaluatingBulk || unevaluatedCount === 0}
              onClick={onBulkEvaluate}
              className="gap-1.5 text-xs text-[#0077CC] hover:text-[#0066B3]"
            >
              {evaluatingBulk ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Evaluando todas…
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Evaluar pendientes ({unevaluatedCount})
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E2E8F0] p-8 text-center bg-white">
          <p className="text-xs font-semibold text-[#334155]">No se encontraron estudiantes con "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-1 text-xs text-[#0077CC] hover:underline"
          >
            Limpiar filtro
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
          <div className="divide-y divide-[#EEF1F6]">
            {filteredSubmissions.map((sub) => {
              const analysis = getAnalysis(sub.id);
              const isOwn = sub.student.id === user?.id;
              const canDelete = isTeacher || (isOwn && taskStatus === 'open');

              return (
                <div
                  key={sub.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#F8FAFD]"
                  onMouseEnter={() => handleMouseEnter(sub.id)}
                  onMouseLeave={() => handleMouseLeave(sub.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isTeacher && (
                        <span className="text-xs font-semibold text-[#0F172A]">{sub.student.name}</span>
                      )}
                      <StatusChip analysis={analysis ?? null} />
                      <div className="flex items-center gap-1">
                        {sub.chats.map((chat) => (
                          <PlatformChip key={chat.id} platform={chat.platform} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#64748B]">
                      <span>{formatDate(sub.submitted_at)}</span>
                      <span>·</span>
                      <span>{sub.chats.length} chat{sub.chats.length > 1 ? 's' : ''} aportado{sub.chats.length > 1 ? 's' : ''}</span>
                      {task.is_group_task && (
                        <>
                          <span>·</span>
                          <span className="rounded bg-[#F0F3F8] px-1.5 py-0.2 text-[10px] font-medium text-[#334155]">
                            Grupo
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/courses/${cid}/tasks/${tid}/submissions/${sub.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] shadow-2xs hover:bg-[#F0F3F8] transition-colors"
                    >
                      Ver entrega
                      <ChevronRight size={13} />
                    </Link>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDeleteClick(sub.id)}
                        className="inline-flex items-center rounded-md border border-[#E2E8F0] p-1.5 text-[#64748B] hover:border-[#B3372F] hover:bg-[#FBEDEB] hover:text-[#B3372F] transition-colors"
                        aria-label="Eliminar entrega"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskEditDialog({ task, onUpdated }: { task: Task; onUpdated: () => void }) {
  const client = useBackendClient();
  const [open, setOpen] = useState(false);

  const getInitial = useCallback(() => {
    const due = task.due_at ? new Date(task.due_at) : null;
    let dueDate = '2026-08-31';
    let dueTime = '23:59';
    if (due && !isNaN(due.getTime())) {
      dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
      dueTime = `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`;
    }
    return {
      name: task.name,
      dueDate,
      dueTime,
      isGroup: task.is_group_task,
      groupGrading: (task.group_grading_mode ?? 'shared') as GroupGradingMode,
      maxGroupSize: String(task.max_group_size ?? 4),
      aiMode: task.ai_evaluation_mode as AIEvaluationMode,
      allowResubmission: task.allow_resubmission ?? true,
    };
  }, [task]);

  const [name, setName] = useState(() => getInitial().name);
  const [dueDate, setDueDate] = useState(() => getInitial().dueDate);
  const [dueTime, setDueTime] = useState(() => getInitial().dueTime);
  const [isGroup, setIsGroup] = useState(() => getInitial().isGroup);
  const [groupGrading, setGroupGrading] = useState(() => getInitial().groupGrading);
  const [maxGroupSize, setMaxGroupSize] = useState(() => getInitial().maxGroupSize);
  const [aiMode, setAiMode] = useState(() => getInitial().aiMode);
  const [allowResubmission, setAllowResubmission] = useState(() => getInitial().allowResubmission);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const init = getInitial();
      setName(init.name);
      setDueDate(init.dueDate);
      setDueTime(init.dueTime);
      setIsGroup(init.isGroup);
      setGroupGrading(init.groupGrading);
      setMaxGroupSize(init.maxGroupSize);
      setAiMode(init.aiMode);
      setAllowResubmission(init.allowResubmission);
      setError(null);
    }
  }, [open, getInitial]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !dueDate || !dueTime) return;
    setBusy(true);
    setError(null);
    try {
      await updateTask(client, task.id, {
        name: name.trim(),
        due_date: `${dueDate}T${dueTime}:00`,
        is_group_task: isGroup,
        group_grading_mode: isGroup ? groupGrading : 'shared',
        max_group_size: isGroup ? Number(maxGroupSize) : undefined,
        ai_evaluation_mode: aiMode,
        allow_resubmission: allowResubmission,
      });
      setOpen(false);
      onUpdated();
      showSuccess(`Tarea "${name.trim()}" actualizada`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      showError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Configurar tarea">
          <Settings size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Editar tarea</DialogTitle>
          <DialogDescription>Actualiza los datos de la tarea. Se guardará para todos los estudiantes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-task-name">Nombre de la tarea</Label>
            <Input id="edit-task-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Fecha de vencimiento</Label>
              <Input id="edit-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due-time">Hora de vencimiento</Label>
              <Input id="edit-due-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] p-4">
            <div className="mb-3 flex items-center gap-2">
              <input id="edit-group-task" type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} className="size-4 accent-[#0077CC]" />
              <Label htmlFor="edit-group-task">Permitir entrega grupal</Label>
            </div>
            {isGroup && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-group-size">Máximo de integrantes</Label>
                  <Input id="edit-group-size" type="number" min="2" max="10" value={maxGroupSize} onChange={(e) => setMaxGroupSize(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-group-grading">Calificación</Label>
                  <NativeSelect id="edit-group-grading" value={groupGrading} onChange={(e) => setGroupGrading(e.target.value as GroupGradingMode)} className="w-full">
                    <NativeSelectOption value="shared">Una nota para el grupo</NativeSelectOption>
                    <NativeSelectOption value="individual">Nota individual</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ai-mode">Evaluación con IA</Label>
            <NativeSelect id="edit-ai-mode" value={aiMode} onChange={(e) => setAiMode(e.target.value as AIEvaluationMode)} className="w-full">
              <NativeSelectOption value="on_submit">Evaluar automáticamente al entregar</NativeSelectOption>
              <NativeSelectOption value="on_demand">Evaluar manualmente</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="flex items-center gap-2">
            <input id="edit-allow-resubmission" type="checkbox" checked={allowResubmission} onChange={(e) => setAllowResubmission(e.target.checked)} className="size-4 accent-[#0077CC]" />
            <Label htmlFor="edit-allow-resubmission">Permitir que los estudiantes corrijan su entrega</Label>
          </div>
          {error && <p className="text-sm text-[#B3372F]">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskDetailPage() {
  const { cid, tid } = useParams();
  const navigate = useNavigate();
  const client = useBackendClient();
  const { user } = useUser();
  const hoverTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [bundle, setBundle] = useState<TaskBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState(false);
  const [confirmDeleteTaskOpen, setConfirmDeleteTaskOpen] = useState(false);

  const course = bundle?.course ?? null;
  const task = bundle?.task ?? null;
  const { isActualTeacher, isTeacher, isStudentPreview, setStudentPreview } = useCourseRole(course?.teacher_id);
  const backToCourse = cid ? `/courses/${cid}` : '/courses';

  useEffect(() => {
    document.title = task ? `${task.name} — AI WorkTrail` : 'AI WorkTrail';
  }, [task]);

  useEffect(() => {
    return () => {
      hoverTimers.current.forEach((t) => clearTimeout(t));
      hoverTimers.current.clear();
    };
  }, []);

  const load = useCallback(async () => {
    if (!tid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTaskBundle(client, tid);
      setBundle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, tid]);

  useEffect(() => {
    void load();
  }, [load]);

  const submissions = (bundle?.submissions ?? []).filter((s) => isTeacher || s.student.id === user?.id);

  const latestByStudent = useMemo(() => {
    const seen = new Set<string>();
    const out: SubmissionView[] = [];
    for (const s of submissions) {
      if (!seen.has(s.student.id)) {
        seen.add(s.student.id);
        out.push(s);
      }
    }
    return out;
  }, [submissions]);

  const allowResubmission = task?.allow_resubmission ?? true;
  const mySubmission = !isTeacher
    ? latestByStudent.find((s) => s.student.id === user?.id) ?? null
    : null;
  const isOverdue = task?.due_at ? (() => { try { return new Date(task.due_at).getTime() < Date.now(); } catch { return false; } })() : false;
  const isTaskClosed = task?.status === 'closed' || isOverdue;
  const canStudentSubmit = !isTeacher && !isTaskClosed && (!mySubmission || allowResubmission);

  const getAnalysis = (subId: string): Analysis | undefined =>
    (bundle?.analysesBySubmission as Record<string, Analysis> | undefined)?.[subId];

  const handleDelete = async () => {
    if (!deleteId || deleting || !tid) return;
    setDeleting(true);
    try {
      await deleteSubmission(client, deleteId);
      invalidateTaskBundleCache(tid);
      setDeleteId(null);
      if (!isTeacher) {
        navigate(`/courses/${cid}`);
      } else {
        await load();
      }
      showSuccess('Entrega eliminada');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      showError(msg);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const [evaluatingBulk, setEvaluatingBulk] = useState(false);

  const handleBulkEvaluate = async () => {
    if (!tid || evaluatingBulk) return;
    const unevaluated = latestByStudent.filter((sub) => {
      const a = getAnalysis(sub.id);
      return !a || a.score == null;
    });
    if (unevaluated.length === 0) return;

    setEvaluatingBulk(true);
    let successCount = 0;
    try {
      for (const sub of unevaluated) {
        try {
          await evaluateSubmission(client, sub.id, tid);
          successCount++;
        } catch {}
      }
      invalidateTaskBundleCache(tid);
      await load();
      showSuccess(`Se evaluaron ${successCount} entrega(s) exitosamente.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setEvaluatingBulk(false);
    }
  };

  const handleDeleteTaskWithUndo = async () => {
    if (!task || !tid || !cid || pendingDeleteTask) return;
    setConfirmDeleteTaskOpen(false);
    const snapshot = { ...task };
    const name = snapshot.name;
    const hasSubmissions = (bundle?.submissions?.length ?? 0) > 0;
    setPendingDeleteTask(true);
    try {
      await deleteTask(client, tid);
      navigate(`/courses/${cid}`);
      if (hasSubmissions) {
        showSuccess(`Tarea "${name}" eliminada`);
      } else {
        showUndoDeleteTask({
          taskName: name,
          onUndo: async () => {
            await createTask(client, {
              course_id: cid,
              name: snapshot.name,
              is_group_task: snapshot.is_group_task,
              group_grading_mode: snapshot.group_grading_mode ?? 'shared',
              ai_evaluation_mode: snapshot.ai_evaluation_mode as AIEvaluationMode,
              max_group_size: snapshot.max_group_size ?? undefined,
              due_date: snapshot.due_at ?? undefined,
              allow_resubmission: snapshot.allow_resubmission ?? true,
            });
            window.dispatchEvent(new CustomEvent('awt:task-restored', { detail: { courseId: cid } }));
          },
        });
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingDeleteTask(false);
    }
  };

  if (loading) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
        <Skeleton className="mb-4 h-5 w-48" />
        <Skeleton className="mb-6 h-10 w-2/3" />
        <Skeleton className="h-40 rounded-xl" />
      </main>
    );
  }

  if (error || !task) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
        <EmptyState title="No se pudo cargar la tarea" hint={error ?? 'La tarea no existe o no tienes acceso.'} />
      </main>
    );
  }

  return (
    <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
      <div className="flex items-center justify-between gap-4 pb-5">
        <AppBreadcrumb
          items={[
            { label: 'Mis cursos', href: '/courses' },
            { label: course?.name ?? 'Curso', href: backToCourse },
            { label: task.name },
          ]}
        />
        {isActualTeacher && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 shrink-0 gap-1 rounded-full bg-white px-2.5 py-0 text-[11px] font-medium leading-none text-[#64748B] shadow-sm ring-1 ring-[#E2E8F0] hover:bg-[#F0F3F8] hover:text-[#0F172A]"
            onClick={() => setStudentPreview(!isStudentPreview)}
          >
            <Eye size={11} />
            {isStudentPreview ? 'Salir' : 'Vista previa'}
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[25px] font-bold tracking-[-0.03em] text-[#0F172A]">{task.name}</h1>
            {isTaskClosed && <span className="rounded-full bg-[#FBEDEB] px-2 py-0.5 text-xs font-semibold text-[#B3372F]">Cerrada</span>}
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            Vence:{' '}
            {task.due_at
              ? (() => {
                  try {
                    const d = new Date(task.due_at);
                    return isNaN(d.getTime()) ? task.due_at : dueDateFormatterLong.format(d);
                  } catch {
                    return task.due_at;
                  }
                })()
              : 'Sin fecha límite'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isTeacher && task && (
            <>
              <TaskEditDialog task={task} onUpdated={load} />
              <Button
                variant="outline"
                size="icon"
                disabled={pendingDeleteTask}
                onClick={() => setConfirmDeleteTaskOpen(true)}
                aria-label="Eliminar tarea"
                className="text-[#64748B] hover:border-[#B3372F] hover:bg-[#FBEDEB] hover:text-[#B3372F]"
                title="Eliminar tarea"
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}

          {canStudentSubmit && (
            <Button asChild size="sm" className="gap-1.5 text-xs font-semibold">
              <Link to={`/courses/${cid}/tasks/${tid}/submit`}>
                {mySubmission ? (
                  <>
                    <Pencil size={14} /> Editar entrega
                  </>
                ) : (
                  'Entregar tarea'
                )}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isTaskClosed && (
        <div className="mb-4 rounded-md border border-[#E8CAC7] bg-[#FBEDEB] px-4 py-2.5 text-sm text-[#922B24]">
          <span className="font-semibold">Tarea cerrada</span> — no se aceptan más entregas {isOverdue ? '(vencida)' : ''}.
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>Entregas</h2>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#64748B',
            background: '#F0F3F8',
            borderRadius: 10,
            padding: '1px 7px',
          }}
        >
          {latestByStudent.length}
        </span>
      </div>

      <SubmissionsListSection
        latestByStudent={latestByStudent}
        isTeacher={isTeacher}
        taskStatus={task.status}
        task={task}
        user={user}
        cid={cid}
        tid={tid}
        client={client}
        hoverTimers={hoverTimers}
        getAnalysis={getAnalysis}
        onDeleteClick={setDeleteId}
        onBulkEvaluate={handleBulkEvaluate}
        evaluatingBulk={evaluatingBulk}
      />

      <Dialog open={confirmDeleteTaskOpen} onOpenChange={setConfirmDeleteTaskOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar tarea?</DialogTitle>
            <DialogDescription>
              Se eliminarán <strong>todas las entregas</strong> de <strong>{task?.name}</strong> de forma permanente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteTaskOpen(false)} disabled={pendingDeleteTask}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteTaskWithUndo()}
              disabled={pendingDeleteTask}
              className="bg-[#B3372F] hover:bg-[#922B24]"
            >
              {pendingDeleteTask ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleting) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar entrega?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La entrega y su evaluación serán eliminadas permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[#B3372F] hover:bg-[#922B24]"
            >
              {deleting ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

