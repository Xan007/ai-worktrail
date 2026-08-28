import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Lock, ShieldAlert, Sparkles, UserPlus } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useBackendClient } from '@/hooks/useBackend';
import { cancelMyEnrollment, getCoursePreview, joinCourse, type CoursePreviewInfo } from '@/lib/data';
import { showError } from '@/lib/toast';

export function JoinPage() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const client = useBackendClient();
  const { user, isSignedIn, isLoaded } = useUser();

  const [inputCode, setInputCode] = useState(routeCode ? routeCode.toUpperCase() : '');
  const [courseInfo, setCourseInfo] = useState<CoursePreviewInfo | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<{ status: 'pending' | 'approved'; name: string; courseId: string } | null>(null);

  useEffect(() => {
    document.title = 'Unirse a un curso — AI WorkTrail';
  }, []);

  const searchPreview = useCallback(async (codeToLookup: string) => {
    const trimmed = codeToLookup.trim();
    if (!trimmed) {
      setCourseInfo(null);
      return;
    }
    setLoadingPreview(true);
    setErrorMsg(null);
    try {
      const preview = await getCoursePreview(client, trimmed);
      setCourseInfo(preview);
      if (!preview) {
        setErrorMsg('No encontramos ningún curso con ese código.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setCourseInfo(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [client]);

  useEffect(() => {
    if (routeCode) {
      void searchPreview(routeCode);
    }
  }, [routeCode, searchPreview]);

  const isLocked = useMemo(() => Boolean(courseInfo?.is_enrollment_locked), [courseInfo?.is_enrollment_locked]);

  const handleManualSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputCode.trim()) {
        void searchPreview(inputCode.trim());
      }
    },
    [inputCode, searchPreview],
  );

  const handleJoin = useCallback(async () => {
    const targetCode = inputCode.trim() || routeCode;
    if (!targetCode) return;
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      const redirectUrl = encodeURIComponent(`/join/${encodeURIComponent(targetCode.trim())}`);
      navigate(`/login?redirect_url=${redirectUrl}`);
      return;
    }
    if (courseInfo?.is_enrollment_locked) {
      const msg = 'Inscripciones bloqueadas';
      setErrorMsg(msg);
      showError(msg);
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await joinCourse(client, user.id, targetCode);
      setJoinResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      if (msg.includes('Inscripciones bloqueadas') || msg.toLowerCase().includes('bloquead')) showError(msg);
    } finally {
      setBusy(false);
    }
  }, [inputCode, routeCode, isLoaded, isSignedIn, user, courseInfo?.is_enrollment_locked, client, navigate]);

  const handleCancelPending = useCallback(async () => {
    if (!joinResult && !courseInfo) return;
    const targetCourseId = joinResult?.courseId ?? courseInfo?.course_id;
    if (!targetCourseId || !user) return;
    setBusy(true);
    try {
      await cancelMyEnrollment(client, user.id, targetCourseId);
      setJoinResult(null);
      navigate('/courses');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setBusy(false);
    }
  }, [joinResult, courseInfo, user, client, navigate]);

  return (
    <main className="page-fade mx-auto max-w-[560px] px-6 py-12">
      <div className="mb-6">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B95A5] hover:text-[#1A2332]"
        >
          <ArrowLeft size={14} /> Volver a mis cursos
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#D9E0EA] bg-white shadow-sm">
        <div className="border-b border-[#D9E0EA] bg-[#F8FAFD] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#EAF1F9] text-[#1E5AA8]">
              <UserPlus size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#1A2332]">Unirme a un curso</h1>
              <p className="text-xs text-[#4A5568]">
                Ingresa a la clase compartida por tu docente para enviar tus tareas.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!courseInfo && !joinResult && (
            <form onSubmit={handleManualSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code-input">Código de clase</Label>
                <div className="flex gap-2">
                  <Input
                    id="code-input"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.toUpperCase());
                      setErrorMsg(null);
                    }}
                    placeholder="Ej. A3F8C2"
                    maxLength={16}
                    className="font-mono text-base uppercase tracking-wider"
                    autoFocus
                  />
                  <Button type="submit" disabled={loadingPreview || !inputCode.trim()}>
                    {loadingPreview ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {loadingPreview && (
            <div className="space-y-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFD] p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border-l-4 border-[#B3372F] bg-[#FBEDEB] p-4 text-sm text-[#1A2332] flex items-start gap-3">
              <ShieldAlert size={18} className="text-[#B3372F] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#B3372F]">Aviso</p>
                <p className="text-xs text-[#4A5568] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {courseInfo && !joinResult && (
            <div className="space-y-5">
              <div className="rounded-lg border border-[#D9E0EA] bg-[#F8FAFD] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block rounded bg-[#EAF1F9] px-2 py-0.5 text-[11px] font-semibold text-[#1E5AA8] mb-2">
                      Curso encontrado
                    </span>
                    <h2 className="text-base font-bold text-[#1A2332]">{courseInfo.name}</h2>
                    {courseInfo.is_enrollment_locked && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#4A5568]">
                        <span className="flex items-center gap-1 text-[#B3372F] font-semibold">
                          <Lock size={14} /> Inscripciones bloqueadas
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {courseInfo.enrollment_mode === 'requires_approval' && (
                  <div className="mt-4 rounded-md border border-[#F5DCB7] bg-[#FBF3E7] p-3 text-xs text-[#B45309]">
                    Este curso requiere que el docente apruebe tu solicitud antes de poder ver las tareas.
                  </div>
                )}

                {courseInfo.enrollment_mode === 'whitelist' && (
                  <div className="mt-4 rounded-md border border-[#E0E7FF] bg-[#EEF2FF] p-3 text-xs text-[#3730A3]">
                    Tu correo ({user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress}) será verificado con la lista o dominio institucional del curso.
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCourseInfo(null);
                    setErrorMsg(null);
                    if (routeCode) navigate('/join');
                  }}
                  disabled={busy}
                >
                  Buscar otro
                </Button>
                {!isLoaded ? null : !isSignedIn ? (
                  <Button onClick={() => void handleJoin()} className="gap-2">
                    <UserPlus size={16} />
                    Iniciar sesión para unirme
                  </Button>
                ) : (
                  <Button
                    onClick={() => void handleJoin()}
                    disabled={busy || isLocked}
                    title={isLocked ? 'Inscripciones bloqueadas' : undefined}
                    className="gap-2"
                  >
                    <Sparkles size={16} />
                    {busy ? 'Inscribiendo...' : 'Confirmar e inscribirme'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {joinResult && (
            <div className="text-center space-y-4 py-4">
              {joinResult.status === 'approved' ? (
                <>
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#E8F4EE] text-[#1F7A4D]">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1A2332]">¡Ya eres parte de {joinResult.name}!</h2>
                    <p className="mt-1 text-xs text-[#4A5568]">
                      Tu inscripción fue aprobada de forma inmediata. Ya puedes acceder al contenido y tareas.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button onClick={() => navigate(`/courses/${joinResult.courseId}`)}>
                      Ir al curso
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FBF3E7] text-[#B45309]">
                    <Clock size={28} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1A2332]">Solicitud enviada a {joinResult.name}</h2>
                    <p className="mt-1 text-xs text-[#4A5568]">
                      Tu solicitud quedó en estado <strong>pendiente</strong>. El docente la revisará para darte acceso al curso.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <Button variant="outline" onClick={() => void handleCancelPending()} disabled={busy}>
                      {busy ? 'Cancelando...' : 'Cancelar mi solicitud'}
                    </Button>
                    <Button onClick={() => navigate('/courses')}>
                      Ver mis cursos
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
