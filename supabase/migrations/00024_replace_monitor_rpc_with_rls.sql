-- 00024: reemplaza RPC fn_set_monitor por RLS directo (solo docente del curso)
-- El monitor se asigna con UPDATE directo a users.role, sin SECURITY DEFINER

REVOKE EXECUTE ON FUNCTION public.fn_set_monitor(uuid, text, boolean) FROM authenticated;
DROP FUNCTION IF EXISTS public.fn_set_monitor(uuid, text, boolean);

-- Permite al docente del curso cambiar role de usuarios inscritos en ese curso
-- Solo permite toglear entre student <-> monitor, no a teacher
DROP POLICY IF EXISTS users_update_monitor_by_teacher ON public.users;
CREATE POLICY users_update_monitor_by_teacher ON public.users
  FOR UPDATE TO authenticated
  USING (
    -- fila target debe estar inscrita (approved) en un curso donde yo soy teacher
    EXISTS (
      SELECT 1 FROM public.course_enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.user_id = users.id
        AND e.status = 'approved'
        AND c.teacher_id = public.fn_requesting_user_id()
    )
  )
  WITH CHECK (
    role IN ('student','monitor')
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.user_id = users.id
        AND e.status = 'approved'
        AND c.teacher_id = public.fn_requesting_user_id()
    )
  );

NOTIFY pgrst, 'reload schema';
