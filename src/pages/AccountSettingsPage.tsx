import { useEffect } from 'react';
import { UserProfile } from '@clerk/clerk-react';
import { clerkAppearance } from '@/lib/clerkTheme';

export function AccountSettingsPage() {
  useEffect(() => {
    document.title = 'Configuración de cuenta — AI WorkTrail';
  }, []);

  return (
    <main className='page-fade mx-auto max-w-[720px] px-6 py-8'>
        <h1 className='mb-1 text-[24px] font-bold tracking-[-0.03em] text-[#1A2332]'>
          Configuración de cuenta
        </h1>
        <p className='mb-6 text-sm text-[#4A5568]'>
          Actualiza tu foto de perfil, nombre y datos de contacto.
        </p>

        <div
          className='[&_.cl-card]:rounded-[10px] [&_.cl-card]:border [&_.cl-card]:border-[#D9E0EA] [&_.cl-card]:shadow-none'
          style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
        >
          <UserProfile
            appearance={{
              variables: {
                ...clerkAppearance.variables,
                colorPrimary: '#1E5AA8',
              },
              elements: {
                ...clerkAppearance.elements,
                rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
                card: { width: '100%', maxWidth: 700, margin: '0 auto', border: '1px solid #D9E0EA', boxShadow: 'none', borderRadius: '10px' },
                navbar: { display: 'none' },
                profileSection: {
                  backgroundColor: 'transparent',
                  borderTop: '1px solid #EEF1F6',
                  padding: '16px 0',
                },
                profileSectionTitle: { fontSize: '13px', fontWeight: 600 },
                profileSectionContent: { fontSize: '14px' },
                avatarImageActionsBlockButton: { borderRadius: '6px' },
                formButtonPrimary: { background: '#1E5AA8', borderRadius: '6px', fontWeight: 600 },
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
