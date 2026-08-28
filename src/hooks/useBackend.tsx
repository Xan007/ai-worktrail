import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { createBackendClient } from '@/lib/supabase';

export type UserRole = 'teacher' | 'student' | 'monitor';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface BackendContextValue {
  client: ReturnType<typeof createBackendClient>;
}

const BackendContext = createContext<BackendContextValue | null>(null);
const ProfileContext = createContext<{
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setProfile: (p: UserProfile | null) => void;
}>({
  profile: null,
  loading: false,
  refresh: async () => undefined,
  setProfile: () => undefined,
});

function BackendProviderInner({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const client = useMemo(
    () =>
      createBackendClient(
        () => {
          if (!isLoaded) return Promise.resolve(null);
          return getToken().catch(() => null);
        },
      ),
    [getToken, isLoaded],
  );
  const value = useMemo(() => ({ client }), [client]);
  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

function ProfileProviderInner({ children }: { children: ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const client = useBackendClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authLoaded || !isSignedIn || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const fullNameFromClerk = user.fullName?.trim() || [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const clerkEmail = (user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? '').trim();
    const emailHandle = clerkEmail ? clerkEmail.split('@')[0] : '';
    const formattedEmailHandle = emailHandle
      ? emailHandle.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : '';
    const clerkName = fullNameFromClerk || user.username?.trim() || formattedEmailHandle || 'Estudiante';
    const clerkAvatar = user.imageUrl ?? null;

    try {
      const { data, error } = await client
        .from('users')
        .select('id, role, name, email, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
      }

      if (data) {
        const isPlaceholderName = !data.name || data.name === 'Sin nombre' || data.name.trim() === '' || data.name === 'Estudiante';
        const shouldUpdateName = isPlaceholderName && clerkName !== 'Estudiante';
        const shouldUpdateEmail = !data.email && Boolean(clerkEmail);
        const shouldUpdateAvatar = clerkAvatar && (data as { avatar_url?: string | null }).avatar_url !== clerkAvatar;

        if (shouldUpdateName || shouldUpdateEmail || shouldUpdateAvatar) {
          try {
            const nextName = shouldUpdateName ? clerkName : data.name;
            const nextEmail = clerkEmail || data.email;
            const nextAvatar = shouldUpdateAvatar ? clerkAvatar : (data as { avatar_url?: string | null }).avatar_url;
            const updatePayload: Record<string, unknown> = {};
            if (shouldUpdateName) updatePayload.name = nextName;
            if (shouldUpdateEmail) updatePayload.email = nextEmail;
            if (shouldUpdateAvatar) updatePayload.avatar_url = nextAvatar;
            await client.from('users').update(updatePayload).eq('id', user.id);
            data.name = nextName;
            data.email = nextEmail;
            (data as { avatar_url?: string | null }).avatar_url = nextAvatar as string | null;
          } catch {
            /* ignore background update failure */
          }
        }
        setProfile((data as UserProfile) ?? null);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user, authLoaded, isSignedIn, client]);

  useEffect(() => {
    let cancelled = false;
    if (!authLoaded || !userLoaded) return;
    if (!isSignedIn || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await client
          .from('users')
          .select('id, role, name, email, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) console.error('Error fetching user profile:', error);
        setProfile(data ? (data as UserProfile) : null);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Unexpected error loading profile:', err);
        setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userLoaded, authLoaded, isSignedIn, client]);

  const value = useMemo(
    () => ({ profile, loading, refresh, setProfile }),
    [profile, loading, refresh],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useBackendClient() {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error('useBackendClient debe usarse dentro de <AppProviders>');
  return ctx.client;
}

// Sin provider (visitante anónimo) devuelve estado neutro en vez de lanzar.
export function useProfileState() {
  return useContext(ProfileContext);
}

/** Rutas protegidas: exige sesión y perfil con rol elegido. */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { profile, loading } = useProfileState();
  const { user } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <main className="mx-auto max-w-[1040px] px-6 py-8" aria-busy="true">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-[#EAF1F9]" />
          <div className="h-28 rounded-xl border border-[#D9E0EA] bg-white p-6" />
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect_url=${redirectUrl}`} replace />;
  }

  // Dual read: si localStorage ya tiene perfil (guardado en ambos), no bloquear por DB lenta
  const hasLocalProfile = (() => {
    try {
      if (!user) return false;
      const cached = localStorage.getItem(`awt_profile_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached) as { id?: string; role?: string };
        if (parsed?.id === user.id && (parsed?.role === 'teacher' || parsed?.role === 'student' || parsed?.role === 'monitor')) return true;
      }
      const role = localStorage.getItem(`awt_user_role_${user.id}`);
      if (role === 'teacher' || role === 'student' || role === 'monitor') return true;
      if (localStorage.getItem(`awt_onboarding_done_${user.id}`) === 'true') return true;
    } catch {}
    return false;
  })();

  if (loading) {
    if (hasLocalProfile && !profile) {
      return <SignedIn>{children}</SignedIn>;
    }
    return (
      <main className="mx-auto max-w-[1040px] px-6 py-8" aria-busy="true">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-[#EAF1F9]" />
          <div className="h-28 rounded-xl border border-[#D9E0EA] bg-white p-6" />
          <div className="h-48 rounded-xl border border-[#D9E0EA] bg-white p-6" />
        </div>
      </main>
    );
  }

  if (!profile) {
    if (hasLocalProfile) return <SignedIn>{children}</SignedIn>;
    return <Navigate to="/onboarding" replace />;
  }

  return <SignedIn>{children}</SignedIn>;
}

/**
 * Proveedores globales. Debe montarse dentro de <ClerkProvider>.
 * El perfil solo se carga con sesión activa; los visitantes anónimos
 * navegan las páginas públicas sin él.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BackendProviderInner>
      <SignedIn>
        <ProfileProviderInner>{children}</ProfileProviderInner>
      </SignedIn>
      <SignedOut>{children}</SignedOut>
    </BackendProviderInner>
  );
}
