-- 00037_fix_submissions_select_snapshot.sql
-- Fix SELECT policy snapshot bug on INSERT ... RETURNING

CREATE OR REPLACE FUNCTION public.fn_task_course_id(p_task_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT course_id FROM public.tasks WHERE id = p_task_id
$$;

CREATE OR REPLACE FUNCTION public.fn_user_in_group(p_group_id UUID)
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

  IF v_uid IS NULL OR p_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND v_uid = ANY (members)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_task_course_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_user_in_group(UUID) TO authenticated;

-- Drop and recreate submissions_select_visible without re-querying submissions table
DROP POLICY IF EXISTS submissions_select_visible ON public.submissions;
CREATE POLICY submissions_select_visible ON public.submissions
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT public.fn_requesting_user_id())
    OR public.fn_is_course_teacher(public.fn_task_course_id(task_id))
    OR (group_id IS NOT NULL AND public.fn_user_in_group(group_id))
  );

-- Drop and recreate submission_chats policies to avoid snapshot query issues
DROP POLICY IF EXISTS submission_chats_select_visible ON public.submission_chats;
CREATE POLICY submission_chats_select_visible ON public.submission_chats
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT public.fn_requesting_user_id())
    OR public.fn_can_view_submission(submission_id)
  );

DROP POLICY IF EXISTS submission_chats_insert_own ON public.submission_chats;
CREATE POLICY submission_chats_insert_own ON public.submission_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT public.fn_requesting_user_id())
  );

NOTIFY pgrst, 'reload schema';
