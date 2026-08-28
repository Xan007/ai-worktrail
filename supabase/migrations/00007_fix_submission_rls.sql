CREATE OR REPLACE FUNCTION public.fn_task_course_id(p_task_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT course_id FROM public.tasks WHERE id = p_task_id
$$;

GRANT EXECUTE ON FUNCTION public.fn_task_course_id(UUID) TO authenticated;

DROP POLICY IF EXISTS submissions_insert_own ON public.submissions;
CREATE POLICY submissions_insert_own ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.fn_requesting_user_id()
    AND public.fn_is_enrolled(public.fn_task_course_id(task_id))
  );