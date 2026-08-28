import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SignUp, useUser } from '@clerk/clerk-react';
import { clerkAppearance } from '@/lib/clerkTheme';

export function SignUpPage() {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectUrl = params.get('redirect_url') ? decodeURIComponent(params.get('redirect_url')!) : '/onboarding';

  useEffect(() => {
    document.title = 'Crear cuenta — AI WorkTrail';
  }, []);

  // Usuario ya autenticado: directo a donde venía o a onboarding.
  if (isLoaded && isSignedIn) {
    return <Navigate to={redirectUrl} replace />;
  }

  return (
    <main
      className="page-fade"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#FFFFFF',
      }}
    >
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1E5AA8', display: 'inline-block' }} />
        <span style={{ fontSize: 20, fontWeight: 700, color: '#1A2332', letterSpacing: '-0.02em' }}>
          AI WorkTrail
        </span>
      </div>

      {/* Clerk posee la tarjeta completa */}
      <SignUp
        signInUrl={redirectUrl !== '/onboarding' ? `/login?redirect_url=${encodeURIComponent(redirectUrl)}` : '/login'}
        fallbackRedirectUrl={redirectUrl}
        forceRedirectUrl={redirectUrl}
        appearance={clerkAppearance}
      />

      <p style={{ marginTop: 24, fontSize: 12, color: '#8B95A5', textAlign: 'center', maxWidth: 320 }}>
        Evalúa el uso de IA con evidencia, no con sospecha.
      </p>
    </main>
  );
}
