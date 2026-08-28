import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course, EnrollmentMode } from '@/lib/mockdata';
import { MODE_TO_DB, mapCourse } from './mappers';
import type { CoursePreviewInfo, EnrollmentView } from './types';

type Client = SupabaseClient;

export async function getCoursePreview(client: Client, code: string): Promise<CoursePreviewInfo | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // RPC SECURITY DEFINER: bypass RLS y devuelve solo preview (id, name, modo, lock)
  // La función en BD ya hace upper(trim(p_join_code)) para ser case-insensitive
  const { data, error } = await client.rpc('get_course_preview', { p_join_code: trimmed });
  if (error) throw new Error(error.message);
  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  const row = (Array.isArray(data) ? data[0] : data) as {
    course_id: string;
    name: string;
    enrollment_mode: string;
    is_enrollment_locked: boolean;
    due_date?: string;
  };
  if (!row?.course_id) return null;

  // DB guarda 'open' | 'approval' | 'whitelist', frontend espera 'open' | 'requires_approval' | 'whitelist'
  const dbMode = row.enrollment_mode as string;
  const mappedMode: EnrollmentMode =
    dbMode === 'approval' || dbMode === 'requires_approval' ? 'requires_approval' : dbMode === 'whitelist' ? 'whitelist' : 'open';
  return {
    course_id: row.course_id,
    name: row.name,
    enrollment_mode: mappedMode,
    is_enrollment_locked: Boolean(row.is_enrollment_locked),
    due_date: row.due_date ?? undefined,
  };
}

export async function listMyCourses(client: Client, userParam: string): Promise<Course[]> {
  const [teachRes, enrRes] = await Promise.all([
    client
      .from('courses')
      .select('id, name, join_code, enrollment_mode, description, is_enrollment_locked')
      .eq('teacher_id', userParam)
      .order('created_at', { ascending: false }),
    client.from('course_enrollments').select('course_id, status').eq('user_id', userParam),
  ]);
  if (teachRes.error) throw new Error(teachRes.error.message);
  if (enrRes.error) throw new Error(enrRes.error.message);

  const teacherRows = (teachRes.data ?? []) as Array<{ id: string; name: string; join_code: string; enrollment_mode: string; description?: string; is_enrollment_locked?: boolean }>;
  const teacherCourseIds = teacherRows.map((c) => c.id);

  let pendingCountByCourse: Record<string, number> = {};
  if (teacherCourseIds.length > 0) {
    const { data: pData } = await client
      .from('course_enrollments')
      .select('course_id')
      .in('course_id', teacherCourseIds)
      .eq('status', 'pending');
    if (pData) {
      for (const row of pData as Array<{ course_id: string }>) {
        pendingCountByCourse[row.course_id] = (pendingCountByCourse[row.course_id] || 0) + 1;
      }
    }
  }

  const teaching = teacherRows.map((row) =>
    mapCourse(row as never, 'teacher', 'approved', pendingCountByCourse[row.id] ?? 0),
  );

  const enrollmentsMap = new Map<string, 'pending' | 'approved' | 'rejected'>();
  for (const r of (enrRes.data ?? []) as Array<{ course_id: string; status: 'pending' | 'approved' | 'rejected' }>) {
    enrollmentsMap.set(r.course_id, r.status);
  }

  const ids = Array.from(enrollmentsMap.keys());
  let enrolled: Course[] = [];
  if (ids.length > 0) {
    const sRes = await client
      .from('courses')
      .select('id, name, join_code, enrollment_mode, description, is_enrollment_locked')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (sRes.error) throw new Error(sRes.error.message);
    enrolled = (sRes.data ?? []).map((row) => {
      const status = enrollmentsMap.get(row.id) ?? 'approved';
      return mapCourse(row as never, 'student', status);
    });
  }
  return [...teaching, ...enrolled];
}

export async function createCourse(
  client: Client,
  authorId: string,
  name: string,
  mode: EnrollmentMode,
  description?: string,
): Promise<Course> {
  const dbMode = MODE_TO_DB[mode];
  const coursePayload = { name, enrollment_mode: dbMode, description: description?.trim() || null, teacher_id: authorId };
  const { data, error } = await client
    .from('courses')
    .insert(coursePayload as never)
    .select('id, name, join_code, enrollment_mode, description')
    .single();
  if (error) throw new Error(error.message);
  return mapCourse(data as never, 'teacher', 'approved');
}

export async function joinCourse(
  client: Client,
  applicantId: string,
  code: string,
): Promise<{ name: string; courseId: string; status: 'pending' | 'approved' }> {
  const trimmed = code.trim();
  const preview = await getCoursePreview(client, trimmed);
  if (!preview) throw new Error('No existe ningún curso con ese código.');

  if (preview.is_enrollment_locked) {
    throw new Error('Inscripciones bloqueadas');
  }

  const { data: owned } = await client.from('courses').select('teacher_id').eq('id', preview.course_id).maybeSingle();
  if (owned?.teacher_id === applicantId) throw new Error('No puedes unirte a tu propio curso.');

  const enrollmentPayload = { course_id: preview.course_id, user_id: applicantId };
  const { data: inserted, error } = await client
    .from('course_enrollments')
    .insert(enrollmentPayload as never)
    .select('status')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Ya estás inscrito o tienes una solicitud pendiente en este curso.');
    throw new Error(error.message);
  }

  return {
    name: preview.name,
    courseId: preview.course_id,
    status: (inserted?.status as 'pending' | 'approved') ?? 'approved',
  };
}

