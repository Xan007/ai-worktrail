import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, GraduationCap, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackendClient, useProfileState } from '@/hooks/useBackend';
import { useStudentPreview } from '@/hooks/useRoleMode';
import { createCourse as createCourseApi, joinCourse as joinCourseApi } from '@/lib/data';

interface RoleSelectStepProps {
  onSelectRole: (role: 'teacher' | 'student') => void;
}

function RoleSelectStep({ onSelectRole }: RoleSelectStepProps) {
  return (
    <div className="rounded-xl border border-[#D9E0EA] bg-white p-6 sm:p-8 shadow-xs text-center">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1E5AA8]">Bienvenido a AI WorkTrail</p>
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#1A2332]">¿Cómo usarás la plataforma?</h1>
      <p className="mt-2 text-sm text-[#4A5568]">
        Selecciona tu rol principal para configurar tu espacio de trabajo.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelectRole('teacher')}
          className="group rounded-xl border-2 border-[#E2E8F0] bg-white p-6 text-left transition-colors hover:border-[#1E5AA8] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E5AA8]"
        >
          <div className="flex size-12 items-center justify-center rounded-lg bg-[#EAF1F9] text-[#1E5AA8] transition-colors group-hover:bg-[#1E5AA8] group-hover:text-white">
            <BookOpen size={22} />
          </div>
          <h2 className="mt-4 text-[16px] font-bold text-[#1A2332] group-hover:text-[#1E5AA8]">
            Soy docente
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
            Crear cursos, invitar estudiantes y evaluar el uso pedagógico de la IA en sus tareas.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1E5AA8]">
            <span>Continuar</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('student')}
          className="group rounded-xl border-2 border-[#E2E8F0] bg-white p-6 text-left transition-colors hover:border-[#1F7A4D] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
        >
          <div className="flex size-12 items-center justify-center rounded-lg bg-[#E8F4EE] text-[#1F7A4D] transition-colors group-hover:bg-[#1F7A4D] group-hover:text-white">
            <GraduationCap size={24} />
          </div>
          <h2 className="mt-4 text-[16px] font-bold text-[#1A2332] group-hover:text-[#1F7A4D]">
            Soy estudiante
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
            Unirme a cursos con un código de clase y compartir mis enlaces de conversaciones con Gemini.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1F7A4D]">
            <span>Continuar</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>
    </div>
  );
}

