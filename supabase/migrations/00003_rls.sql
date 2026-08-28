ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_gems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_requesting_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')
$$;

CREATE OR REPLACE FUNCTION public.fn_is_course_teacher(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
STABLE
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
STABLE
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
STABLE
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
STABLE
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
STABLE
SET search_path = public
AS $$
  SELECT id, name, enrollment_mode, is_enrollment_locked, due_date
  FROM public.courses
  WHERE join_code = p_join_code
$$;

REVOKE EXECUTE ON FUNCTION public.fn_requesting_user_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_is_course_teacher(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_is_enrolled(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_can_view_user(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_can_view_submission(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_can_view_analysis(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_course_preview(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_requesting_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_course_teacher(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_enrolled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_view_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_view_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_view_analysis(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_preview(TEXT) TO authenticated, anon;

CREATE POLICY users_select_self_or_related ON public.users
  FOR SELECT TO authenticated
  USING (id = public.fn_requesting_user_id() OR public.fn_can_view_user(id));

CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = public.fn_requesting_user_id());

CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (id = public.fn_requesting_user_id())
  WITH CHECK (id = public.fn_requesting_user_id());

CREATE POLICY courses_teacher_all ON public.courses
  FOR ALL TO authenticated
  USING (teacher_id = public.fn_requesting_user_id())
  WITH CHECK (teacher_id = public.fn_requesting_user_id());

CREATE POLICY courses_member_select ON public.courses
  FOR SELECT TO authenticated
  USING (public.fn_is_enrolled(id));

CREATE POLICY group_categories_teacher_all ON public.group_categories
  FOR ALL TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));

CREATE POLICY group_categories_member_select ON public.group_categories
  FOR SELECT TO authenticated
  USING (public.fn_is_enrolled(course_id));

CREATE POLICY groups_teacher_all ON public.groups
  FOR ALL TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));

CREATE POLICY groups_member_select ON public.groups
  FOR SELECT TO authenticated
  USING (public.fn_is_enrolled(course_id));

CREATE POLICY groups_member_insert ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_enrolled(course_id));

CREATE POLICY groups_member_update ON public.groups
  FOR UPDATE TO authenticated
  USING (public.fn_is_enrolled(course_id) AND public.fn_requesting_user_id() = ANY (members))
  WITH CHECK (public.fn_is_enrolled(course_id) AND public.fn_requesting_user_id() = ANY (members));

CREATE POLICY approved_gems_teacher_all ON public.approved_gems
  FOR ALL TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));

CREATE POLICY approved_gems_member_select ON public.approved_gems
  FOR SELECT TO authenticated
  USING (public.fn_is_enrolled(course_id));

CREATE POLICY enrollments_insert_self ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.fn_requesting_user_id());

CREATE POLICY enrollments_select_self ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (user_id = public.fn_requesting_user_id());

CREATE POLICY enrollments_delete_own_pending ON public.course_enrollments
  FOR DELETE TO authenticated
  USING (user_id = public.fn_requesting_user_id() AND status = 'pending');

CREATE POLICY enrollments_teacher_all ON public.course_enrollments
  FOR ALL TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));

CREATE POLICY tasks_teacher_all ON public.tasks
  FOR ALL TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));

CREATE POLICY tasks_member_select ON public.tasks
  FOR SELECT TO authenticated
  USING (public.fn_is_enrolled(course_id));

CREATE POLICY submissions_insert_own ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.fn_requesting_user_id()
    AND public.fn_is_enrolled((SELECT course_id FROM public.tasks WHERE id = task_id))
  );

CREATE POLICY submissions_select_visible ON public.submissions
  FOR SELECT TO authenticated
  USING (public.fn_can_view_submission(id));

CREATE POLICY submission_chats_insert_own ON public.submission_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.fn_requesting_user_id()
    AND public.fn_can_view_submission(submission_id)
  );

CREATE POLICY submission_chats_select_visible ON public.submission_chats
  FOR SELECT TO authenticated
  USING (public.fn_can_view_submission(submission_id));

CREATE POLICY analysis_select_visible ON public.analysis
  FOR SELECT TO authenticated
  USING (public.fn_can_view_analysis(submission_id, student_id));
