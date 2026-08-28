import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Sparkles, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBackendClient, useProfileState } from '@/hooks/useBackend';
import { useUser } from '@clerk/clerk-react';

interface TeacherOnboardingChecklistProps {
  hasCourses: boolean;
  hasStudents?: boolean;
  hasTasks?: boolean;
  onCreateCourse?: () => void;
  onInviteStudents?: () => void;
  onCreateTask?: () => void;
  className?: string;
}

export function TeacherOnboardingChecklist({
  hasCourses,
  hasStudents = false,
  hasTasks = false,
  onCreateCourse,
  onInviteStudents,
  onCreateTask,
  className = '',
}: TeacherOnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('awt_teacher_checklist_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const [hasCopiedLocally, setHasCopiedLocally] = useState(() => {
    try {
      return localStorage.getItem('awt_step_invited_done') === 'true';
    } catch {
      return false;
    }
  });

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('awt_teacher_checklist_collapsed');
      if (stored !== null) return stored === 'true';
      return false;
    } catch {
      return false;
    }
  });

  const [isExiting, setIsExiting] = useState(false);
  const { profile, refresh } = useProfileState();
  const { user } = useUser();
  const client = useBackendClient();

  useEffect(() => {
    if (profile?.onboarding_dismissed) setDismissed(true);
  }, [profile?.onboarding_dismissed]);

  useEffect(() => {
    if (profile?.onboarding_has_invited) setHasCopiedLocally(true);
  }, [profile?.onboarding_has_invited]);

  useEffect(() => {
    if (!profile || !user) return;
    const sync = async () => {
      try {
        const updates: Record<string, boolean> = {};
        const localDismissed = (() => { try { return localStorage.getItem('awt_teacher_checklist_dismissed') === 'true'; } catch { return false; } })();
        if (localDismissed && !profile.onboarding_dismissed) updates.onboarding_dismissed = true;
        const localInvited = (() => {
          try {
            if (localStorage.getItem('awt_step_invited_done') === 'true') return true;
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k?.startsWith('awt_invite_clicked_') && localStorage.getItem(k) === 'true') return true;
              if (k?.startsWith('awt_invited_') && localStorage.getItem(k) === 'true') return true;
            }
          } catch {}
          return false;
        })();
        if (localInvited && !profile.onboarding_has_invited) updates.onboarding_has_invited = true;
        const hasAnyTaskClicked = (() => {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k?.startsWith('awt_task_clicked_') && localStorage.getItem(k) === 'true') return true;
            }
          } catch {}
          return false;
        })();
        if (hasAnyTaskClicked && !profile.onboarding_has_created_task) updates.onboarding_has_created_task = true;
        if (Object.keys(updates).length > 0) {
          await client.from('users').update(updates).eq('id', user.id);
          await refresh();
        }
      } catch {}
    };
    void sync();
  }, [profile, user, client, refresh]);

  const handleDismiss = () => {
    setIsExiting(true);
    window.setTimeout(async () => {
      setDismissed(true);
      try {
        localStorage.setItem('awt_teacher_checklist_dismissed', 'true');
      } catch {}
      try {
        if (user) {
          await client.from('users').update({ onboarding_dismissed: true }).eq('id', user.id);
          await refresh();
        }
      } catch {}
    }, 280);
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('awt_teacher_checklist_collapsed', String(next));
    } catch {
      /* ignore */
    }
  };

  const step1Done = hasCourses;
  const step2Done = hasStudents || hasCopiedLocally;
  const step3Done = hasTasks;

  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const isAllComplete = completedCount === 3;
  const progressPercent = Math.round((completedCount / 3) * 100);

  useEffect(() => {
    if (isAllComplete && !dismissed && !isExiting) {
      const t1 = window.setTimeout(() => setIsExiting(true), 1400);
      const t2 = window.setTimeout(() => {
        setDismissed(true);
        try {
          localStorage.setItem('awt_teacher_checklist_dismissed', 'true');
        } catch {}
      }, 1680);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isAllComplete, dismissed, isExiting]);

  useEffect(() => {
    if (!dismissed && !isAllComplete && collapsed) {
      setCollapsed(false);
      try {
        localStorage.setItem('awt_teacher_checklist_collapsed', 'false');
      } catch {}
    }
  }, [dismissed, isAllComplete, collapsed]);

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 transition-all duration-300 ${isExiting ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'} ${className}`}
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      {collapsed ? (
        /* Widget Minimizada (Píldora Flotante) */
        <button
          type="button"
          onClick={toggleCollapsed}
          className="group flex items-center gap-2.5 rounded-full border border-[#D9E0EA] bg-white px-4 py-2.5 text-xs font-semibold text-[#1A2332] shadow-lg shadow-slate-900/10 transition-colors hover:border-[#1E5AA8] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#1E5AA8]/30"
          aria-label="Abrir guía de primeros pasos"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-[#EAF1F9] text-[#1E5AA8] transition-transform group-hover:scale-110">
            <Sparkles size={12} />
          </span>
          <span className="font-medium text-[#1A2332]">Primeros pasos</span>
          <span className="rounded-full bg-[#EAF1F9] px-2 py-0.5 font-bold text-[#1E5AA8]">
            {completedCount}/3
          </span>
          <ChevronUp size={14} className="text-[#8B95A5] transition-transform group-hover:text-[#1E5AA8]" />
        </button>
      ) : (
        /* Widget Expandido (Card Flotante) */
        <div className={`w-[calc(100vw-32px)] sm:w-[380px] overflow-hidden rounded-2xl border border-[#D9E0EA] bg-white shadow-2xl shadow-slate-900/15 ${isExiting ? 'animate-out fade-out slide-out-to-bottom-2 duration-300' : 'animate-in fade-in slide-in-from-bottom-2'}`}>
          {/* Barra de Progreso Superior */}
          <div className="h-1.5 w-full bg-[#EEF1F6]">
            <div
              className={`h-full transition-[width] duration-500 ease-out ${isAllComplete ? 'bg-[#1F7A4D]' : 'bg-[#1E5AA8]'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Encabezado */}
          <div className="flex items-center justify-between border-b border-[#EEF1F6] bg-[#F8FAFD] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-[#EAF1F9] text-[#1E5AA8]">
                <Sparkles size={13} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1A2332]">Primeros pasos</span>
                <span className="rounded-full bg-[#EAF1F9] px-1.5 py-0.2 text-[11px] font-semibold text-[#1E5AA8]">
                  {completedCount} de 3
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                title="Minimizar"
                aria-label="Minimizar guía"
                className="size-7 text-[#64748B] hover:text-[#1A2332]"
              >
                <ChevronDown size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                title="Cerrar guía"
                aria-label="Cerrar guía"
                className="size-7 text-[#8B95A5] hover:bg-[#FBEDEB] hover:text-[#B3372F]"
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Pasos */}
          <div className="divide-y divide-[#EEF1F6] p-2">
            {/* Paso 1 */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg transition-colors hover:bg-[#F8FAFD]">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 shrink-0">
                  {step1Done ? (
                    <CheckCircle2 size={16} className="text-[#1F7A4D]" />
                  ) : (
                    <span className="flex size-4 items-center justify-center rounded-full bg-[#EAF1F9] text-[10px] font-bold text-[#1E5AA8]">
                      1
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${step1Done ? 'text-[#64748B] line-through decoration-slate-300' : 'text-[#1A2332]'}`}>
                    Crea tu primer curso
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-[#64748B]">
                    Espacio para gestionar tareas y estudiantes.
                  </p>
                </div>
              </div>
              {!step1Done && onCreateCourse && (
                <Button size="sm" onClick={onCreateCourse} className="h-7 px-2.5 gap-1 text-[11px] shrink-0">
                  <Plus size={12} /> Crear
                </Button>
              )}
            </div>

            {/* Paso 2 */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg transition-colors hover:bg-[#F8FAFD]">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 shrink-0">
                  {step2Done ? (
                    <CheckCircle2 size={16} className="text-[#1F7A4D]" />
                  ) : (
                    <span className="flex size-4 items-center justify-center rounded-full bg-[#EAF1F9] text-[10px] font-bold text-[#1E5AA8]">
                      2
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${step2Done ? 'text-[#64748B] line-through decoration-slate-300' : 'text-[#1A2332]'}`}>
                    Invita a tus estudiantes
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-[#64748B]">
                    Comparte tu código o enlace de clase.
                  </p>
                </div>
              </div>
              {!step2Done && onInviteStudents && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    onInviteStudents();
                    setHasCopiedLocally(true);
                    try { localStorage.setItem('awt_step_invited_done', 'true'); } catch {}
                    try {
                      if (user) {
                        await client.from('users').update({ onboarding_has_invited: true }).eq('id', user.id);
                        await refresh();
                      }
                    } catch {}
                  }}
                  className="h-7 px-2.5 gap-1 text-[11px] shrink-0"
                >
                  <UserPlus size={12} /> Invitar
                </Button>
              )}
            </div>

            {/* Paso 3 */}
            <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg transition-colors hover:bg-[#F8FAFD]">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 shrink-0">
                  {step3Done ? (
                    <CheckCircle2 size={16} className="text-[#1F7A4D]" />
                  ) : (
                    <span className="flex size-4 items-center justify-center rounded-full bg-[#EAF1F9] text-[10px] font-bold text-[#1E5AA8]">
                      3
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${step3Done ? 'text-[#64748B] line-through decoration-slate-300' : 'text-[#1A2332]'}`}>
                    Publica una tarea
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-[#64748B]">
                    Tus alumnos entregarán con enlaces de Gemini.
                  </p>
                </div>
              </div>
              {!step3Done && onCreateTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    onCreateTask();
                    try {
                      if (user) {
                        await client.from('users').update({ onboarding_has_created_task: true }).eq('id', user.id);
                        await refresh();
                      }
                    } catch {}
                    try { localStorage.setItem('awt_task_clicked_global', 'true'); } catch {}
                  }}
                  className="h-7 px-2.5 gap-1 text-[11px] shrink-0"
                >
                  <Plus size={12} /> Tarea
                </Button>
              )}
            </div>
          </div>

          {/* Celebración / Completado */}
          {isAllComplete && (
            <div className="border-t border-[#EEF1F6] bg-[#E8F4EE] p-3 text-center">
              <p className="text-xs font-semibold text-[#1F7A4D]">
                ¡Completaste los pasos iniciales! 🎉
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="mt-1.5 h-6 text-[11px] font-medium text-[#1F7A4D] hover:bg-[#1F7A4D]/10"
              >
                Cerrar guía
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