interface TeacherOnboardingStepProps {
  busy: boolean;
  courseName: string;
  error: string | null;
  onCourseNameChange: (val: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function TeacherOnboardingStep({
  busy,
  courseName,
  error,
  onCourseNameChange,
  onBack,
  onSkip,
  onSubmit,
}: TeacherOnboardingStepProps) {
  return (
    <div className="rounded-xl border border-[#D9E0EA] bg-white p-6 sm:p-8 shadow-xs">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#1A2332]"
      >
        <ArrowLeft size={14} /> Cambiar rol
      </button>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#EAF1F9] text-[#1E5AA8]">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1A2332]">Crea tu primer curso</h1>
          <p className="text-xs text-[#4A5568]">Configura el espacio donde gestionarás tus tareas y estudiantes.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="course-name" className="text-sm font-semibold text-[#1A2332]">
            Nombre de la asignatura o curso
          </Label>
          <Input
            id="course-name"
            type="text"
            autoFocus
            disabled={busy}
            value={courseName}
            onChange={(e) => onCourseNameChange(e.target.value)}
            placeholder="Ej. Inteligencia Artificial en los Negocios — 2026-I"
            className="h-11 text-sm"
          />
          <p className="text-[11px] text-[#8B95A5]">
            Podrás modificar el nombre, invitar alumnos y publicar tareas en cualquier momento.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-[#F5C2C7] bg-[#FBEDEB] p-3 text-xs text-[#B3372F]">
            {error}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onSkip}
            className="text-xs text-[#64748B] hover:text-[#1A2332] order-2 sm:order-1"
          >
            Omitir por ahora e ir al panel
          </Button>
          <Button
            type="submit"
            disabled={busy || !courseName.trim()}
            className="gap-2 h-10 px-5 text-xs font-semibold order-1 sm:order-2"
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Creando curso...
              </>
            ) : (
              <>
                Crear curso y comenzar <ArrowRight size={15} />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface StudentOnboardingStepProps {
  busy: boolean;
  joinCode: string;
  error: string | null;
  onJoinCodeChange: (val: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function StudentOnboardingStep({
  busy,
  joinCode,
  error,
  onJoinCodeChange,
  onBack,
  onSkip,
  onSubmit,
}: StudentOnboardingStepProps) {
  return (
    <div className="rounded-xl border border-[#D9E0EA] bg-white p-6 sm:p-8 shadow-xs">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#1A2332]"
      >
        <ArrowLeft size={14} /> Cambiar rol
      </button>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#E8F4EE] text-[#1F7A4D]">
          <UserPlus size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1A2332]">¿Tienes un código de clase?</h1>
          <p className="text-xs text-[#4A5568]">Ingresa el código proporcionado por tu docente para unirte de inmediato.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="join-code" className="text-sm font-semibold text-[#1A2332]">
            Código de clase (6 u 8 caracteres)
          </Label>
          <Input
            id="join-code"
            type="text"
            autoFocus
            disabled={busy}
            maxLength={16}
            value={joinCode}
            onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
            placeholder="Ej. A3F8C2"
            className="h-11 font-mono uppercase tracking-widest text-sm"
          />
          <p className="text-[11px] text-[#8B95A5]">
            Si tu docente no te ha compartido un código aún, puedes unirte más tarde desde tu panel.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-[#F5C2C7] bg-[#FBEDEB] p-3 text-xs text-[#B3372F]">
            {error}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onSkip}
            className="text-xs text-[#64748B] hover:text-[#1A2332] order-2 sm:order-1"
          >
            Aún no tengo código, ir a mis clases
          </Button>
          <Button
            type="submit"
            disabled={busy || !joinCode.trim()}
            className="gap-2 h-10 px-5 text-xs font-semibold order-1 sm:order-2 bg-[#1F7A4D] hover:bg-[#18633e]"
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Verificando código...
              </>
            ) : (
              <>
                Unirme a la clase <ArrowRight size={15} />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const client = useBackendClient();
  const { profile, loading: profileLoading, setProfile, refresh } = useProfileState();
  const { setStudentPreview } = useStudentPreview();

  // Si ya tiene perfil, no mostrar onboarding de nuevo
  useEffect(() => {
    if (!profileLoading && profile) {
      navigate('/courses', { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);

  // Form states for step 2
  const [courseName, setCourseName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Bienvenido a AI WorkTrail';
  }, []);

  async function saveUserProfile(role: 'teacher' | 'student') {
    if (!user) throw new Error('No se encontró el usuario activo.');
    const provider = user.externalAccounts.some((a) => a.provider.includes('google')) ? 'google' : 'email';
    const fullName = user.fullName?.trim() || [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const clerkEmail = user.primaryEmailAddress?.emailAddress?.trim() ?? '';
    const emailPrefix = clerkEmail ? clerkEmail.split('@')[0] : '';
    const resolvedName = fullName || user.username?.trim() || emailPrefix || (role === 'teacher' ? 'Docente' : 'Estudiante');

    // Guarda primero en localStorage (acceso inmediato, resuelve atascamiento) y luego en DB
    try {
      localStorage.setItem(`awt_user_role_${user.id}`, role);
      localStorage.setItem(`awt_onboarding_done_${user.id}`, 'true');
      localStorage.setItem(`awt_profile_${user.id}`, JSON.stringify({ id: user.id, role, name: resolvedName, email: clerkEmail }));
    } catch {}
    setProfile({
      id: user.id,
      role,
      name: resolvedName,
      email: clerkEmail,
      onboarding_dismissed: false,
      onboarding_has_invited: false,
      onboarding_has_created_task: false,
    });
    setStudentPreview(false);

    const profileRow: Record<string, unknown> = {
      id: user.id,
      email: clerkEmail,
      name: resolvedName,
      provider,
      role,
      onboarding_dismissed: false,
      onboarding_has_invited: false,
      onboarding_has_created_task: false,
    };

    try {
      let { error: err } = await client.from('users').upsert(profileRow);
      if (err && err.message.includes('onboarding')) {
        const fallback: Record<string, unknown> = {
          id: user.id,
          email: clerkEmail,
          name: resolvedName,
          provider,
          role,
        };
        const retry = await client.from('users').upsert(fallback);
        err = retry.error;
      }
      if (err) {
        console.warn('No se pudo guardar en DB, usando localStorage:', err.message);
      } else {
        // Sincroniza perfil desde DB en segundo plano
        void refresh();
      }
    } catch (e) {
      console.warn('Error guardando perfil en DB, usando localStorage:', e);
    }
    return profileRow;
  }

  function handleSelectRole(role: 'teacher' | 'student') {
    setSelectedRole(role);
    setError(null);
    setStep(2);
  }

  async function handleTeacherSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = courseName.trim();
    if (!trimmed) {
      setError('Por favor ingresa un nombre para tu curso.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await saveUserProfile('teacher');
      const newCourse = await createCourseApi(client, user.id, trimmed, 'open');
      try {
        localStorage.setItem(`awt_course_new_${newCourse.id}`, 'true');
      } catch {}
      navigate(`/courses/${newCourse.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function handleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) {
      setError('Por favor ingresa el código que te compartió tu docente.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await saveUserProfile('student');
      const result = await joinCourseApi(client, user.id, trimmed);
      if (result.status === 'approved') {
        navigate(`/courses/${result.courseId}`, { replace: true });
      } else {
        navigate('/courses', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function handleSkip() {
    const role = selectedRole;
    if (!role) {
      setError('Selecciona un rol antes de continuar.');
      return;
    }
    if (!user) {
      setError('No se encontró el usuario activo. Recarga la página e intenta de nuevo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveUserProfile(role);
      await new Promise((r) => setTimeout(r, 300));
      navigate('/courses', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (profileLoading) {
    return (
      <main className="page-fade flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#1E5AA8]" size={24} />
      </main>
    );
  }
  if (profile) return null;

  return (
    <main
      className="page-fade"
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: 580, width: '100%' }}>
        {/* Indicador de pasos */}
        <div className="mb-6 flex items-center justify-center gap-2 text-xs font-semibold text-[#8B95A5]">
          <span className={`flex size-6 items-center justify-center rounded-full ${step === 1 ? 'bg-[#1E5AA8] text-white' : 'bg-[#E8F4EE] text-[#1F7A4D]'}`}>
            {step === 2 ? <CheckCircle2 size={14} /> : '1'}
          </span>
          <span className={step === 1 ? 'text-[#1A2332]' : 'text-[#8B95A5]'}>Rol</span>
          <span className="text-[#D9E0EA]">———</span>
          <span className={`flex size-6 items-center justify-center rounded-full ${step === 2 ? 'bg-[#1E5AA8] text-white' : 'bg-[#F0F3F8] text-[#8B95A5]'}`}>
            2
          </span>
          <span className={`${step === 2 ? 'text-[#1A2332]' : 'text-[#8B95A5]'} min-w-[42px] text-center transition-colors duration-150`}>
            Curso
          </span>
        </div>

        {step === 1 && <RoleSelectStep onSelectRole={handleSelectRole} />}

        {step === 2 && selectedRole === 'teacher' && (
          <TeacherOnboardingStep
            busy={busy}
            courseName={courseName}
            error={error}
            onCourseNameChange={(val) => {
              setCourseName(val);
              setError(null);
            }}
            onBack={() => {
              setStep(1);
              setError(null);
            }}
            onSkip={handleSkip}
            onSubmit={handleTeacherSubmit}
          />
        )}

        {step === 2 && selectedRole === 'student' && (
          <StudentOnboardingStep
            busy={busy}
            joinCode={joinCode}
            error={error}
            onJoinCodeChange={(val) => {
              setJoinCode(val);
              setError(null);
            }}
            onBack={() => {
              setStep(1);
              setError(null);
            }}
            onSkip={handleSkip}
            onSubmit={handleStudentSubmit}
          />
        )}
      </div>
    </main>
  );
}
