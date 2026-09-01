-- 00034: Diagnostic function to debug submissions INSERT RLS failures
-- Call via: SELECT * FROM diagnose_submission_rls('task-uuid-here');

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
  v_student_exists BOOLEAN;
  v_task_exists BOOLEAN;
  v_course_exists BOOLEAN;
  v_enrollment_exists BOOLEAN;
BEGIN
  -- 1. Check JWT sub claim
  v_uid := public.fn_requesting_user_id();
  RETURN QUERY SELECT
    '1. fn_requesting_user_id()'::TEXT,
    COALESCE(v_uid, 'NULL')::TEXT,
    'This is the Clerk user ID from auth.jwt()->>sub'::TEXT;

  -- 2. Check if user exists in users table
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_uid) INTO v_student_exists;
  RETURN QUERY SELECT
    '2. User exists in users table'::TEXT,
    v_student_exists::TEXT,
    CASE WHEN v_student_exists THEN 'User row found' ELSE 'NO USER ROW - this will cause FK violation' END::TEXT;

  -- 3. Check if task exists and get course_id
  SELECT course_id INTO v_course_id FROM public.tasks WHERE id = p_task_id;
  v_task_exists := v_course_id IS NOT NULL;
  RETURN QUERY SELECT
    '3. Task exists'::TEXT,
    v_task_exists::TEXT,
    COALESCE('course_id = ' || v_course_id::TEXT, 'Task not found')::TEXT;

  -- 4. Check if course exists
  IF v_course_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = v_course_id) INTO v_course_exists;
    RETURN QUERY SELECT
      '4. Course exists'::TEXT,
      v_course_exists::TEXT,
      COALESCE('Course found', 'Course not found')::TEXT;
  ELSE
    RETURN QUERY SELECT '4. Course exists'::TEXT, 'N/A'::TEXT, 'No course_id from task'::TEXT;
  END IF;

  -- 5. Check enrollment (raw query, bypasses RLS since SECURITY DEFINER)
  IF v_course_id IS NOT NULL AND v_uid IS NOT NULL THEN
    SELECT status INTO v_enrollment_status
    FROM public.course_enrollments
    WHERE course_id = v_course_id AND user_id = v_uid;
    
    v_enrollment_exists := v_enrollment_status IS NOT NULL;
    RETURN QUERY SELECT
      '5. Enrollment exists'::TEXT,
      v_enrollment_exists::TEXT,
      COALESCE('status = ' || v_enrollment_status, 'NO ENROLLMENT ROW')::TEXT;

    RETURN QUERY SELECT
      '6. Enrollment is approved'::TEXT,
      (v_enrollment_status = 'approved')::TEXT,
      COALESCE('status = ' || v_enrollment_status, 'Cannot check - no enrollment')::TEXT;
  ELSE
    RETURN QUERY SELECT '5. Enrollment exists'::TEXT, 'N/A'::TEXT, 'Missing user_id or course_id'::TEXT;
    RETURN QUERY SELECT '6. Enrollment is approved'::TEXT, 'N/A'::TEXT, 'Missing user_id or course_id'::TEXT;
  END IF;

  -- 7. Test fn_is_enrolled directly
  IF v_course_id IS NOT NULL THEN
    RETURN QUERY SELECT
      '7. fn_is_enrolled()'::TEXT,
      public.fn_is_enrolled(v_course_id)::TEXT,
      'Should match enrollment status check above'::TEXT;
  ELSE
    RETURN QUERY SELECT '7. fn_is_enrolled()'::TEXT, 'N/A'::TEXT, 'No course_id'::TEXT;
  END IF;

  -- 8. Summary
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 'RESULT'::TEXT, 'BLOCKED'::TEXT, 'fn_requesting_user_id() returned NULL - JWT may be missing or invalid'::TEXT;
  ELSIF NOT v_student_exists THEN
    RETURN QUERY SELECT 'RESULT'::TEXT, 'BLOCKED'::TEXT, 'User does not exist in users table - run fn_upsert_current_user_profile first'::TEXT;
  ELSIF NOT v_task_exists THEN
    RETURN QUERY SELECT 'RESULT'::TEXT, 'BLOCKED'::TEXT, 'Task does not exist'::TEXT;
  ELSIF v_enrollment_status IS NULL THEN
    RETURN QUERY SELECT 'RESULT'::TEXT, 'BLOCKED'::TEXT, 'No enrollment record for this user in this course'::TEXT;
  ELSIF v_enrollment_status != 'approved' THEN
    RETURN QUERY SELECT 'RESULT'::TEXT, 'BLOCKED'::TEXT, 'Enrollment status is "' || v_enrollment_status || '" - must be "approved"'::TEXT;
  ELSE
    RETURN QUERY SELECT 'RESULT'::TEXT, 'SHOULD PASS'::TEXT, 'All conditions met - RLS should allow INSERT'::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.diagnose_submission_rls(UUID) TO authenticated;
