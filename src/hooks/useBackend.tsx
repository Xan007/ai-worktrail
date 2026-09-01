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
          // clockSkewInSeconds compensates for minor clock differences
          // between Clerk and Supabase servers (avoids PGRST303 'JWT not yet valid')
          return getToken({ clockSkewInSeconds: 5 }).catch(() => null);
        },
      ),
    [getToken, isLoaded],
  );
  const value = useMemo(() => ({ client }), [client]);
  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

/**
 * Fetch the current user's profile via direct query.
 * RLS policy `users_select_self_or_related` ensures the user
 * can only read their own row (matched by fn_requesting_user_id()).
 */
async function fetchProfileDirectly(
  client: ReturnType<typeof createBackendClient>,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await client
    .from('users')
    .select('id, role, name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    role: data.role,
    name: data.name,
    email: data.email,
    avatar_url: data.avatar_url ?? null,
  };
}

function ProfileProviderInner({ children }: { children: ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const client = useBackendClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper: parse profile from localStorage safely
  const localStorageProfile = (() => {
    try {
      if (!user) return null;
      const cached = localStorage.getItem(`awt_profile_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached) as UserProfile;
        if (parsed?.id === user.id && parsed?.role) return parsed;
      }
    } catch {}
    return null;
  });

  // On mount: fetch profile via RPC (avoids PostgREST UUID casting issues)
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
        const dbProfile = await fetchProfileDirectly(client, user!.id);
        if (cancelled) return;

        if (dbProfile) {
          setProfile(dbProfile);
          // Persist to localStorage for future fast loads
          try {
            localStorage.setItem(`awt_profile_${user.id}`, JSON.stringify(dbProfile));
            localStorage.setItem(`awt_user_role_${user.id}`, dbProfile.role);
          } catch {}
        } else {
          // Fallback: try localStorage profile as safety net
          const cached = localStorageProfile();
          if (cached) setProfile(cached);
          else setProfile(null);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Unexpected error loading profile from DB:', err);
        // Fallback: try localStorage profile as safety net
        const cached = localStorageProfile();
        if (cached) setProfile(cached);
        else setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoaded, isSignedIn, userLoaded, client]);

  const refresh = useCallback(async () => {
    if (!authLoaded || !isSignedIn || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dbProfile = await fetchProfileDirectly(client, user!.id);
      if (dbProfile) {
        setProfile(dbProfile);
        // Sync to localStorage so future loads are fast
        try {
          localStorage.setItem(`awt_profile_${user.id}`, JSON.stringify(dbProfile));
          localStorage.setItem(`awt_user_role_${user.id}`, dbProfile.role);
        } catch {}
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
          <div className="h-4 w-32 rounded bg-[#E0F2FE]" />
          <div className="h-28 rounded-xl border border-[#E2E8F0] bg-white p-6" />
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect_url=${redirectUrl}`} replace />;
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1040px] px-6 py-8" aria-busy="true">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-[#E0F2FE]" />
          <div className="h-28 rounded-xl border border-[#E2E8F0] bg-white p-6" />
          <div className="h-48 rounded-xl border border-[#E2E8F0] bg-white p-6" />
        </div>
      </main>
    );
  }

  if (!profile) return <Navigate to="/onboarding" replace />;

  return <SignedIn>{children}</SignedIn>;
}

/**
 * Proveedores globales. Debe montarse dentro de <ClerkProvider>.
 * El perfil se carga desde la BD; si no existe, el usuario pasa por onboarding.
 * Los visitantes anónimos navegan las páginas públicas sin él.
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
