-- 00026: permitir que estudiantes vean el curso donde tienen solicitud pendiente/rechazada
-- para poder ver/cancelar desde Mis cursos -> Inscrito

DROP POLICY IF EXISTS courses_select ON public.courses;
CREATE POLICY courses_select ON public.courses
  FOR SELECT TO authenticated
  USING (
    teacher_id = public.fn_requesting_user_id()
    OR public.fn_is_enrolled(id)
    OR EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_id = courses.id
        AND user_id = public.fn_requesting_user_id()
        AND status IN ('pending','rejected')
    )
  );

NOTIFY pgrst, 'reload schema';
