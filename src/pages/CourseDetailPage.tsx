import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, ChevronDown, ChevronRight, Circle, CircleCheck, ClipboardList, Copy, Eye, Lock, LogOut, Plus, Settings, Trash, Users } from 'lucide-react';
import { showError, showSuccess, showTaskCreated } from '@/lib/toast';
import { useUser } from '@clerk/clerk-react';
import { AppBreadcrumb } from '@/components/AppBreadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { InviteModal } from '@/components/InviteModal';
import { TeacherOnboardingChecklist } from '@/components/TeacherOnboardingChecklist';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useBackendClient, useProfileState } from '@/hooks/useBackend';
import { useCourseRole } from '@/hooks/useRoleMode';

const dueDateFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
import { createTask as createTaskApi, deleteCourse, getCourse, getMySubmissionsByTasks, leaveCourse, listCourseEnrollments, listTasks, setCourseLock } from '@/lib/data';
import type { AIEvaluationMode, Course, EnrollmentMode, GroupGradingMode, Task } from '@/lib/mockdata';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

function TaskDialog({
  onCreate,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  highlight,
}: {
  onCreate: (task: Omit<Task, 'id' | 'course_id' | 'created_at'>) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  highlight?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('2026-08-31');
  const [dueTime, setDueTime] = useState('23:59');
  const [isGroup, setIsGroup] = useState(false);
  const [groupGrading, setGroupGrading] = useState<GroupGradingMode>('shared');
  const [maxGroupSize, setMaxGroupSize] = useState('4');
  const [aiMode, setAiMode] = useState<AIEvaluationMode>('on_submit');
  const [allowResubmission, setAllowResubmission] = useState(true);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !dueDate || !dueTime) return;
    onCreate({ name: name.trim(), due_at: `${dueDate}T${dueTime}:00`, is_group_task: isGroup, group_grading_mode: isGroup ? groupGrading : undefined, max_group_size: isGroup ? Number(maxGroupSize) : undefined, ai_evaluation_mode: aiMode, status: 'open', allow_resubmission: allowResubmission });
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`gap-2 ${highlight ? 'btn-checklist-highlight' : ''}`} variant={highlight ? 'default' : 'default'}>
          <Plus size={16} />Nueva tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader><DialogTitle>Crear tarea</DialogTitle><DialogDescription>Define qué deben entregar tus estudiantes y cuándo vence.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-5 py-2">
          <div className="space-y-2"><Label htmlFor="task-name">Nombre de la tarea</Label><Input id="task-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Mapa de procesos AS-IS" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="due-date">Fecha de vencimiento</Label><Input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="due-time">Hora de vencimiento</Label><Input id="due-time" type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></div>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] p-4">
            <div className="mb-3 flex items-center gap-2"><input id="group-task" type="checkbox" checked={isGroup} onChange={(event) => setIsGroup(event.target.checked)} className="size-4 accent-[#0077CC]" /><Label htmlFor="group-task">Permitir entrega grupal</Label></div>
            {isGroup && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="group-size">Máximo de integrantes</Label><Input id="group-size" type="number" min="2" max="10" value={maxGroupSize} onChange={(event) => setMaxGroupSize(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="group-grading">Calificación</Label><NativeSelect id="group-grading" value={groupGrading} onChange={(event) => setGroupGrading(event.target.value as GroupGradingMode)} className="w-full"><NativeSelectOption value="shared">Una nota para el grupo</NativeSelectOption><NativeSelectOption value="individual">Nota individual</NativeSelectOption></NativeSelect></div></div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-mode">Evaluación con IA</Label>
            <NativeSelect id="ai-mode" value={aiMode} onChange={(event) => setAiMode(event.target.value as AIEvaluationMode)} className="w-full">
              <NativeSelectOption value="on_submit">Evaluar automáticamente al entregar</NativeSelectOption>
              <NativeSelectOption value="on_demand">Evaluar manualmente</NativeSelectOption>
            </NativeSelect>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {aiMode === 'on_submit'
                ? '• Evaluar al entregar: La IA analiza los chats y genera el reporte formativo apenas el estudiante envía.'
                : '• Evaluar manualmente: El docente decide cuándo disparar la evaluación desde el detalle de la entrega.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input id="allow-resubmission" type="checkbox" checked={allowResubmission} onChange={(event) => setAllowResubmission(event.target.checked)} className="size-4 accent-[#0077CC]" />
            <Label htmlFor="allow-resubmission">Permitir que los estudiantes corrijan su entrega</Label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Publicar tarea</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatDueDate(task: Task) {
  if (!task.due_at) return 'Sin fecha límite';
  try {
    const d = new Date(task.due_at);
    if (isNaN(d.getTime())) return 'Sin fecha límite';
    return dueDateFormatter.format(d);
  } catch {
    return 'Sin fecha límite';
  }
}

function isTaskOverdue(task: Task): boolean {
  if (!task.due_at) return false;
  try {
    return new Date(task.due_at).getTime() < Date.now();
  } catch {
    return false;
  }
}

function isTaskClosed(task: Task): boolean {
  return task.status === 'closed' || isTaskOverdue(task);
}

function SettingsDialog({
  course,
  onSaved,
  onDeleteRequest,
}: {
  course: Course;
  onSaved: (updated: { name: string; enrollment_mode: EnrollmentMode; description?: string; is_enrollment_locked?: boolean }) => void;
  onDeleteRequest: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(course?.name || '');
  const [mode, setMode] = useState<EnrollmentMode>(course?.enrollment_mode || 'open');
  const [description, setDescription] = useState(course?.description ?? '');
  const [locked, setLocked] = useState(Boolean(course?.is_enrollment_locked));
  const client = useBackendClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(course?.name || '');
      setMode(course?.enrollment_mode || 'open');
      setDescription(course?.description ?? '');
      setLocked(Boolean(course?.is_enrollment_locked));
      setError(null);
    }
  }, [course?.name, course?.enrollment_mode, course?.description, course?.is_enrollment_locked, open]);

  const handleLockToggle = useCallback((next: boolean) => {
    setLocked(next);
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!name.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const trimmedName = name.trim();
        const trimmedDesc = description.trim() || null;
        const needsCourseUpdate = trimmedName !== course.name || mode !== course.enrollment_mode || (trimmedDesc || null) !== (course.description?.trim() || null);
        const needsLockUpdate = locked !== Boolean(course.is_enrollment_locked);
        // vercel-react-best-practices: async-parallel, no waterfalls
        const tasks: Promise<void>[] = [];
        if (needsCourseUpdate) {
          tasks.push(
            (async () => {
              const { error: err } = await client
                .from('courses')
                .update({ name: trimmedName, enrollment_mode: mode, description: trimmedDesc })
                .eq('id', course.id);
              if (err) throw new Error(err.message);
            })(),
          );
        }
        if (needsLockUpdate) {
          tasks.push(setCourseLock(client, course.id, locked));
        }
        if (tasks.length === 0) {
          setOpen(false);
          return;
        }
        await Promise.all(tasks);
        onSaved({ name: trimmedName, enrollment_mode: mode, description: description.trim(), is_enrollment_locked: locked });
        showSuccess('Curso actualizado');
        setOpen(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        showError(msg);
      } finally {
        setBusy(false);
      }
    },
    [name, mode, description, locked, client, course.id, course.name, course.enrollment_mode, course.description, course.is_enrollment_locked, onSaved],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Configurar curso">
          <Settings size={17} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Configurar curso</DialogTitle>
          <DialogDescription>Edita la información básica de tu curso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Nombre del curso</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-mode">Cómo pueden unirse</Label>
            <NativeSelect id="settings-mode" value={mode} onChange={(e) => setMode(e.target.value as EnrollmentMode)} className="w-full">
              <NativeSelectOption value="open">Cualquier estudiante con el código</NativeSelectOption>
              <NativeSelectOption value="approval">Requiere aprobación</NativeSelectOption>
              <NativeSelectOption value="whitelist">Solo estudiantes invitados</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-description">Descripción (opcional)</Label>
            <Textarea id="settings-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descripción del curso..." className="min-h-[80px]" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-white text-[#0077CC] border border-[#E2E8F0]">
                <Lock size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0F172A]">Bloquear inscripciones</p>
                <p className="text-xs text-[#64748B] leading-relaxed">Si está activo, nadie podrá unirse aunque tenga el código.</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={locked}
                disabled={busy}
                onChange={(e) => handleLockToggle(e.target.checked)}
                className="peer sr-only"
                aria-label="Bloquear inscripciones"
              />
              <div className="peer h-6 w-11 rounded-full bg-[#E2E8F0] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#0077CC] peer-checked:after:translate-x-5 peer-disabled:opacity-60" />
            </label>
          </div>
          {error && <p className="text-sm text-[#B3372F]">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button>
          </DialogFooter>
        </form>
        <div className="mt-2 border-t border-[#E2E8F0] pt-4">
          <h4 className="text-sm font-semibold text-[#B3372F]">Zona peligrosa</h4>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">Eliminar el curso borrará tareas, entregas y evaluaciones de forma permanente.</p>
          <Button
            variant="outline"
            className="mt-3 gap-2 text-xs text-[#B3372F] border-[#E8CAC7] hover:bg-[#FBEDEB] hover:text-[#922B24] hover:border-[#B3372F]"
            onClick={() => {
              setOpen(false);
              onDeleteRequest();
            }}
          >
            <Trash size={14} />
            Eliminar curso
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TasksListSectionProps {
  loading: boolean;
  isTeacher: boolean;
  sortedTasks: Task[];
  taskFilter: 'all' | 'pending' | 'submitted';
  mySubmissions: Record<string, string>;
  courseId: string;
  onFilterChange: (filter: 'all' | 'pending' | 'submitted') => void;
  actions?: React.ReactNode;
}

function TasksListSection({
  loading,
  isTeacher,
  sortedTasks,
  taskFilter,
  mySubmissions,
  courseId,
  onFilterChange,
  actions,
}: TasksListSectionProps) {
  const displayedTasks = isTeacher
    ? sortedTasks
    : sortedTasks.filter((task) => {
        if (taskFilter === 'submitted') return !!mySubmissions[task.id];
        if (taskFilter === 'pending') return !mySubmissions[task.id];
        return true;
      });

  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">{isTeacher ? 'Tareas del curso' : 'Tareas'}</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            {isTeacher ? 'Organiza las actividades y revisa las entregas.' : 'Actividades disponibles para entregar.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div className="hidden items-center gap-2 text-xs text-[#64748B] sm:flex">
            <CalendarClock size={15} />
            {sortedTasks.length} actividades
          </div>
        </div>
      </div>

      {!isTeacher && sortedTasks.length > 0 && (
        <div className="mb-3 flex gap-1">
          {(['all', 'pending', 'submitted'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                taskFilter === filter
                  ? 'bg-[#0077CC] text-white'
                  : 'bg-[#F0F3F8] text-[#334155] hover:bg-[#E2E8F0]'
              }`}
            >
              {filter === 'all' ? 'Todas' : filter === 'pending' ? 'Pendientes' : 'Entregadas'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex h-[82px] items-center gap-4 border-b border-[#E2E8F0] px-5 last:border-0">
              <div className="size-9 animate-pulse rounded-md bg-[#F0F3F8]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#F0F3F8]" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-[#F0F3F8]" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedTasks.length === 0 ? (
        <EmptyState
          title="Aún no hay tareas"
          hint={isTeacher ? 'Crea la primera tarea para tu clase.' : 'Tu docente todavía no ha publicado actividades.'}
        />
      ) : displayedTasks.length === 0 ? (
        <EmptyState
          title={taskFilter === 'submitted' ? 'No has entregado ninguna tarea' : 'No hay tareas pendientes'}
          hint={taskFilter === 'submitted' ? 'Tus entregas aparecerán aquí.' : '¡Ya entregaste todas las tareas!'}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          {displayedTasks.map((task) => (
            <Link
              key={task.id}
              to={
                isTeacher
                  ? `/courses/${courseId}/tasks/${task.id}`
                  : mySubmissions[task.id]
                    ? `/courses/${courseId}/tasks/${task.id}`
                    : `/courses/${courseId}/tasks/${task.id}/submit`
              }
              className="group flex min-h-[72px] items-center gap-4 border-b border-[#E2E8F0] px-5 py-4 last:border-0 transition-colors hover:bg-[#F8FAFD]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#E0F2FE] text-[#0077CC]">
                <ClipboardList size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold text-[#0F172A] group-hover:text-[#0077CC]">{task.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                  <CalendarClock size={13} />
                  <span>Vence {formatDueDate(task)}</span>
                  {task.is_group_task && (
                    <>
                      <span>·</span>
                      <span>Entrega grupal</span>
                    </>
                  )}
                  {isTaskClosed(task) && (
                    <>
                      <span>·</span>
                      <span className="rounded-full bg-[#FBEDEB] px-1.5 py-0.5 text-[10px] font-semibold text-[#B3372F]">Cerrada</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isTeacher && (
                  <span className="hidden text-xs font-medium text-[#0077CC] sm:inline-block">
                    Ver
                  </span>
                )}
                {!isTeacher && (
                  mySubmissions[task.id]
                    ? <CircleCheck size={16} className="shrink-0 text-[#1F7A4D]" />
                    : <Circle size={16} className="shrink-0 text-[#E2E8F0]" />
                )}
                <ChevronRight size={17} className="shrink-0 text-[#64748B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0077CC]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useBackendClient();
  const { user } = useUser();
  const { profile, refresh } = useProfileState();

  const [course, setCourse] = useState<(Course & { teacher_id: string }) | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingEnrollmentsCount, setPendingEnrollmentsCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Record<string, string>>({});
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [checklistHasInvited, setChecklistHasInvited] = useState(false);
  const { isStudentPreview, setStudentPreview, isActualTeacher, isTeacher } = useCourseRole(course?.teacher_id);

  // Invite done = opened invite modal (DB flag) OR actual students exist
  const inviteDone = checklistHasInvited || studentsCount > 0;

  const shouldHighlightInvite = useMemo(() => {
    if (!course || !isTeacher) return false;
    if (checklistDismissed) return false;
    if (inviteDone) return false;
    return studentsCount === 0;
  }, [course?.id, isTeacher, studentsCount, inviteDone, checklistDismissed]);

  const shouldHighlightTask = useMemo(() => {
    if (!course || !isTeacher) return false;
    if (checklistDismissed) return false;
    if (!inviteDone) return false;
    if (tasks.length > 0) return false;
    return tasks.length === 0;
  }, [course?.id, isTeacher, tasks.length, inviteDone, tasks.length > 0, checklistDismissed]);

  const handleInviteOpenChange = (open: boolean) => {
    setInviteModalOpen(open);
    if (open && course) {
      // Mark invited step in DB then refresh local state
      client.rpc('fn_mark_onboarding_invited').then(() => refreshChecklist()).catch(() => {});
    }
    if (!open) {
      // Refresh enrollment counts when modal closes
      void refreshStudents();
    }
  };

  const handleTaskOpenChange = (open: boolean) => {
    setTaskModalOpen(open);
  };

  const refreshTasks = useCallback(async () => {
    if (!id) return;
    setLoadingTasks(true);
    try {
      const taskData = await listTasks(client, id);
      setTasks(taskData);
    } catch { /* ignore */ }
    finally { setLoadingTasks(false); }
  }, [client, id]);

  const refreshStudents = useCallback(async () => {
    if (!id) return;
    setLoadingStudents(true);
    try {
      const enr = await listCourseEnrollments(client, id);
      setPendingEnrollmentsCount(enr.filter((e) => e.status === 'pending').length);
      setStudentsCount(enr.filter((e) => e.status === 'approved').length);
    } catch { /* ignore */ }
    finally { setLoadingStudents(false); }
  }, [client, id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const courseData = await getCourse(client, id);
      setCourse(courseData);

      if (courseData) {
        const isOwner = courseData.teacher_id === user?.id;
        const [taskRes, enrollRes] = await Promise.allSettled([
          listTasks(client, id),
          listCourseEnrollments(client, id),
        ]);

        if (taskRes.status === 'fulfilled') {
          setTasks(taskRes.value);
        }
        if (enrollRes.status === 'fulfilled') {
          setPendingEnrollmentsCount(enrollRes.value.filter((e) => e.status === 'pending').length);
          setStudentsCount(enrollRes.value.filter((e) => e.status === 'approved').length);
        }

        // Fetch submission status for students
        if (!isOwner && user?.id && taskRes.status === 'fulfilled') {
          try {
            const taskIdsList = taskRes.value.map((t) => t.id);
            const submissionsMap = await getMySubmissionsByTasks(client, taskIdsList, user.id);
            setMySubmissions(submissionsMap);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, id, user?.id]);

  useEffect(() => {
    document.title = course ? `${course.name} — AI WorkTrail` : 'AI WorkTrail';
  }, [course]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load checklist state from DB (dismissed + hasInvited)
  const refreshChecklist = useCallback(async () => {
    if (!user) return;
    const { data } = await client.rpc('fn_get_onboarding_checklist_state').maybeSingle();
    if (data) {
      setChecklistDismissed(data.dismissed ?? false);
      setChecklistHasInvited(data.has_invited ?? false);
    }
  }, [user?.id, client]);
  useEffect(() => { void refreshChecklist(); }, [refreshChecklist]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { courseId?: string } | undefined;
      if (!detail?.courseId || detail.courseId === id) void load();
    };
    window.addEventListener('awt:task-restored', handler as EventListener);
    window.addEventListener('awt:task-deleted', handler as EventListener);
    return () => {
      window.removeEventListener('awt:task-restored', handler as EventListener);
      window.removeEventListener('awt:task-deleted', handler as EventListener);
    };
  }, [load, id]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateA = a.due_at ? new Date(a.due_at).getTime() : a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.due_at ? new Date(b.due_at).getTime() : b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });
  }, [tasks]);

  const createTask = async (data: Omit<Task, 'id' | 'course_id' | 'created_at'>) => {
    if (!course) return;
    busyRef.current = true;
    setError(null);
    try {
      const created = await createTaskApi(client, {
        course_id: course.id,
        name: data.name,
        is_group_task: data.is_group_task,
        group_grading_mode: data.group_grading_mode ?? 'shared',
        ai_evaluation_mode: data.ai_evaluation_mode,
        max_group_size: data.max_group_size,
        due_date: data.due_at,
        allow_resubmission: data.allow_resubmission ?? true,
      });
      await refreshTasks();
      showTaskCreated({ taskName: data.name, taskId: created.id, courseId: course.id, navigate });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      busyRef.current = false;
    }
  };

  const handleLeave = async () => {
    if (!course || !user?.id || leaveBusy) return;
    setLeaveBusy(true);
    try {
      await leaveCourse(client, user.id, course.id);
      navigate('/courses');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLeaveBusy(false);
      setLeaveOpen(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await deleteCourse(client, course.id);
      navigate('/courses');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteBusy(false);
      setDeleteOpen(false);
    }
  };

  if (!loading && !course) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
        <AppBreadcrumb items={[{ label: 'Mis cursos', href: '/courses' }, { label: 'Curso' }]} />
        <div className="space-y-4">
          <EmptyState
            title="Curso no disponible"
            hint={error || 'No se encontró el curso o no tienes permisos para acceder a él.'}
          />
          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/courses')}>
              Volver a mis cursos
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (loading || !course) {
    return (
      <main className="page-fade mx-auto max-w-[1040px] px-6 py-8" aria-busy="true">
        <span className="sr-only">Cargando curso...</span>
        <AppBreadcrumb items={[{ label: 'Mis cursos', href: '/courses' }, { label: <Skeleton className="inline-block h-3 w-24 rounded" /> }]} />
        <section className="mb-8 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
            <div>
              <Skeleton className="mb-1 h-3 w-8 rounded" />
              <Skeleton className="h-7 w-1/3 rounded" />
            </div>
            {profile?.role === 'teacher' && (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-28 rounded" />
                <Skeleton className="h-9 w-28 rounded" />
                <Skeleton className="h-9 w-28 rounded" />
                <Skeleton className="h-9 w-9 rounded" />
              </div>
            )}
          </div>
        </section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="mt-1 h-4 w-40 rounded" />
          </div>
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex h-[82px] items-center gap-4 border-b border-[#E2E8F0] px-5 last:border-0">
              <Skeleton className="size-9 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
      <div className="flex items-center justify-between gap-4 pb-5">
        <AppBreadcrumb items={[{ label: 'Mis cursos', href: '/courses' }, { label: course.name }]} />
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
      <section className="mb-8 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-[25px] font-bold tracking-[-0.03em] text-[#0F172A]">{course.name}</h1>
            {isActualTeacher && (
              <SettingsDialog course={course} onSaved={(updated) => setCourse({ ...course, ...updated })} onDeleteRequest={() => setDeleteOpen(true)} />
            )}
          </div>
          {course.description && <p className="mt-1 text-sm text-[#334155]">{course.description}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {isTeacher && (
              <>
                <InviteModal
                  joinCode={course.join_code || ''}
                  courseId={course.id}
                  open={inviteModalOpen}
                  onOpenChange={handleInviteOpenChange}
                  hideTrigger
                  onCopied={() => {}}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={shouldHighlightInvite ? 'default' : 'outline'}
                      className={`gap-2 ${shouldHighlightInvite ? 'btn-checklist-highlight' : ''}`}
                    >
                      <Users size={16} />
                      Estudiantes
                      {pendingEnrollmentsCount > 0 && <span className="size-2 rounded-full bg-[#0077CC]" />}
                      <ChevronDown size={14} className="opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}/students`)}>
                      <Users size={14} />
                      Gestionar
                      {pendingEnrollmentsCount > 0 && (
                        <span className="ml-auto rounded-full bg-[#0077CC] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {pendingEnrollmentsCount}
                        </span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleInviteOpenChange(true)}
                      className={shouldHighlightInvite ? 'font-semibold text-[#0077CC] focus:text-[#0077CC]' : ''}
                    >
                      <Copy size={14} />
                      Invitar
                      {shouldHighlightInvite && <span className="ml-auto size-1.5 animate-pulse rounded-full bg-[#0077CC]" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {!isTeacher && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/courses/${course.id}/students`)}
              >
                <Users size={16} />
                Miembros
              </Button>
            )}
            {!isActualTeacher && (
              <Button
                variant="outline"
                className="gap-2 text-xs text-[#B3372F] border-[#E2E8F0] hover:border-[#B3372F] hover:bg-[#FBEDEB]"
                onClick={() => setLeaveOpen(true)}
              >
                <LogOut size={15} />
                Salir del curso
              </Button>
            )}
          </div>
        </div>
        {isTeacher && pendingEnrollmentsCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F8FAFD] px-6 py-3 text-xs text-[#0F172A]">
            <div className="flex items-center gap-2.5">
              <span className="flex size-2 rounded-full bg-[#0077CC]" />
              <span className="text-[#334155]">
                <strong className="text-[#0F172A] font-semibold">{pendingEnrollmentsCount} {pendingEnrollmentsCount === 1 ? 'estudiante está esperando' : 'estudiantes están esperando'}</strong> aprobación para ingresar a este curso.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/courses/${course.id}/students`)}
              className="h-7 text-xs border-[#E2E8F0] bg-white text-[#0077CC] hover:bg-[#E0F2FE] self-start sm:self-auto"
            >
              Revisar solicitudes
            </Button>
          </div>
        )}
      </section>

      {isTeacher && (
        <>
        </>
      )}

      <TasksListSection
        loading={loadingTasks}
        isTeacher={isTeacher}
        sortedTasks={sortedTasks}
        taskFilter={taskFilter}
        mySubmissions={mySubmissions}
        courseId={course.id}
        onFilterChange={setTaskFilter}
        actions={isTeacher ? (
          <TaskDialog
            onCreate={createTask}
            open={taskModalOpen}
            onOpenChange={handleTaskOpenChange}
            highlight={shouldHighlightTask}
          />
        ) : undefined}
      />

      {/* Leave course dialog (students) */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Salir del curso?</DialogTitle>
            <DialogDescription>
              Saldrás de <strong>{course?.name}</strong>. Podrás volver a unirte con el código si el docente lo permite.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLeaveOpen(false)} disabled={leaveBusy}>Cancelar</Button>
            <Button onClick={handleLeave} disabled={leaveBusy} className="bg-[#B3372F] hover:bg-[#922B24]">
              {leaveBusy ? 'Saliendo…' : 'Sí, salir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete course dialog (teacher) */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar curso?</DialogTitle>
            <DialogDescription>
              Se eliminarán <strong>todas las tareas, entregas y evaluaciones</strong> de <strong>{course?.name}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>Cancelar</Button>
            <Button onClick={handleDeleteCourse} disabled={deleteBusy} className="bg-[#B3372F] hover:bg-[#922B24]">
              {deleteBusy ? 'Eliminando…' : 'Sí, eliminar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isTeacher && (() => {
        const hasStudents = inviteDone;
        const hasTasks = tasks.length > 0;
        // Sequential: step 1 is always done (we're on the course page)
        let completedCount = 1;
        if (hasStudents) completedCount = 2;
        if (completedCount === 2 && hasTasks) completedCount = 3;
        const currentStep = !hasStudents ? 'invite' as const : !hasTasks ? 'task' as const : null;
        return (
          <TeacherOnboardingChecklist
            loading={loading}
            currentStep={currentStep}
            completedCount={completedCount}
            onDismiss={async () => {
              await client.rpc('fn_dismiss_onboarding_checklist');
              setChecklistDismissed(true);
            }}
          />
        );
      })()}
    </main>
  );
}

