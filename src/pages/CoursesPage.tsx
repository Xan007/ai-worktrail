import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeftRight, BookOpen, CheckCircle, ChevronRight, Clock, GraduationCap, Plus, Users, XCircle } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useBackendClient, useProfileState } from '@/hooks/useBackend';
import { cancelMyEnrollment, createCourse as createCourseApi, joinCourse as joinCourseApi, listMyCourses, listTasks } from '@/lib/data';
import type { Course, EnrollmentMode, Task } from '@/lib/mockdata';
import { getEnrollmentLabel } from '@/lib/mockdata';
import { TeacherOnboardingChecklist } from '@/components/TeacherOnboardingChecklist';
import { InviteModal } from '@/components/InviteModal';
import { showSuccessNoProgress } from '@/lib/toast';

function CourseRow({
  course,
  onCancelEnrollment,
}: {
  course: Course;
  onCancelEnrollment?: (courseId: string) => void;
}) {
  const isTeacher = course.role === 'teacher';
  const isPending = course.enrollment_status === 'pending';
  const isRejected = course.enrollment_status === 'rejected';

  if (isPending) {
    return (
      <div className="course-row flex min-h-[72px] flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E0EA] bg-[#F8FAFD] px-5 py-4 last:border-b-0">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#EAF1F9] text-[#1E5AA8]">
            <Clock size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-[#1A2332]">{course.name}</div>
            <div className="mt-0.5 text-[12px] font-medium text-[#1E5AA8]">Solicitud enviada (esperando aprobación)</div>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-center">
          {onCancelEnrollment && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onCancelEnrollment(course.id)}
              className="text-xs text-[#64748B] hover:text-[#B3372F] hover:bg-[#FBEDEB]/50"
            >
              Cancelar solicitud
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="course-row flex min-h-[72px] flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E0EA] bg-white px-5 py-4 last:border-b-0">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#FBEDEB] text-[#B3372F]">
            <XCircle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-[#1A2332]">{course.name}</div>
            <div className="mt-0.5 text-[12px] text-[#B3372F]">Solicitud no aprobada</div>
          </div>
        </div>
        {onCancelEnrollment && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCancelEnrollment(course.id)}
            className="text-xs text-[#64748B] hover:text-[#1A2332]"
          >
            Descartar
          </Button>
        )}
      </div>
    );
  }

  const pendingCount = course.pending_enrollments_count ?? 0;

  return (
    <Link
      to={`/courses/${course.id}`}
      className="course-row group flex min-h-[72px] items-center gap-4 border-b border-[#D9E0EA] bg-white px-5 py-4 last:border-b-0 hover:bg-[#F8FAFD]"
    >
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-md bg-[#EAF1F9] text-[#1E5AA8]">
        {isTeacher ? <BookOpen size={18} /> : <GraduationCap size={18} />}
        {isTeacher && pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1E5AA8] opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[#1E5AA8] ring-2 ring-white" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-[#1A2332] group-hover:text-[#1E5AA8]">{course.name}</div>
      </div>
      <div className="flex items-center gap-3">
        <ChevronRight className="shrink-0 text-[#8B95A5] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1E5AA8]" size={17} />
      </div>
    </Link>
  );
}

function CreateCourseDialog({
  onCreate,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  highlight,
}: {
  onCreate: (name: string, mode: EnrollmentMode, description?: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  highlight?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  const [name, setName] = useState('');
  const [mode, setMode] = useState<EnrollmentMode>('open');
  const [description, setDescription] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), mode, description.trim() || undefined);
    setName('');
    setMode('open');
    setDescription('');
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className={`gap-2 ${highlight ? 'shadow-md ring-2 ring-[#1E5AA8] ring-offset-2' : ''}`}><Plus size={16} />Crear curso</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Crear un nuevo curso</DialogTitle>
          <DialogDescription>Configura el espacio de tu clase. Podrás invitar estudiantes y gestionar inscripciones.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="course-name">Nombre del curso</Label>
            <Input id="course-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Gestión de Procesos — 2026-I" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enrollment-mode">Cómo pueden unirse los estudiantes</Label>
            <NativeSelect id="enrollment-mode" value={mode} onChange={(e) => setMode(e.target.value as EnrollmentMode)} className="w-full">
              <NativeSelectOption value="open">Cualquier estudiante con el código (Inscripción directa)</NativeSelectOption>
              <NativeSelectOption value="requires_approval">Requiere aprobación del docente (Solicitud previa)</NativeSelectOption>
              <NativeSelectOption value="whitelist">Solo estudiantes invitados por correo</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-description">Descripción (opcional)</Label>
            <Input id="course-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descripción del curso..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear curso</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinCourseDialog({ onJoin }: { onJoin: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onJoin(code.trim().toUpperCase());
    setCode('');
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" className="gap-2"><Users size={16} />Unirme a un curso</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Unirme a un curso</DialogTitle><DialogDescription>Introduce el código que te compartió tu docente.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-5 py-2">
          <div className="space-y-2"><Label htmlFor="join-code">Código de clase</Label><Input id="join-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="A3F8C2" className="font-mono uppercase tracking-wider" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Unirme</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CourseListSectionsProps {
  loading: boolean;
  activeTab: 'teacher' | 'student' | 'requests';
  teacherCourses: Course[];
  studentCourses: Course[];
  studentPendingCourses: Course[];
  studentApprovedCourses: Course[];
  studentRejectedCourses: Course[];
  onCancelEnrollment: (courseId: string) => void;
}

function CourseListSections({
  loading,
  activeTab,
  teacherCourses,
  studentCourses,
  studentPendingCourses,
  studentApprovedCourses,
  studentRejectedCourses,
  onCancelEnrollment,
}: CourseListSectionsProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[#D9E0EA]">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex h-[80px] items-center gap-4 border-b border-[#D9E0EA] px-5 last:border-0">
            <Skeleton className="size-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === 'teacher') {
    if (teacherCourses.length === 0) {
      return (
        <EmptyState
          title="Aún no dictas ningún curso"
          hint="Crea tu primer curso para empezar a compartirlo con tus estudiantes."
        />
      );
    }
    return (
      <div className="overflow-hidden rounded-lg border border-[#D9E0EA] bg-white">
        {teacherCourses.map((course) => (
          <CourseRow key={course.id} course={course} onCancelEnrollment={onCancelEnrollment} />
        ))}
      </div>
    );
  }

  if (activeTab === 'requests') {
    if (studentPendingCourses.length === 0 && studentRejectedCourses.length === 0) {
      return (
        <EmptyState
          title="No tienes solicitudes"
          hint="Cuando solicites unirte a un curso, aparecerá aquí."
        />
      );
    }
    return (
      <div className="space-y-6">
        {studentPendingCourses.length > 0 && (
          <section>
            <div className="overflow-hidden rounded-lg border border-[#D9E0EA] bg-white">
              {studentPendingCourses.map((course) => (
                <CourseRow key={course.id} course={course} onCancelEnrollment={onCancelEnrollment} />
              ))}
            </div>
          </section>
        )}
        {studentRejectedCourses.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-sm font-semibold text-[#64748B]">Solicitudes no aceptadas</h2>
            <div className="overflow-hidden rounded-lg border border-[#D9E0EA] bg-white">
              {studentRejectedCourses.map((course) => (
                <CourseRow key={course.id} course={course} onCancelEnrollment={onCancelEnrollment} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (studentApprovedCourses.length === 0) {
    return (
      <EmptyState
        title="Aún no estás inscrito en ningún curso"
        hint="Introduce el código de clase que te compartió tu docente para unirte."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#D9E0EA] bg-white">
      {studentApprovedCourses.map((course) => (
        <CourseRow key={course.id} course={course} onCancelEnrollment={onCancelEnrollment} />
      ))}
    </div>
  );
}

export function CoursesPage() {
  const { user } = useUser();
  const client = useBackendClient();
  const { profile, refresh: refreshProfile } = useProfileState();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<'teacher' | 'student' | 'requests'>('teacher');
  const hasInitializedTabRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const busyRef = useRef(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasTasksFromApi, setHasTasksFromApi] = useState(false);
  const storageKey = useMemo(() => (user?.id ? `awt_courses_activeTab_${user.id}` : 'awt_courses_activeTab'), [user?.id]);

  useEffect(() => {
    document.title = 'Mis cursos — AI WorkTrail';
  }, []);

  useEffect(() => {
    if (!hasInitializedTabRef.current) return;
    try {
      localStorage.setItem(storageKey, activeTab);
    } catch {}
  }, [activeTab, storageKey]);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await listMyCourses(client, user.id);
      setCourses(list);

      if (!hasInitializedTabRef.current) {
        try {
          const stored = localStorage.getItem(storageKey) as 'teacher' | 'student' | 'requests' | null;
          if (stored === 'teacher' || stored === 'student' || stored === 'requests') {
            const teacherCount = list.filter((c) => c.role === 'teacher').length;
            const studentPending = list.filter((c) => c.role === 'student' && c.enrollment_status === 'pending').length;
            const studentRejected = list.filter((c) => c.role === 'student' && c.enrollment_status === 'rejected').length;
            if (stored === 'requests' && studentPending === 0 && studentRejected === 0) {
              setActiveTab(teacherCount === 0 ? 'student' : 'teacher');
            } else {
              setActiveTab(stored);
            }
            hasInitializedTabRef.current = true;
            return;
          }
        } catch {}
        const teacherCount = list.filter((c) => c.role === 'teacher').length;
        if (profile?.role === 'student' && teacherCount === 0) {
          setActiveTab('student');
        } else if (profile?.role === 'teacher') {
          setActiveTab('teacher');
        } else {
          const studentCount = list.filter((c) => c.role === 'student').length;
          setActiveTab(teacherCount === 0 && studentCount > 0 ? 'student' : 'teacher');
        }
        hasInitializedTabRef.current = true;
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, user?.id, profile?.role, storageKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const teacherCourses = useMemo(() => courses.filter((c) => c.role === 'teacher'), [courses]);
  const studentCourses = useMemo(() => courses.filter((c) => c.role === 'student'), [courses]);

  const totalTeacherPending = useMemo(
    () => teacherCourses.reduce((acc, c) => acc + (c.pending_enrollments_count ?? 0), 0),
    [teacherCourses],
  );

  const studentPendingCourses = useMemo(
    () => studentCourses.filter((c) => c.enrollment_status === 'pending'),
    [studentCourses],
  );

  const studentApprovedCourses = useMemo(
    () => studentCourses.filter((c) => c.enrollment_status === 'approved'),
    [studentCourses],
  );

  const studentRejectedCourses = useMemo(
    () => studentCourses.filter((c) => c.enrollment_status === 'rejected'),
    [studentCourses],
  );

  const shouldHighlightCreate = useMemo(() => {
    if (activeTab !== 'teacher') return false;
    if (teacherCourses.length > 0) return false;
    if (loading) return false;
    try {
      if (localStorage.getItem('awt_teacher_checklist_dismissed') === 'true') return false;
    } catch {}
    if (profile?.onboarding_dismissed) return false;
    return true;
  }, [activeTab, teacherCourses.length, loading, profile?.onboarding_dismissed]);

  const hasStudentsForChecklist = useMemo(() => {
    if (teacherCourses.length === 0) return false;
    if (teacherCourses.some((c) => (c.pending_enrollments_count ?? 0) > 0)) return true;
    try {
      if (localStorage.getItem('awt_step_invited_done') === 'true') return true;
      if (
        teacherCourses.some(
          (c) => localStorage.getItem(`awt_invite_clicked_${c.id}`) === 'true' || localStorage.getItem(`awt_invited_${c.id}`) === 'true',
        )
      )
        return true;
    } catch {}
    if (profile?.onboarding_has_invited) return true;
    return false;
  }, [teacherCourses, profile?.onboarding_has_invited]);

  const hasTasksForChecklist = useMemo(() => {
    if (hasTasksFromApi) return true;
    if (teacherCourses.length === 0) return false;
    try {
      if (teacherCourses.some((c) => localStorage.getItem(`awt_task_clicked_${c.id}`) === 'true')) return true;
    } catch {}
    if (profile?.onboarding_has_created_task) return true;
    return false;
  }, [teacherCourses, hasTasksFromApi, profile?.onboarding_has_created_task]);

  useEffect(() => {
    if (teacherCourses.length === 0) {
      setHasTasksFromApi(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          teacherCourses.map((c) => listTasks(client, c.id).catch(() => [] as Task[])),
        );
        if (cancelled) return;
        const anyHasTask = results.some((arr) => Array.isArray(arr) && arr.length > 0);
        setHasTasksFromApi(anyHasTask);
      } catch {
        if (!cancelled) setHasTasksFromApi(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, teacherCourses]);

  useEffect(() => {
    if (activeTab === 'requests' && studentPendingCourses.length === 0 && studentRejectedCourses.length === 0) {
      setActiveTab('student');
    }
  }, [activeTab, studentPendingCourses.length, studentRejectedCourses.length]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 5000);
  };
  const fail = (text: string) => {
    setErrorMsg(text);
    window.setTimeout(() => setErrorMsg(null), 5000);
  };

  const createCourse = async (name: string, mode: EnrollmentMode, description?: string) => {
    if (!user) return;
    busyRef.current = true;
    try {
      const created = await createCourseApi(client, user.id, name, mode, description);
      await refreshProfile();
      try {
        localStorage.setItem(`awt_course_new_${created.id}`, 'true');
      } catch {}
      navigate(`/courses/${created.id}`);
      showSuccessNoProgress(`¡Curso "${created.name}" creado!`);
      notify(`¡Curso creado con éxito! Nombre: "${created.name}" — Código: ${created.join_code}`);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    } finally {
      busyRef.current = false;
    }
  };

  const handleCancelEnrollment = async (courseId: string) => {
    if (!user) return;
    busyRef.current = true;
    try {
      await cancelMyEnrollment(client, user.id, courseId);
      await load();
      notify('Solicitud de inscripción cancelada.');
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    } finally {
      busyRef.current = false;
    }
  };

  const joinCourse = async (code: string) => {
    if (!user) return;
    busyRef.current = true;
    try {
      const joined = await joinCourseApi(client, user.id, code);
      await load();
      setActiveTab('student');
      if (joined.status === 'pending') {
        notify(`Solicitud enviada a "${joined.name}". Esperando aprobación del docente.`);
      } else {
        notify(`Te has unido exitosamente a "${joined.name}".`);
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <main className="page-fade mx-auto max-w-[1040px] px-6 py-8" aria-busy={loading}>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#1A2332]">Mis cursos</h1>
          <p className="mt-1 text-sm text-[#4A5568]">Todo lo que enseñas y todo lo que estás aprendiendo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(activeTab === 'student' || activeTab === 'requests') && <JoinCourseDialog onJoin={joinCourse} />}
          {activeTab === 'teacher' && (
            <CreateCourseDialog
              onCreate={createCourse}
              open={createCourseOpen}
              onOpenChange={setCreateCourseOpen}
              highlight={shouldHighlightCreate}
            />
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#D9E0EA]">
        <div className="flex items-center gap-2">
          {activeTab === 'teacher' && (
            <div className="flex items-center gap-2 border-b-2 border-[#1E5AA8] px-4 py-2.5 text-sm font-semibold text-[#1E5AA8]">
              <BookOpen size={16} />
              <span>Docencia</span>
              <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-xs font-semibold text-[#1E5AA8]">{teacherCourses.length}</span>
              {totalTeacherPending > 0 && <span className="size-2 rounded-full bg-[#1E5AA8]" title={`${totalTeacherPending} solicitudes pendientes`} />}
            </div>
          )}
          {activeTab === 'student' && (
            <div className="flex items-center gap-2 border-b-2 border-[#1E5AA8] px-4 py-2.5 text-sm font-semibold text-[#1E5AA8]">
              <GraduationCap size={16} />
              <span>Inscrito</span>
              <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-xs font-semibold text-[#1E5AA8]">{studentApprovedCourses.length}</span>
            </div>
          )}
          {activeTab === 'requests' && (
            <div className="flex items-center gap-2 border-b-2 border-[#1E5AA8] px-4 py-2.5 text-sm font-semibold text-[#1E5AA8]">
              <Clock size={16} />
              <span>Solicitudes</span>
              <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 text-xs font-semibold text-[#1E5AA8]">{studentPendingCourses.length + studentRejectedCourses.length}</span>
              {studentPendingCourses.length > 0 && <span className="size-2 rounded-full bg-[#1E5AA8]" />}
            </div>
          )}
          {activeTab !== 'requests' && (studentPendingCourses.length > 0 || studentRejectedCourses.length > 0) && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#D9E0EA] bg-white px-2.5 py-1 text-xs font-medium text-[#64748B] hover:border-[#1E5AA8] hover:text-[#1E5AA8] transition-colors"
            >
              <Clock size={12} /> {studentPendingCourses.length} pendientes
            </button>
          )}
          {activeTab === 'requests' && (
            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#D9E0EA] bg-white px-2.5 py-1 text-xs font-medium text-[#64748B] hover:border-[#1E5AA8] hover:text-[#1E5AA8] transition-colors"
            >
              Volver a Inscrito
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'teacher' ? 'student' : 'teacher')}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#D9E0EA] bg-white px-3 py-1.5 text-xs font-medium text-[#64748B] transition-colors hover:border-[#1E5AA8] hover:text-[#1E5AA8]"
          title={activeTab === 'teacher' ? 'Cambiar a vista Inscrito' : 'Cambiar a vista Docencia'}
          aria-label="Intercambiar vista"
        >
          <ArrowLeftRight size={14} />
          <span>{activeTab === 'teacher' ? 'Ver Inscrito' : 'Ver Docencia'}</span>
        </button>
      </div>

      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-md border-l-[3px] border-[#1F7A4D] bg-[#E8F4EE] px-4 py-3 text-sm text-[#1A2332]">
          <CheckCircle size={16} className="shrink-0 text-[#1F7A4D]" />
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 flex items-center gap-2 rounded-md border-l-[3px] border-[#B3372F] bg-[#FBEDEB] px-4 py-3 text-sm text-[#1A2332]">
          <AlertCircle size={16} className="shrink-0 text-[#B3372F]" />
          <span>{errorMsg}</span>
        </div>
      )}

      <CourseListSections
        loading={loading}
        activeTab={activeTab}
        teacherCourses={teacherCourses}
        studentCourses={studentCourses}
        studentPendingCourses={studentPendingCourses}
        studentApprovedCourses={studentApprovedCourses}
        studentRejectedCourses={studentRejectedCourses}
        onCancelEnrollment={handleCancelEnrollment}
      />

      {activeTab === 'teacher' && (
        <TeacherOnboardingChecklist
          hasCourses={teacherCourses.length > 0}
          hasStudents={hasStudentsForChecklist}
          hasTasks={hasTasksForChecklist}
          onCreateCourse={() => setCreateCourseOpen(true)}
        />
      )}
    </main>
  );
}
