CREATE TABLE IF NOT EXISTS public.debug_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.debug_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.debug_capture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.debug_log (context)
  VALUES (
    jsonb_build_object(
      'current_user', current_user,
      'session_user', session_user,
      'claims', current_setting('request.jwt.claims', TRUE),
      'claim_sub', current_setting('request.jwt.claim.sub', TRUE),
      'req_uid', public.fn_requesting_user_id(),
      'new_task_id', NEW.task_id,
      'new_student_id', NEW.student_id,
      'task_course', public.fn_task_course_id(NEW.task_id),
      'enrolled', public.fn_is_enrolled(public.fn_task_course_id(NEW.task_id))
    )
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_debug_capture ON public.submissions;
CREATE TRIGGER trg_debug_capture
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.debug_capture();
