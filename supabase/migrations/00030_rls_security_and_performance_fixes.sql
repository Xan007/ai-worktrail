-- 00030: RLS Security & Performance Fixes
--
-- Applied from supabase/agent-skills best practices:
--   security-rls-basics.md, security-rls-performance.md, security-privileges.md
--
-- Issues fixed:
--   1. fn_requesting_user_id() was VOLATILE → must be STABLE (JWT is constant per tx)
--   2. RLS policies called fn_requesting_user_id() per-row → wrap in (select ...) for 100x perf
--   3. SECURITY DEFINER functions in public were callable by all roles → revoke PUBLIC
--   4. Helper functions were VOLATILE → change to STABLE for query planner optimization

-- ============================================================
-- 1. Fix fn_requesting_user_id(): VOLATILE → STABLE
-- ============================================================
-- The JWT 'sub' claim is constant during a transaction, so STABLE is correct.
-- This lets Postgres cache the result across rows in a single query.

CREATE OR REPLACE FUNCTION public.fn_requesting_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')
$$;

-- ============================================================
-- 2. Fix helper functions: VOLATILE → STABLE
-- ============================================================

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
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
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
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
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
  IF v_uid IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;
  IF v_uid = p_user_id THEN RETURN TRUE; END IF;
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
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (
    SELECT 1 FROM public.submissions
    WHERE id = p_submission_id AND student_id = v_uid
  ) THEN RETURN TRUE; END IF;
  IF EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.courses c ON c.id = (SELECT course_id FROM public.tasks WHERE id = s.task_id)
    WHERE s.id = p_submission_id AND c.teacher_id = v_uid
  ) THEN RETURN TRUE; END IF;
  IF EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.id = p_submission_id AND v_uid = ANY (g.members)
  ) THEN RETURN TRUE; END IF;
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
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  IF p_student_id IS NOT NULL AND p_student_id = v_uid THEN RETURN TRUE; END IF;
  IF EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.tasks t ON t.id = s.task_id
    JOIN public.courses c ON c.id = t.course_id
    WHERE s.id = p_submission_id AND c.teacher_id = v_uid
  ) THEN RETURN TRUE; END IF;
  IF p_student_id IS NULL AND EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.id = p_submission_id AND v_uid = ANY (g.members)
  ) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

-- ============================================================
-- 3. Revoke PUBLIC EXECUTE on SECURITY DEFINER functions
-- ============================================================
-- Per skill: "SECURITY DEFINER functions in public are callable by all roles.
-- Revoke EXECUTE from any role that shouldn't call them directly."

DO $$
DECLARE
  func RECORD;
BEGIN
  FOR func IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', func.sig);
    EXCEPTION WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
      -- Ignore if we don't have permission
    END;
  END LOOP;
END $$;