export async function cancelMyEnrollment(client: Client, currentUserId: string, courseId: string): Promise<void> {
  const { error } = await client
    .from('course_enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('user_id', currentUserId)
    .in('status', ['pending', 'rejected']);
  if (error) throw new Error(error.message);
}

export async function getCourse(
  client: Client,
  courseId: string,
): Promise<(Course & { teacher_id: string }) | null> {
  const { data, error } = await client
    .from('courses')
    .select('id, name, join_code, enrollment_mode, teacher_id, description, is_enrollment_locked')
    .eq('id', courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...mapCourse(data as never, 'teacher'),
    teacher_id: (data as { teacher_id: string }).teacher_id,
  };
}

export async function setCourseLock(client: Client, courseId: string, locked: boolean): Promise<void> {
  const { error } = await client.from('courses').update({ is_enrollment_locked: locked }).eq('id', courseId);
  if (error) throw new Error(error.message);
}

export async function listCourseEnrollments(
  client: Client,
  courseId: string,
  excludeUserId?: string,
): Promise<EnrollmentView[]> {
  const { data: enrRows, error } = await client
    .from('course_enrollments')
    .select('id, status, user_id, users:users!course_enrollments_user_id_fkey(id, name, email, role, avatar_url)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (enrRows ?? []) as Array<Record<string, unknown>>;
  const userIds: string[] = [];
  for (const r of rows) {
    const id = (r.user_id as string) || ((r.users as Record<string, unknown> | null)?.id as string);
    if (id) userIds.push(id);
  }

  let usersById: Record<string, { id: string; name?: string; email?: string; role?: string; avatar_url?: string | null }> = {};

  if (userIds.length > 0) {
    try {
      const { data: uData } = await client.from('users').select('id, name, email, role, avatar_url').in('id', userIds);
      if (uData) {
        for (const u of uData as Array<{ id: string; name?: string; email?: string; role?: string }>) {
          usersById[u.id] = u;
        }
      }
    } catch {
      /* ignore */
    }
  }

  const out: EnrollmentView[] = [];
  for (const row of rows) {
    const uidFilter = (row.user_id as string) ?? '';
    if (excludeUserId && uidFilter === excludeUserId) continue;
    const joinedUser = (row.users as Record<string, unknown> | null) ?? null;
    const uid = (row.user_id as string) ?? (joinedUser?.id as string) ?? '';
    const fallbackUser = usersById[uid];

    const rawName = ((joinedUser?.name as string | undefined) ?? fallbackUser?.name ?? '').trim();
    const rawEmail = ((joinedUser?.email as string | undefined) ?? fallbackUser?.email ?? '').trim();
    const role = ((joinedUser?.role as string | undefined) ?? fallbackUser?.role ?? 'student') as string;
    const avatarUrl = ((joinedUser?.avatar_url as string | undefined) ?? (fallbackUser as { avatar_url?: string | null } | undefined)?.avatar_url ?? null) as string | null;

    let displayName = rawName;
    if (!displayName || displayName === 'Sin nombre' || displayName.toLowerCase() === 'sin nombre') {
      if (rawEmail) {
        const handle = rawEmail.split('@')[0];
        displayName = handle.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      } else {
        displayName = 'Estudiante';
      }
    }

    out.push({
      enrollment_id: String(row.id),
      status: row.status as EnrollmentView['status'],
      user: {
        id: uid,
        name: displayName,
        email: rawEmail,
        userRole: role,
        avatar_url: avatarUrl,
      },
    });
  }
  return out;
}

export async function setEnrollmentStatus(client: Client, enrollmentId: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await client.from('course_enrollments').update({ status }).eq('id', enrollmentId);
  if (error) throw new Error(error.message);
}

export async function removeEnrollment(client: Client, enrollmentId: string): Promise<void> {
  const { error } = await client.from('course_enrollments').delete().eq('id', enrollmentId);
  if (error) throw new Error(error.message);
}

export async function assignMonitor(
  client: Client,
  courseId: string,
  targetUserId: string,
  makeMonitor: boolean,
): Promise<void> {
  // Validación previa: solo si está approved en ESTE curso
  const { data: enr } = await client
    .from('course_enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', targetUserId)
    .eq('status', 'approved')
    .maybeSingle();
  if (!enr) throw new Error('El usuario no está inscrito en este curso.');

  // RLS users_update_monitor_by_teacher valida que seas docente del curso
  const { error } = await client
    .from('users')
    .update({ role: makeMonitor ? 'monitor' : 'student' })
    .eq('id', targetUserId);
  if (error) throw new Error(error.message);
}

export async function leaveCourse(client: Client, userId: string, courseId: string): Promise<void> {
  const { error } = await client
    .from('course_enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteCourse(client: Client, courseId: string): Promise<void> {
  const { error } = await client
    .from('courses')
    .delete()
    .eq('id', courseId);
  if (error) throw new Error(error.message);
}
