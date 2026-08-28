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
  { to: '/dev/evaluate', label: 'Evaluador', icon: ClipboardList },
];

function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
      <div className="flex size-7 items-center justify-center rounded-lg bg-[#1E5AA8] text-white shadow-2xs transition-transform group-hover:scale-105">
        <span className="size-2 rounded-xs bg-white" />
      </div>
      <span className="font-bold text-base tracking-tight text-[#1A2332] group-hover:text-[#1E5AA8] transition-colors">
        AI WorkTrail
      </span>
    </Link>
  );
}

function NavList() {
  const base =
    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap';
  return (
    <nav className="hidden items-center gap-1 md:flex ml-4">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `${base} ${
              isActive
                ? 'bg-[#EAF1F9] text-[#1E5AA8]'
                : 'text-[#4A5568] hover:bg-[#F0F3F8] hover:text-[#1A2332]'
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
    <div className="bg-[#1E5AA8] text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-inner">
      <div className="mx-auto flex max-w-[1240px] w-full items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-[#93C5FD]" />
          <span>
            <strong>Vista previa de estudiante activa:</strong> Estás viendo este curso exactamente como lo ven tus estudiantes.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setStudentPreview(false)}
          className="rounded bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
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
      className="relative flex size-8 shrink-0 items-center justify-center rounded-md text-[#4A5568] transition-colors hover:bg-[#F0F3F8] hover:text-[#1A2332]"
    >
      <Bell size={16} />
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
        <button className="flex items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-[#F0F3F8]" style={{ outline: 'none' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="size-7 rounded-full object-cover border border-[#D9E0EA]" />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-full bg-[#EAF1F9] font-mono text-xs font-bold text-[#1E5AA8]">
              {initials}
            </span>
          )}
          <ChevronDown size={12} className="text-[#8B95A5]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1">
        <div className="px-2.5 py-2">
          <div className="truncate text-xs font-bold text-[#1A2332]">{name}</div>
          <div className="truncate text-[11px] text-[#8B95A5]">{user?.primaryEmailAddress?.emailAddress}</div>
        </div>
        <div className="my-1 h-px bg-[#EEF1F6]" />
        <DropdownMenuItem onClick={() => navigate('/settings')} className="text-xs">
          <Settings size={14} className="mr-1.5" />
          Configuración de cuenta
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => void clerk.signOut().then(() => navigate('/'))} className="text-xs">
          <LogOut size={14} className="mr-1.5" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <header className="sticky top-0 z-40 border-b border-[#D9E0EA] bg-white/90 backdrop-blur-md transition-colors">
        <StudentPreviewBanner />
        <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center gap-4 px-6">
          <Brand />
          <NavList />
          <div className="ml-auto flex items-center gap-2">
            <SignedIn>
              <NotificationsBell />
              <UserMenu />
            </SignedIn>
            <SignedOut>
              <Link
                to="/login"
                className="whitespace-nowrap rounded-md bg-[#1E5AA8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#174A8C] shadow-2xs"
              >
                Iniciar sesión
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1240px] px-6 py-8">{children}</main>
    </div>
  );
}

export function BareLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
