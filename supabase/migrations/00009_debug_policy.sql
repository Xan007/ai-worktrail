CREATE OR REPLACE FUNCTION public.debug_policy_pieces(p_task_id UUID, p_student_id TEXT)
RETURNS TABLE (
  req_uid TEXT,
  task_course UUID,
  enrolled BOOLEAN,
  student_matches BOOLEAN,
  full_check BOOLEAN
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.fn_requesting_user_id(),
    public.fn_task_course_id(p_task_id),
    public.fn_is_enrolled(public.fn_task_course_id(p_task_id)),
    (p_student_id = public.fn_requesting_user_id()),
    (p_student_id = public.fn_requesting_user_id() AND public.fn_is_enrolled(public.fn_task_course_id(p_task_id)))
$$;

REVOKE EXECUTE ON FUNCTION public.debug_policy_pieces(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.debug_policy_pieces(UUID, TEXT) TO authenticated;
