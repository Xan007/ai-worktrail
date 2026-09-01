import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBackendClient, useProfileState } from '@/hooks/useBackend';
import { createCourse as createCourseApi, joinCourse as joinCourseApi } from '@/lib/data';
import { BookOpen, GraduationCap, Loader2 } from 'lucide-react';

interface RoleSelectStepProps {
  onSelectRole: (role: 'teacher' | 'student') => void;
}

function RoleSelectStep({ onSelectRole }: RoleSelectStepProps) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-xs text-center">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0077CC]">Bienvenido a AI WorkTrail</p>
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#0F172A]">¿Cómo usarás la plataforma?</h1>
      <p className="mt-2 text-sm text-[#334155]">
        Selecciona tu rol principal para configurar tu espacio de trabajo.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelectRole('teacher')}
          className="group rounded-xl border-2 border-[#E2E8F0] bg-white p-6 text-left transition-colors hover:border-[#0077CC] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0077CC]"
        >
          <div className="flex size-12 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0077CC] transition-colors group-hover:bg-[#0077CC] group-hover:text-white">
            <BookOpen size={22} />
          </div>
          <h2 className="mt-4 text-[16px] font-bold text-[#0F172A] group-hover:text-[#0077CC]">
            Soy docente
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
            Crear cursos, invitar estudiantes y evaluar el uso pedagógico de la IA en sus tareas.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#0077CC]">
            <span>Continuar</span>
            <span className="transition-transform group-hover:translate-x-1" />
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
          <h2 className="mt-4 text-[16px] font-bold text-[#0F172A] group-hover:text-[#1F7A4D]">
            Soy estudiante
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
            Unirme a cursos con un código de clase y compartir mis enlaces de conversaciones con Gemini.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#1F7A4D]">
            <span>Continuar</span>
            <span className="transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const client = useBackendClient();
  const { profile, loading: profileLoading, setProfile } = useProfileState();

  // Si ya tiene perfil, no mostrar onboarding de nuevo
  if (profile) return null;

  if (profileLoading) {
    return (
      <main className="page-fade flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#0077CC]" size={24} />
      </main>
    );
  }

  async function saveUserProfile(role: 'teacher' | 'student') {
    if (!user) throw new Error('No se encontró el usuario activo.');
    const provider = user.externalAccounts.some((a) => a.provider.includes('google')) ? 'google' : 'email';
    const fullName = user.fullName?.trim() || [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const clerkEmail = user.primaryEmailAddress?.emailAddress?.trim() ?? '';
    const emailPrefix = clerkEmail ? clerkEmail.split('@')[0] : '';
    const resolvedName = fullName || user.username?.trim() || emailPrefix || (role === 'teacher' ? 'Docente' : 'Estudiante');

    // Guarda en localStorage para acceso inmediato y setProfile para la UI
    try {
      localStorage.setItem(`awt_user_role_${user.id}`, role);
      localStorage.setItem(`awt_profile_${user.id}`, JSON.stringify({ id: user.id, role, name: resolvedName, email: clerkEmail }));
    } catch {}

    setProfile({
      id: user.id,
      role,
      name: resolvedName,
      email: clerkEmail,
    });

    // Persiste en DB via upsert directo (RLS users_insert_self valida el ID)
    const { error } = await client.from('users').upsert({
      id: user.id,
      email: clerkEmail,
      name: resolvedName,
      provider,
      role,
    });
    if (error) throw new Error(error.message);
  }

  async function handleSelectRole(role: 'teacher' | 'student') {
    try {
      await saveUserProfile(role);
    } catch (err) {
      console.error('Error saving profile:', err);
      return; // Don't navigate if save failed
    }
    navigate('/courses', { replace: true });
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-[1040px] px-6 py-8">
      <RoleSelectStep onSelectRole={handleSelectRole} />
    </main>
  );
}