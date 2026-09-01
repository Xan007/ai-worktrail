import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, CheckCircle, Crown, Lock, RotateCcw, Trash2, UserCheck, UserX, Users, X } from 'lucide-react';
import { showError, showSuccess } from '@/lib/toast';
import { useUser } from '@clerk/clerk-react';
import { AppBreadcrumb } from '@/components/AppBreadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { InviteModal } from '@/components/InviteModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useBackendClient, useProfileState } from '@/hooks/useBackend';
import { useCourseRole } from '@/hooks/useRoleMode';
import {
  assignMonitor,
  getCourse,
  listCourseEnrollments,
  removeEnrollment,
  setEnrollmentStatus,
  type EnrollmentView,
} from '@/lib/data';

interface RowProps {
  enrollment: EnrollmentView;
  canManage: boolean;
  courseId: string;
  onRefresh: () => void;
  onMessage?: (msg: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'ES').toUpperCase();
}

function EnrollmentRow({ enrollment, canManage, courseId, onRefresh, onMessage, selected, onToggleSelect }: RowProps) {
  const client = useBackendClient();
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [confirmLabel, setConfirmLabel] = useState<string | null>(null);
  const pendingRunRef = useRef<(() => Promise<void>) | null>(null);

  const isSelf = user?.id === enrollment.user.id;
  const displayName = enrollment.user.name?.trim() || (enrollment.user.email ? enrollment.user.email.split('@')[0] : 'Estudiante');
  const initials = getInitials(displayName);

  function ask(label: string, run: () => Promise<void>) {
    setConfirmLabel(label);
    pendingRunRef.current = run;
  }

  async function executeConfirmed() {
    if (!pendingRunRef.current) return;
    const label = confirmLabel ?? '';
    setBusy(true);
    try {
      await pendingRunRef.current();
      onRefresh();
      if (label.includes('monitor')) {
        showSuccess(label.includes('Quitar') ? 'Rol de monitor retirado' : 'Monitor asignado correctamente');
      } else if (label.toLowerCase().includes('expulsar')) {
        showSuccess('Estudiante expulsado del curso');
      } else if (label) {
        showSuccess('Acción completada');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setConfirmLabel(null);
      pendingRunRef.current = null;
    }
  }

  const handleQuickApprove = async () => {
    setBusy(true);
    try {
      await setEnrollmentStatus(client, enrollment.enrollment_id, 'approved');
      showSuccess(`Inscripción de ${displayName} aprobada`);
      onMessage?.(`Inscripción de ${displayName} aprobada exitosamente.`);
      onRefresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleQuickReject = async () => {
    ask(`¿Rechazar la solicitud de inscripción de "${displayName}"?`, async () => {
      await setEnrollmentStatus(client, enrollment.enrollment_id, 'rejected');
      onMessage?.(`Solicitud de ${displayName} rechazada.`);
    });
  };

  const avatarUrl = (enrollment.user as { avatar_url?: string | null }).avatar_url ?? null;

  return (
    <div className='flex min-h-[72px] items-center gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4 last:border-b-0 hover:bg-[#F8FAFD]'>
      {canManage && enrollment.status === 'pending' && onToggleSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={() => onToggleSelect(enrollment.enrollment_id)}
          className="size-4 shrink-0 accent-[#0077CC]"
          aria-label={`Seleccionar ${displayName}`}
        />
      )}
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName} className='size-10 shrink-0 rounded-md object-cover border border-[#E2E8F0]' />
      ) : (
        <span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-[#E0F2FE] text-sm font-semibold text-[#0077CC]'>
          {initials}
        </span>
      )}
      <div className='min-w-0 flex-1'>
        <div className='truncate text-[15px] font-semibold text-[#0F172A]'>{displayName}</div>
        {enrollment.user.email && (
          <div className='truncate text-xs text-[#64748B]'>{enrollment.user.email}</div>
        )}
      </div>

      {(enrollment.user.userRole === 'monitor' || (enrollment.user as unknown as { role?: string }).role === 'monitor') && (
        <span className='rounded-md bg-[#E0F2FE] px-2.5 py-1 text-[12px] font-medium text-[#0077CC]'>Monitor</span>
      )}

      {canManage && enrollment.status === 'pending' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void handleQuickReject()}
            className="h-8 text-xs font-medium text-[#64748B] hover:text-[#B3372F] hover:bg-[#FBEDEB]/50"
          >
            Rechazar
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void handleQuickApprove()}
            className="h-8 text-xs font-semibold bg-[#0077CC] hover:bg-[#0066B3] text-white"
          >
            Aprobar
          </Button>
        </div>
      )}

      {canManage && enrollment.status === 'rejected' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              ask(`¿Aceptar ahora a ${displayName} en el curso?`, async () => {
                await setEnrollmentStatus(client, enrollment.enrollment_id, 'approved');
                onMessage?.(`Inscripción de ${displayName} aceptada.`);
              })
            }
            className="h-8 gap-1 text-xs text-[#0077CC]"
          >
            <RotateCcw size={13} />
            Aprobar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              ask(`¿Eliminar el registro de ${displayName}?`, async () => {
                await removeEnrollment(client, enrollment.enrollment_id);
                onMessage?.(`Registro de ${displayName} eliminado.`);
              })
            }
            className="h-8 text-xs text-[#64748B] hover:text-[#B3372F]"
            title="Eliminar registro"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )}

      {canManage && !isSelf && enrollment.status === 'approved' && (
        <div className='flex flex-wrap items-center justify-end gap-2'>
          {(enrollment.user.userRole === 'student' || (enrollment.user as unknown as { role?: string }).role === 'student') && (
            <Button
              size='sm'
              variant='outline'
              disabled={busy}
              onClick={() =>
                ask(`¿Asignar rol de monitor a ${displayName}?`, () =>
                  assignMonitor(client, courseId, enrollment.user.id, true),
                )
              }
              className="h-8 text-xs"
            >
              Hacer monitor
            </Button>
          )}
          {(enrollment.user.userRole === 'monitor' || (enrollment.user as unknown as { role?: string }).role === 'monitor') && (
            <Button
              size='sm'
              variant='outline'
              disabled={busy}
              onClick={() =>
                ask(`¿Quitar el rol de monitor a ${displayName}?`, () =>
                  assignMonitor(client, courseId, enrollment.user.id, false),
                )
              }
              className="h-8 text-xs"
            >
              Quitar monitor
            </Button>
          )}
          <Button
            size='sm'
            variant='ghost'
            disabled={busy}
            onClick={() => ask(`¿Expulsar a "${displayName}" del curso?`, () => removeEnrollment(client, enrollment.enrollment_id))}
            className="h-8 text-xs text-[#64748B] hover:text-[#B3372F]"
          >
            Expulsar
          </Button>
        </div>
      )}

      <Dialog open={confirmLabel !== null} onOpenChange={(o) => !o && setConfirmLabel(null)}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-[440px]'>
          <DialogHeader>
            <DialogTitle>Confirmar acción</DialogTitle>
            <DialogDescription>{confirmLabel}</DialogDescription>
          </DialogHeader>
          <DialogFooter className='flex-wrap gap-2'>
            <Button type='button' variant='outline' onClick={() => setConfirmLabel(null)}>
              Cancelar
            </Button>
            <Button type='button' disabled={busy} onClick={() => void executeConfirmed()}>
              {busy ? 'Aplicando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StudentsPage() {
  const { id } = useParams();
  const client = useBackendClient();
  const { user } = useUser();
  const { profile } = useProfileState();

  const [courseName, setCourseName] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<{ id: string; name: string; email: string; avatar_url?: string | null } | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [isEnrollmentLocked, setIsEnrollmentLocked] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Estudiantes — AI WorkTrail';
  }, []);

  const notify = (msg: string) => {
    setMessage(msg);
    showSuccess(msg);
    window.setTimeout(() => setMessage(null), 4500);
  };

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);
    try {
      const [courseData, rows] = await Promise.all([
        getCourse(client, id),
        listCourseEnrollments(client, id),
      ]);
      setCourseName(courseData?.name ?? null);
      setTeacherId(courseData?.teacher_id ?? null);
      setJoinCode(courseData?.join_code ?? '');
      setIsEnrollmentLocked(Boolean(courseData?.is_enrollment_locked));
      setEnrollments(rows);
      if (courseData?.teacher_id) {
        const { data: tData } = await client.from('users').select('id, name, email, avatar_url').eq('id', courseData.teacher_id).maybeSingle();
        if (tData) setTeacher(tData as { id: string; name: string; email: string; avatar_url?: string | null });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const { isStudentPreview, canManage } = useCourseRole(teacherId);

  const pending = useMemo(() => enrollments.filter((e) => e.status === 'pending'), [enrollments]);
  const approved = useMemo(() => enrollments.filter((e) => e.status === 'approved'), [enrollments]);
  const rejected = useMemo(() => enrollments.filter((e) => e.status === 'rejected'), [enrollments]);

  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelectPending = useCallback((id: string) => {
    setSelectedPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllPending = useCallback(() => {
    if (selectedPendingIds.size === pending.length) setSelectedPendingIds(new Set());
    else setSelectedPendingIds(new Set(pending.map((p) => p.enrollment_id)));
  }, [pending, selectedPendingIds.size]);

  const handleBulk = useCallback(
    async (action: 'approved' | 'rejected') => {
      if (selectedPendingIds.size === 0) return;
      setBulkBusy(true);
      try {
        await Promise.all(Array.from(selectedPendingIds).map((eid) => setEnrollmentStatus(client, eid, action)));
        showSuccess(`${selectedPendingIds.size} solicitudes ${action === 'approved' ? 'aprobadas' : 'rechazadas'}`);
        setSelectedPendingIds(new Set());
        await load();
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      } finally {
        setBulkBusy(false);
      }
    },
    [selectedPendingIds, client, load],
  );

  useEffect(() => {
    setSelectedPendingIds((prev) => {
      const valid = new Set(pending.map((p) => p.enrollment_id));
      const next = new Set<string>();
      prev.forEach((id) => { if (valid.has(id)) next.add(id); });
      return next;
    });
  }, [pending]);

  const pageTitle = canManage ? 'Estudiantes' : 'Miembros';
  const pageDescription = canManage ? (
    <>Gestiona quién participa en {courseName ? `"${courseName}"` : 'este curso'}.</>
  ) : (
    <>Personas en {courseName ? `"${courseName}"` : 'este curso'}.</>
  );

  return (
    <main className='page-fade mx-auto max-w-[1040px] px-6 py-8'>
      <AppBreadcrumb
        items={[
          { label: 'Mis cursos', href: '/courses' },
          { label: courseName ?? 'Curso', href: `/courses/${id}` },
          { label: pageTitle },
        ]}
      />

      <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start'>
        <div>
          <h1 className='text-[26px] font-bold tracking-[-0.03em] text-[#0F172A]'>{pageTitle}</h1>
          <p className='mt-1 text-sm text-[#334155]'>{pageDescription}</p>
        </div>
        {canManage && joinCode && <InviteModal joinCode={joinCode} />}
      </div>

      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-md border-l-[3px] border-[#1F7A4D] bg-[#E8F4EE] px-4 py-3 text-sm text-[#0F172A]">
          <CheckCircle size={16} className="shrink-0 text-[#1F7A4D]" />
          <span>{message}</span>
        </div>
      )}

      {isEnrollmentLocked && !loading && (
        <div className="mb-5 flex items-center gap-2 rounded-md border border-[#E8CAC7] bg-[#FBEDEB] px-4 py-3 text-sm text-[#922B24]">
          <Lock size={16} className="shrink-0 text-[#B3372F]" />
          <span className="font-semibold">Inscripciones bloqueadas</span>
          <span className="text-[#64748B]">— nadie puede unirse a este curso mientras el bloqueo esté activo.</span>
        </div>
      )}

      {error && (
        <p className='mb-5 rounded-md border-l-[3px] border-[#B3372F] bg-[#FBEDEB] px-4 py-3 text-sm text-[#0F172A]'>{error}</p>
      )}

      {loading ? (
        <div className='space-y-6'>
          {/* Pending section skeleton */}
          <section>
            <div className='mb-2.5 flex items-center gap-2'>
              <Skeleton className='h-5 w-40 rounded' />
              <Skeleton className='h-5 w-8 rounded-full' />
            </div>
            <div className='overflow-hidden rounded-lg border border-[#E2E8F0]'>
              {[1, 2, 3].map((i) => (
                <div key={i} className='flex min-h-[72px] items-center gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4 last:border-b-0'>
                  <Skeleton className='size-4 shrink-0 rounded' />
                  <Skeleton className='size-10 shrink-0 rounded-md' />
                  <div className='min-w-0 flex-1 space-y-2'>
                    <Skeleton className='h-4 w-1/3 rounded' />
                    <Skeleton className='h-3 w-1/2 rounded' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-8 w-20 rounded' />
                    <Skeleton className='h-8 w-20 rounded' />
                  </div>
                </div>
              ))}
            </div>
          </section>
          {/* Approved section skeleton */}
          <section>
            <div className='mb-2.5 flex items-center gap-2'>
              <Skeleton className='h-5 w-32 rounded' />
              <Skeleton className='h-5 w-8 rounded-full' />
            </div>
            <div className='overflow-hidden rounded-lg border border-[#E2E8F0]'>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className='flex min-h-[72px] items-center gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4 last:border-b-0'>
                  <Skeleton className='size-10 shrink-0 rounded-md' />
                  <div className='min-w-0 flex-1 space-y-2'>
                    <Skeleton className='h-4 w-1/4 rounded' />
                    <Skeleton className='h-3 w-1/3 rounded' />
                  </div>
                  <Skeleton className='h-8 w-16 rounded' />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className='space-y-6'>
          {/* Sección del Docente (Visible para todos: docentes y estudiantes) */}
          {teacher && (
            <section>
              <h2 className='mb-2.5 flex items-center gap-2 text-base font-semibold text-[#0F172A]'>
                <Crown size={17} className="text-[#0077CC]" />
                Docente
              </h2>
              <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs'>
                <div className='flex min-h-[72px] items-center gap-4 bg-white px-5 py-4'>
                  {teacher.avatar_url ? (
                    <img src={teacher.avatar_url} alt={teacher.name} className='size-11 shrink-0 rounded-full object-cover border border-[#CBD5E1]' />
                  ) : (
                    <span className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E0F2FE] text-sm font-bold text-[#0077CC]'>
                      {getInitials(teacher.name)}
                    </span>
                  )}
                  <div className='min-w-0 flex-1 space-y-0.5'>
                    <div className='truncate text-[15px] font-bold text-[#0F172A]'>{teacher.name}</div>
                    {teacher.email && <div className='truncate text-xs text-[#64748B] font-mono'>{teacher.email}</div>}
                  </div>
                  <span className='rounded-md bg-[#E0F2FE] px-2.5 py-1 text-xs font-semibold text-[#0077CC]'>Profesor titular</span>
                </div>
              </div>
            </section>
          )}

          {canManage ? (
            enrollments.length === 0 ? (
              <EmptyState
                title='Aún no hay inscripciones'
                hint='Comparte el código de clase para que tus estudiantes se unan.'
              />
            ) : (
              <div className='space-y-6'>
                {pending.length > 0 && (
                  <section>
                    <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className='flex items-center gap-2 text-base font-semibold text-[#0F172A]'>
                        <Users size={17} className="text-[#0077CC]" />
                        Solicitudes pendientes
                        <span className='rounded-full bg-[#E0F2FE] px-2 py-0.5 text-xs font-semibold text-[#0077CC]'>
                          {pending.length}
                        </span>
                      </h2>
                      {canManage && (
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-medium text-[#334155]">
                            <input
                              type="checkbox"
                              checked={selectedPendingIds.size === pending.length && pending.length > 0}
                              onChange={toggleSelectAllPending}
                              className="size-4 accent-[#0077CC]"
                            />
                            Seleccionar todos
                          </label>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={bulkBusy || selectedPendingIds.size === 0}
                            onClick={() => void handleBulk('approved')}
                            className="h-7 text-xs"
                          >
                            Aprobar ({selectedPendingIds.size})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={bulkBusy || selectedPendingIds.size === 0}
                            onClick={() => void handleBulk('rejected')}
                            className="h-7 text-xs text-[#B3372F] border-[#E8CAC7] hover:bg-[#FBEDEB] hover:text-[#B3372F]"
                          >
                            Rechazar ({selectedPendingIds.size})
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs'>
                      {pending.map((enrollment) => (
                        <EnrollmentRow
                          key={enrollment.enrollment_id}
                          enrollment={enrollment}
                          canManage={canManage}
                          courseId={id ?? ''}
                          onRefresh={load}
                          onMessage={notify}
                          selected={selectedPendingIds.has(enrollment.enrollment_id)}
                          onToggleSelect={toggleSelectPending}
                        />
                      ))}
                    </div>
                  </section>
                )}
                <section>
                  <h2 className='mb-2.5 text-base font-semibold text-[#0F172A] flex items-center gap-2'>
                    <UserCheck size={17} className="text-[#1F7A4D]" />
                    Estudiantes inscritos{' '}
                    <span className='rounded-full bg-[#E8F4EE] px-2 py-0.5 text-xs font-semibold text-[#1F7A4D]'>{approved.length}</span>
                  </h2>
                  {approved.length === 0 ? (
                    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#64748B]">
                      Sin estudiantes activos por el momento.
                    </div>
                  ) : (
                    <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs'>
                      {approved.map((enrollment) => (
                        <EnrollmentRow
                          key={enrollment.enrollment_id}
                          enrollment={enrollment}
                          canManage={canManage}
                          courseId={id ?? ''}
                          onRefresh={load}
                          onMessage={notify}
                        />
                      ))}
                    </div>
                  )}
                </section>
                {rejected.length > 0 && (
                  <section>
                    <h2 className='mb-2.5 text-base font-semibold text-[#64748B] flex items-center gap-2'>
                      <UserX size={17} className="text-[#64748B]" />
                      Solicitudes no aceptadas{' '}
                      <span className='rounded-full bg-[#F0F3F8] px-2 py-0.5 text-xs font-semibold text-[#64748B]'>{rejected.length}</span>
                    </h2>
                    <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs'>
                      {rejected.map((enrollment) => (
                        <EnrollmentRow
                          key={enrollment.enrollment_id}
                          enrollment={enrollment}
                          canManage={canManage}
                          courseId={id ?? ''}
                          onRefresh={load}
                          onMessage={notify}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )
          ) : (
            <div>
              {(() => {
                const peers = approved.filter((e) => e.user.id !== user?.id);
                return (
                  <section>
                    <h2 className='mb-2.5 text-base font-semibold text-[#0F172A] flex items-center gap-2'>
                      <Users size={17} className="text-[#0077CC]" />
                      Compañeros de clase{' '}
                      <span className='rounded-full bg-[#E0F2FE] px-2 py-0.5 text-xs font-semibold text-[#0077CC]'>{peers.length}</span>
                    </h2>
                    {peers.length === 0 ? (
                      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#64748B]">
                        Aún no hay otros estudiantes inscritos.
                      </div>
                    ) : (
                      <div className='overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs'>
                        {peers.map((enrollment) => (
                          <EnrollmentRow
                            key={enrollment.enrollment_id}
                            enrollment={enrollment}
                            canManage={false}
                            courseId={id ?? ''}
                            onRefresh={load}
                            onMessage={notify}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
