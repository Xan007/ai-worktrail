import { useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, ChevronDown, ClipboardList, Eye, LogOut, Settings } from 'lucide-react';
import { SignedIn, SignedOut, useClerk, useUser } from '@clerk/clerk-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudentPreview } from '@/hooks/useRoleMode';
import { useProfileState } from '@/hooks/useBackend';

const NAV = [
  { to: '/courses', label: 'Mis cursos', icon: BookOpen },
  { to: '/dev/evaluate', label: 'Evaluador de chats', icon: ClipboardList },
];

function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
      <div className="flex size-8 items-center justify-center rounded-lg bg-[#0077CC] text-white shadow-sm transition-all group-hover:bg-[#0066B3] group-hover:shadow-md">
        <span className="size-2 rounded-xs bg-white" />
      </div>
      <span className="font-bold text-base tracking-tight text-[#0F172A] group-hover:text-[#0077CC] transition-colors leading-tight">
        AI WorkTrail
      </span>
    </Link>
  );
}

function NavList() {
  const base =
    'rounded-lg px-3.5 py-2 text-sm font-semibold transition-all whitespace-nowrap';
  return (
    <nav className="hidden items-center gap-1.5 md:flex ml-6">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `${base} ${
              isActive
                ? 'bg-[#E0F2FE] text-[#0077CC]'
                : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function StudentPreviewBanner() {
  const { isStudentPreview, setStudentPreview } = useStudentPreview();
  const { profile } = useProfileState();
  useEffect(() => {
    if (profile?.role === 'student' && isStudentPreview) {
      setStudentPreview(false);
    }
  }, [profile?.role, isStudentPreview, setStudentPreview]);
  if (!isStudentPreview) return null;
  if (profile?.role !== 'teacher') return null;

  return (
    <div className="bg-[#0077CC] text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-inner">
      <div className="mx-auto flex max-w-[1240px] w-full items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-[#93C5FD]" />
          <span>
            <strong>Vista previa de estudiante activa:</strong> Estás viendo este curso exactamente como lo ven tus estudiantes.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setStudentPreview(false)}
          className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/30"
        >
          Salir de la vista previa
        </button>
      </div>
    </div>
  );
}

function NotificationsBell() {
  return (
    <button
      type="button"
      aria-label="Notificaciones"
      title="Notificaciones"
      className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
    >
      <Bell size={18} />
    </button>
  );
}

function UserMenu() {
  const { user } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();
  const name = user?.fullName ?? user?.firstName ?? 'Usuario';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarUrl = user?.imageUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-[#F1F5F9]" style={{ outline: 'none' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="size-8 rounded-full object-cover border border-[#CBD5E1]" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-[#E0F2FE] font-mono text-xs font-bold text-[#0077CC]">
              {initials}
            </span>
          )}
          <ChevronDown size={14} className="text-[#64748B]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border border-[#E2E8F0]">
        <div className="px-3 py-2">
          <div className="truncate text-sm font-bold text-[#0F172A]">{name}</div>
          <div className="truncate text-xs text-[#64748B]">{user?.primaryEmailAddress?.emailAddress}</div>
        </div>
        <div className="my-1 h-px bg-[#EEF1F6]" />
        <DropdownMenuItem onClick={() => navigate('/settings')} className="text-xs py-2">
          <Settings size={15} className="mr-2" />
          Configuración de cuenta
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => void clerk.signOut().then(() => navigate('/'))} className="text-xs py-2">
          <LogOut size={15} className="mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const isLanding = typeof window !== 'undefined' && window.location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFC]">
      <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md transition-all">
        <StudentPreviewBanner />
        <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Brand />
            <NavList />
          </div>

          <div className="flex items-center gap-3">
            <SignedIn>
              <NotificationsBell />
              <UserMenu />
            </SignedIn>
            <SignedOut>
              <Link
                to="/login"
                className="whitespace-nowrap rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all hover:border-[#0077CC] hover:text-[#0077CC] shadow-2xs"
              >
                Ingresar
              </Link>
              <Link
                to="/onboarding"
                className="whitespace-nowrap rounded-xl bg-[#0077CC] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0066B3] hover:shadow-md active:scale-95"
              >
                Comenzar gratis
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className={`flex-1 ${isLanding ? 'w-full' : 'mx-auto w-full max-w-[1240px] px-6 py-8'}`}>
        {children}
      </main>
    </div>
  );
}

export function BareLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