-- Grant EXECUTE only to authenticated (and service_role via bypassrls)
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.fn_requesting_user_id() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_is_course_teacher(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_is_enrolled(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_can_view_user(TEXT) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_can_view_submission(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_can_view_analysis(UUID, TEXT) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_course_preview(TEXT) TO authenticated, anon;
  GRANT EXECUTE ON FUNCTION public.fn_get_current_user_profile() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_get_users_by_ids(TEXT[]) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_upsert_current_user_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. Performance: wrap fn_requesting_user_id() in (select ...)
--    in all RLS policies so it's called ONCE per query, not per-row.
-- ============================================================
-- Per security-rls-performance.md: "auth.uid() called per row = 1M calls on 1M rows.
-- Wrap in (select ...) = called once, 100x+ faster."

-- Drop and recreate all policies with (select fn_requesting_user_id()) pattern

-- === users ===
DROP POLICY IF EXISTS users_select_self_or_related ON public.users;
DROP POLICY IF EXISTS users_insert_self ON public.users;
DROP POLICY IF EXISTS users_update_self ON public.users;

CREATE POLICY users_select_self_or_related ON public.users
  FOR SELECT TO authenticated
  USING ((select public.fn_requesting_user_id()) = id OR public.fn_can_view_user(id));

CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK ((select public.fn_requesting_user_id()) = id);

CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING ((select public.fn_requesting_user_id()) = id)
  WITH CHECK ((select public.fn_requesting_user_id()) = id);

-- === courses ===
DROP POLICY IF EXISTS courses_select ON public.courses;
DROP POLICY IF EXISTS courses_insert ON public.courses;
DROP POLICY IF EXISTS courses_update ON public.courses;
DROP POLICY IF EXISTS courses_delete ON public.courses;

CREATE POLICY courses_select ON public.courses
  FOR SELECT TO authenticated
  USING (teacher_id = (select public.fn_requesting_user_id()) OR public.fn_is_enrolled(id));
CREATE POLICY courses_insert ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = (select public.fn_requesting_user_id()));
CREATE POLICY courses_update ON public.courses
  FOR UPDATE TO authenticated
  USING (teacher_id = (select public.fn_requesting_user_id()))
  WITH CHECK (teacher_id = (select public.fn_requesting_user_id()));
CREATE POLICY courses_delete ON public.courses
  FOR DELETE TO authenticated
  USING (teacher_id = (select public.fn_requesting_user_id()));

-- === group_categories ===
DROP POLICY IF EXISTS group_categories_select ON public.group_categories;
DROP POLICY IF EXISTS group_categories_insert ON public.group_categories;
DROP POLICY IF EXISTS group_categories_update ON public.group_categories;
DROP POLICY IF EXISTS group_categories_delete ON public.group_categories;

CREATE POLICY group_categories_select ON public.group_categories
  FOR SELECT TO authenticated
  USING (public.fn_is_course_teacher(course_id) OR public.fn_is_enrolled(course_id));
CREATE POLICY group_categories_insert ON public.group_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY group_categories_update ON public.group_categories
  FOR UPDATE TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY group_categories_delete ON public.group_categories
  FOR DELETE TO authenticated
  USING (public.fn_is_course_teacher(course_id));

-- === groups ===
DROP POLICY IF EXISTS groups_select ON public.groups;
DROP POLICY IF EXISTS groups_insert ON public.groups;
DROP POLICY IF EXISTS groups_update ON public.groups;
DROP POLICY IF EXISTS groups_delete ON public.groups;

CREATE POLICY groups_select ON public.groups
  FOR SELECT TO authenticated
  USING (public.fn_is_course_teacher(course_id) OR public.fn_is_enrolled(course_id));
CREATE POLICY groups_insert ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_course_teacher(course_id) OR public.fn_is_enrolled(course_id));
CREATE POLICY groups_update ON public.groups
  FOR UPDATE TO authenticated
  USING (
    public.fn_is_course_teacher(course_id)
    OR (public.fn_is_enrolled(course_id) AND (select public.fn_requesting_user_id()) = ANY (members))
  )
  WITH CHECK (
    public.fn_is_course_teacher(course_id)
    OR (public.fn_is_enrolled(course_id) AND (select public.fn_requesting_user_id()) = ANY (members))
  );
CREATE POLICY groups_delete ON public.groups
  FOR DELETE TO authenticated
  USING (public.fn_is_course_teacher(course_id));

-- === approved_gems ===
DROP POLICY IF EXISTS approved_gems_select ON public.approved_gems;
DROP POLICY IF EXISTS approved_gems_insert ON public.approved_gems;
DROP POLICY IF EXISTS approved_gems_update ON public.approved_gems;
DROP POLICY IF EXISTS approved_gems_delete ON public.approved_gems;

CREATE POLICY approved_gems_select ON public.approved_gems
  FOR SELECT TO authenticated
  USING (public.fn_is_course_teacher(course_id) OR public.fn_is_enrolled(course_id));
CREATE POLICY approved_gems_insert ON public.approved_gems
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY approved_gems_update ON public.approved_gems
  FOR UPDATE TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY approved_gems_delete ON public.approved_gems
  FOR DELETE TO authenticated
  USING (public.fn_is_course_teacher(course_id));

-- === course_enrollments ===
DROP POLICY IF EXISTS enrollments_select ON public.course_enrollments;
DROP POLICY IF EXISTS enrollments_insert ON public.course_enrollments;
DROP POLICY IF EXISTS enrollments_update ON public.course_enrollments;
DROP POLICY IF EXISTS enrollments_delete ON public.course_enrollments;

CREATE POLICY enrollments_select ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (user_id = (select public.fn_requesting_user_id()) OR public.fn_is_course_teacher(course_id));
CREATE POLICY enrollments_insert ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select public.fn_requesting_user_id()) OR public.fn_is_course_teacher(course_id));
CREATE POLICY enrollments_update ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY enrollments_delete ON public.course_enrollments
  FOR DELETE TO authenticated
  USING ((user_id = (select public.fn_requesting_user_id()) AND status = 'pending') OR public.fn_is_course_teacher(course_id));

-- === tasks ===
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (public.fn_is_course_teacher(course_id) OR public.fn_is_enrolled(course_id));
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE TO authenticated
  USING (public.fn_is_course_teacher(course_id));

-- === submissions ===
DROP POLICY IF EXISTS submissions_insert_own ON public.submissions;
DROP POLICY IF EXISTS submissions_select_visible ON public.submissions;

CREATE POLICY submissions_insert_own ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (select public.fn_requesting_user_id())
    AND public.fn_is_enrolled((SELECT course_id FROM public.tasks WHERE id = task_id))
  );
CREATE POLICY submissions_select_visible ON public.submissions
  FOR SELECT TO authenticated
  USING (public.fn_can_view_submission(id));

-- === submission_chats ===
DROP POLICY IF EXISTS submission_chats_insert_own ON public.submission_chats;
DROP POLICY IF EXISTS submission_chats_select_visible ON public.submission_chats;

CREATE POLICY submission_chats_insert_own ON public.submission_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (select public.fn_requesting_user_id())
    AND public.fn_can_view_submission(submission_id)
  );
CREATE POLICY submission_chats_select_visible ON public.submission_chats
  FOR SELECT TO authenticated
  USING (public.fn_can_view_submission(submission_id));

-- === analysis ===
DROP POLICY IF EXISTS analysis_select_visible ON public.analysis;

CREATE POLICY analysis_select_visible ON public.analysis
  FOR SELECT TO authenticated
  USING (public.fn_can_view_analysis(submission_id, student_id));

-- ============================================================
-- 5. Force RLS on all tables (defense in depth)
-- ============================================================
-- Per best practice: "Force RLS even for table owners"

ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.courses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.group_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approved_gems FORCE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.submission_chats FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analysis FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 6. Ensure indexes exist on RLS policy columns
-- ============================================================
-- Per best practice: "Always add indexes on columns used in RLS policies"

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses (teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.course_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_status ON public.course_enrollments (course_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submission_chats_student_id ON public.submission_chats (student_id);
CREATE INDEX IF NOT EXISTS idx_analysis_submission_id ON public.analysis (submission_id);
CREATE INDEX IF NOT EXISTS idx_groups_members ON public.groups USING gin (members);
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users (id);

NOTIFY pgrst, 'reload schema';
