-- 00019: Permitir que el docente de un curso pueda consultar los datos de perfil (nombre, correo)
-- de los usuarios con solicitudes pendientes o rechazadas, no solo los ya aprobados.

CREATE OR REPLACE FUNCTION public.fn_can_view_user(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_uid TEXT;
BEGIN
  v_uid := public.fn_requesting_user_id();

  IF v_uid IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_uid = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- 1. Docente del curso: puede ver cualquier usuario inscrito o solicitante en sus cursos
  IF EXISTS (
    SELECT 1
    FROM public.course_enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = p_user_id AND c.teacher_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Compañeros de curso mutuos aprobados
  IF EXISTS (
    SELECT 1
    FROM public.course_enrollments a
    JOIN public.course_enrollments b ON b.course_id = a.course_id
    WHERE a.user_id = v_uid AND b.user_id = p_user_id
      AND a.status = 'approved' AND b.status = 'approved'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

NOTIFY pgrst, 'reload schema';
