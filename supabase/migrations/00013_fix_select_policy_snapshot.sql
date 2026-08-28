CREATE OR REPLACE FUNCTION public.fn_user_in_group(p_group_id UUID)
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

  IF v_uid IS NULL OR p_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND v_uid = ANY (members)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_user_in_group(UUID) TO authenticated;

DROP POLICY IF EXISTS submissions_select_visible ON public.submissions;
CREATE POLICY submissions_select_visible ON public.submissions
  FOR SELECT TO authenticated
  USING (
    student_id = public.fn_requesting_user_id()
    OR public.fn_is_course_teacher(public.fn_task_course_id(task_id))
    OR (group_id IS NOT NULL AND public.fn_user_in_group(group_id))
  );

NOTIFY pgrst, 'reload schema';
