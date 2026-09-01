-- 00034: Fix submissions INSERT RLS issue
--
-- Problem: Students who appear enrolled cannot insert submissions.
-- Root cause analysis:
--   The submissions INSERT policy calls fn_is_enrolled() which is SECURITY DEFINER.
--   fn_is_enrolled() queries course_enrollments with FORCE ROW LEVEL SECURITY enabled.
--   When called from a WITH CHECK clause, the SECURITY DEFINER function may not
--   properly resolve the caller's JWT context in some edge cases.
--
-- Fix: Simplify the submissions INSERT policy to inline the enrollment check,
-- and add a diagnostic function.

-- ============================================================
-- 1. Diagnostic function: call to see exactly what's failing
-- ============================================================
CREATE OR REPLACE FUNCTION public.diagnose_submission_rls(p_task_id UUID)
RETURNS TABLE(
  check_name TEXT,
  result TEXT,
  detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT;
  v_course_id UUID;
  v_enrollment_status TEXT;
  v_user_exists BOOLEAN;
BEGIN
  v_uid := public.fn_requesting_user_id();

  -- Check 1: JWT sub
  RETURN QUERY SELECT
    'JWT sub (fn_requesting_user_id)'::TEXT,
    COALESCE(v_uid, 'NULL - NOT AUTHENTICATED')::TEXT,
    'Clerk user ID from auth.jwt()->>sub'::TEXT;

  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 'DIAGNOSIS'::TEXT, 'FAIL'::TEXT, 'No JWT sub claim. Clerk token may not be configured correctly.'::TEXT;
    RETURN;
  END IF;

  -- Check 2: User row
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_uid) INTO v_user_exists;
  RETURN QUERY SELECT
    'User in users table'::TEXT,
    v_user_exists::TEXT,
    CASE WHEN v_user_exists THEN 'OK' ELSE 'MISSING - run fn_upsert_current_user_profile first' END::TEXT;

  IF NOT v_user_exists THEN
    RETURN QUERY SELECT 'DIAGNOSIS'::TEXT, 'FAIL'::TEXT, 'User row missing from users table.'::TEXT;
    RETURN;
  END IF;

  -- Check 3: Task → course
  SELECT course_id INTO v_course_id FROM public.tasks WHERE id = p_task_id;
  IF v_course_id IS NULL THEN
    RETURN QUERY SELECT 'Task exists'::TEXT, 'NO'::TEXT, 'Task not found'::TEXT;
    RETURN QUERY SELECT 'DIAGNOSIS'::TEXT, 'FAIL'::TEXT, 'Task does not exist.'::TEXT;
    RETURN;
  END IF;
  RETURN QUERY SELECT
    'Task course_id'::TEXT,
    v_course_id::TEXT,
    'Course for this task'::TEXT;

  -- Check 4: Enrollment (SECURITY DEFINER bypasses RLS)
  SELECT status INTO v_enrollment_status
  FROM public.course_enrollments
  WHERE course_id = v_course_id AND user_id = v_uid;

  IF v_enrollment_status IS NULL THEN
    RETURN QUERY SELECT 'Enrollment'::TEXT, 'NOT FOUND'::TEXT,
      'No enrollment row for user ' || v_uid || ' in course ' || v_course_id::TEXT;
    RETURN QUERY SELECT 'DIAGNOSIS'::TEXT, 'FAIL'::TEXT, 'User is not enrolled in this course.'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    'Enrollment status'::TEXT,
    v_enrollment_status::TEXT,
    CASE v_enrollment_status
      WHEN 'approved' THEN 'OK - should pass RLS'
      WHEN 'pending' THEN 'PROBLEM - enrollment is pending, not approved'
      WHEN 'rejected' THEN 'PROBLEM - enrollment was rejected'
      ELSE 'UNKNOWN STATUS'
    END::TEXT;

  IF v_enrollment_status != 'approved' THEN
    RETURN QUERY SELECT 'DIAGNOSIS'::TEXT, 'FAIL'::TEXT,
      'Enrollment status is "' || v_enrollment_status || '". Must be "approved".'::TEXT;
    RETURN;
  END IF;

  -- Check 5: fn_is_enrolled result
  RETURN QUERY SELECT
    'fn_is_enrolled()'::TEXT,
    public.fn_is_enrolled(v_course_id)::TEXT,
    'Direct call to fn_is_enrolled'::TEXT;

  -- All checks passed
  RETURN QUERY SELECT 'DIAGNOSIS'::TEXT, 'PASS'::TEXT,
    'All conditions met. If INSERT still fails, there may be a different policy issue.'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.diagnose_submission_rls(UUID) TO authenticated;

-- ============================================================
-- 2. Fix: Replace fn_is_enrolled in submissions INSERT policy
--    with an inline subquery that avoids SECURITY DEFINER issues
-- ============================================================

DROP POLICY IF EXISTS submissions_insert_own ON public.submissions;

CREATE POLICY submissions_insert_own ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (select public.fn_requesting_user_id())
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments e
      JOIN public.tasks t ON t.id = task_id
      WHERE e.course_id = t.course_id
        AND e.user_id = (select public.fn_requesting_user_id())
        AND e.status = 'approved'
    )
  );

-- Also fix submission_chats INSERT policy with the same approach
DROP POLICY IF EXISTS submission_chats_insert_own ON public.submission_chats;

CREATE POLICY submission_chats_insert_own ON public.submission_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (select public.fn_requesting_user_id())
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id
        AND s.student_id = (select public.fn_requesting_user_id())
    )
  );

NOTIFY pgrst, 'reload schema';
