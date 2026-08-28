import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useProfileState } from '@/hooks/useBackend';

interface StudentPreviewContextValue {
  isStudentPreview: boolean;
  setStudentPreview: (preview: boolean) => void;
  toggleStudentPreview: () => void;
}

const StudentPreviewContext = createContext<StudentPreviewContextValue>({
  isStudentPreview: false,
  setStudentPreview: () => undefined,
  toggleStudentPreview: () => undefined,
});

export function RoleModeProvider({ children }: { children: ReactNode }) {
  const [isStudentPreview, setStudentPreview] = useState(false);

  const value = useMemo(
    () => ({
      isStudentPreview,
      setStudentPreview,
      toggleStudentPreview: () => setStudentPreview((prev) => !prev),
    }),
    [isStudentPreview],
  );

  return (
    <StudentPreviewContext.Provider value={value}>
      {children}
    </StudentPreviewContext.Provider>
  );
}

export function useStudentPreview() {
  return useContext(StudentPreviewContext);
}

/** @deprecated Compatibilidad */
export function useRoleMode() {
  const { isStudentPreview, setStudentPreview } = useStudentPreview();
  return {
    mode: isStudentPreview ? ('student' as const) : ('teacher' as const),
    setMode: (m: 'teacher' | 'student') => setStudentPreview(m === 'student'),
  };
}

export function useEffectiveProfile() {
  const { profile } = useProfileState();
  const { isStudentPreview } = useStudentPreview();
  if (!profile) return profile;
  if (isStudentPreview && profile.role === 'teacher') {
    return { ...profile, role: 'student' as const };
  }
  return profile;
}

export function useCourseRole(teacherId?: string | null) {
  const { isStudentPreview, setStudentPreview, toggleStudentPreview } = useStudentPreview();
  const { user } = useUser();
  const { profile } = useProfileState();
  const isActualTeacher = !!user && !!teacherId && user.id === teacherId;
  const isTeacher = isActualTeacher && !isStudentPreview;
  const effectiveRole = isStudentPreview && profile?.role === 'teacher' ? 'student' : profile?.role;
  const canManage = !!user && !isStudentPreview && !!(teacherId === user.id || profile?.role === 'teacher' || profile?.role === 'monitor');
  return { isActualTeacher, isTeacher, isStudentPreview, setStudentPreview, toggleStudentPreview, effectiveRole, canManage };
}

