import { useEffect } from 'react';
import { UserProfile, useUser } from '@clerk/clerk-react';
import { clerkAppearance } from '@/lib/clerkTheme';
import { useProfileState } from '@/hooks/useBackend';
import { ShieldCheck, User } from 'lucide-react';

export function AccountSettingsPage() {
  const { user } = useUser();
  const { profile } = useProfileState();

  useEffect(() => {
    document.title = 'Configuración de cuenta — AI WorkTrail';
  }, []);

  const displayName = user?.fullName || profile?.name || 'Usuario';
  const displayEmail = user?.primaryEmailAddress?.emailAddress || profile?.email || '';
  const displayRole = profile?.role === 'teacher' ? 'Docente' : profile?.role === 'monitor' ? 'Monitor' : 'Estudiante';
  const avatarUrl = user?.imageUrl || profile?.avatar_url;

  return (
    <main className='page-fade mx-auto max-w-[760px] px-6 py-8 space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0F172A]'>
          Mi Perfil y Cuenta
        </h1>
        <p className='mt-1 text-xs sm:text-sm text-[#64748B]'>
          Administra tu información personal, foto de perfil y credenciales de acceso.
        </p>
      </div>

      {/* Tarjeta de Resumen Rápido del Perfil */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="size-16 rounded-full object-cover border-2 border-[#E2E8F0] shadow-xs"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-[#E0F2FE] text-[#0077CC] font-bold text-xl">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-base font-bold text-[#0F172A] truncate">{displayName}</h2>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
              profile?.role === 'teacher'
                ? 'bg-[#E0F2FE] text-[#0077CC]'
                : profile?.role === 'monitor'
                ? 'bg-[#E0F2FE] text-[#0077CC]'
                : 'bg-[#E8F4EE] text-[#1F7A4D]'
            }`}>
              <ShieldCheck size={12} />
              {displayRole}
            </span>
          </div>

          <p className="text-xs text-[#64748B] font-mono truncate">{displayEmail}</p>
        </div>
      </div>

      {/* Componente Clerk UserProfile */}
      <div
        className='[&_.cl-card]:rounded-xl [&_.cl-card]:border [&_.cl-card]:border-[#E2E8F0] [&_.cl-card]:shadow-2xs'
        style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
      >
        <UserProfile
          appearance={{
            variables: {
              ...clerkAppearance.variables,
              colorPrimary: '#0077CC',
            },
            elements: {
              ...clerkAppearance.elements,
              rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
              card: { width: '100%', maxWidth: 760, margin: '0 auto', border: '1px solid #E2E8F0', boxShadow: 'none', borderRadius: '12px' },
              navbar: { display: 'none' },
              profileSection: {
                backgroundColor: 'transparent',
                borderTop: '1px solid #EEF1F6',
                padding: '18px 0',
              },
              profileSectionTitle: { fontSize: '13px', fontWeight: 600, color: '#0F172A' },
              profileSectionContent: { fontSize: '13px' },
              avatarImageActionsBlockButton: { borderRadius: '8px' },
              formButtonPrimary: { background: '#0077CC', borderRadius: '8px', fontWeight: 600 },
              cl_disabled__emailLinks: { display: 'none' },
              cl_disabled__addButton: { display: 'none' },
              cl_disabled__connectedAccounts: { display: 'none' },
              'cl-profileSection__emailAddressList': { display: 'none' },
              'cl-profileSection__emailAddressActionsBlockButton': { display: 'none' },
              'cl-button--addEmail': { display: 'none !important' },
            },
            layout: {
              socialButtonsPlacement: 'bottom',
              socialButtonsVariant: 'iconButton',
            },
          }}
        />
      </div>
    </main>
  );
}
