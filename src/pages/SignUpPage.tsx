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

  if (isLoaded && isSignedIn) {
    return <Navigate to={redirectUrl} replace />;
  }

  return (
    <main className="page-fade flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#0077CC] shadow-sm">
          <span className="size-2 rounded-xs bg-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-[#0F172A]">
          AI WorkTrail
        </span>
      </div>

      <SignUp
        signInUrl={redirectUrl !== '/onboarding' ? `/login?redirect_url=${encodeURIComponent(redirectUrl)}` : '/login'}
        fallbackRedirectUrl={redirectUrl}
        forceRedirectUrl={redirectUrl}
        appearance={clerkAppearance}
      />

      <p className="mt-8 max-w-[320px] text-center text-xs text-[#64748B]">
        Evalúa el uso de IA con evidencia, no con sospecha.
      </p>
    </main>
  );
}
