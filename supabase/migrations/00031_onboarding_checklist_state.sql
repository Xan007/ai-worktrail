-- 00031: Persist onboarding checklist state in DB (not localStorage)
-- Tracks teacher onboarding progress across devices/browsers

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_checklist_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_has_invited BOOLEAN NOT NULL DEFAULT FALSE;

-- Policy: teachers can update their own onboarding state
DROP POLICY IF EXISTS users_update_own_onboarding ON public.users;
CREATE POLICY users_update_own_onboarding ON public.users
  FOR UPDATE TO authenticated
  USING ((select public.fn_requesting_user_id()) = id)
  WITH CHECK ((select public.fn_requesting_user_id()) = id);

-- RPC: mark checklist as dismissed for current user
CREATE OR REPLACE FUNCTION public.fn_dismiss_onboarding_checklist()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET onboarding_checklist_dismissed = TRUE
  WHERE id = public.fn_requesting_user_id();
$$;

-- RPC: mark "invited students" step as done
CREATE OR REPLACE FUNCTION public.fn_mark_onboarding_invited()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET onboarding_has_invited = TRUE
  WHERE id = public.fn_requesting_user_id();
$$;

-- RPC: reset onboarding (for testing)
CREATE OR REPLACE FUNCTION public.fn_reset_onboarding_checklist()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET onboarding_checklist_dismissed = FALSE,
      onboarding_has_invited = FALSE
  WHERE id = public.fn_requesting_user_id();
$$;

-- Grant access
DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.fn_dismiss_onboarding_checklist() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_mark_onboarding_invited() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_reset_onboarding_checklist() TO authenticated;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RPC: get checklist state for current user
CREATE OR REPLACE FUNCTION public.fn_get_onboarding_checklist_state()
RETURNS TABLE (
  dismissed BOOLEAN,
  has_invited BOOLEAN,
  has_courses BOOLEAN,
  has_tasks BOOLEAN
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    u.onboarding_checklist_dismissed,
    u.onboarding_has_invited,
    EXISTS(SELECT 1 FROM public.courses c WHERE c.teacher_id = u.id) AS has_courses,
    EXISTS(SELECT 1 FROM public.tasks t JOIN public.courses c ON c.id = t.course_id WHERE c.teacher_id = u.id) AS has_tasks
  FROM public.users u
  WHERE u.id = public.fn_requesting_user_id();
$$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.fn_get_onboarding_checklist_state() TO authenticated;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
