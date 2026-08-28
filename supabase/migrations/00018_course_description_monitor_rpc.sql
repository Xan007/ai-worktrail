-- 00018: descripción de curso + asignación de monitor vía RPC seguro
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE OR REPLACE FUNCTION public.fn_set_monitor(
  p_course_id uuid,
  p_user_id text,
  p_make_monitor boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid TEXT;
BEGIN
  v_uid := public.fn_requesting_user_id();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no proporcionada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND teacher_id = v_uid
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_uid AND role IN ('teacher', 'monitor')
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar monitores en este curso.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = p_course_id AND user_id = p_user_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'El usuario no está inscrito en este curso.';
  END IF;

  IF p_make_monitor THEN
    UPDATE public.users SET role = 'monitor' WHERE id = p_user_id;
  ELSE
    UPDATE public.users SET role = 'student' WHERE id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_set_monitor(uuid, text, boolean) TO authenticated;
