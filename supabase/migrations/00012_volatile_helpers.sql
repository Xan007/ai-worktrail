CREATE OR REPLACE FUNCTION public.fn_requesting_user_id()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')
$$;

CREATE OR REPLACE FUNCTION public.fn_is_course_teacher(p_course_id UUID)
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

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND teacher_id = v_uid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_enrolled(p_course_id UUID)
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

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = p_course_id AND user_id = v_uid AND status = 'approved'
  );
END;
$$;

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

  RETURN EXISTS (
    SELECT 1
    FROM public.course_enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = p_user_id AND c.teacher_id = v_uid AND e.status = 'approved'
  ) OR EXISTS (
    SELECT 1
    FROM public.course_enrollments a
    JOIN public.course_enrollments b ON b.course_id = a.course_id
    WHERE a.user_id = v_uid AND b.user_id = p_user_id
      AND a.status = 'approved' AND b.status = 'approved'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_can_view_submission(p_submission_id UUID)
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

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.submissions
    WHERE id = p_submission_id AND student_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.courses c ON c.id = (SELECT course_id FROM public.tasks WHERE id = s.task_id)
    WHERE s.id = p_submission_id AND c.teacher_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.id = p_submission_id AND v_uid = ANY (g.members)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_can_view_analysis(p_submission_id UUID, p_student_id TEXT)
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

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_student_id IS NOT NULL AND p_student_id = v_uid THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.tasks t ON t.id = s.task_id
    JOIN public.courses c ON c.id = t.course_id
    WHERE s.id = p_submission_id AND c.teacher_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  IF p_student_id IS NULL AND EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.id = p_submission_id AND v_uid = ANY (g.members)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_task_course_id(p_task_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
  SELECT course_id FROM public.tasks WHERE id = p_task_id
$$;

CREATE OR REPLACE FUNCTION public.get_course_preview(p_join_code TEXT)
RETURNS TABLE (
  course_id UUID,
  name TEXT,
  enrollment_mode TEXT,
  is_enrollment_locked BOOLEAN,
  due_date TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
  SELECT id, name, enrollment_mode, is_enrollment_locked, due_date
  FROM public.courses
  WHERE join_code = p_join_code
$$;

DROP TRIGGER IF EXISTS trg_debug_capture ON public.submissions;
DROP FUNCTION IF EXISTS public.debug_capture();
DROP TABLE IF EXISTS public.debug_log;

NOTIFY pgrst, 'reload schema';
