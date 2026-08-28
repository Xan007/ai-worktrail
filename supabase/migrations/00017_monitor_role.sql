-- 00017: rol "monitor" — asistente del docente con sus mismos permisos
-- (crear tareas, lanzar evaluaciones, gestionar estudiantes).

ALTER TABLE public.users
  DROP CONSTRAINT users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'monitor'::text]));

-- Un monitor equivale a un docente para efectos de permisos por curso.
CREATE OR REPLACE FUNCTION public.fn_is_course_teacher(p_course_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid TEXT;
BEGIN
  v_uid := public.fn_requesting_user_id();

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND teacher_id = v_uid
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_uid AND role IN ('teacher', 'monitor')
  );
END;
$function$;
