CREATE OR REPLACE FUNCTION public.fn_requesting_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')
$$;

CREATE OR REPLACE FUNCTION public.validate_group_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_max_size INT;
  v_member_count INT;
BEGIN
  v_member_count := COALESCE(array_length(NEW.members, 1), 0);

  IF v_member_count < 2 THEN
    RAISE EXCEPTION 'A group must have at least 2 members';
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT max_size INTO v_max_size FROM public.group_categories WHERE id = NEW.category_id;

    IF v_max_size IS NULL THEN
      RAISE EXCEPTION 'Category % does not exist', NEW.category_id;
    END IF;

    IF v_member_count > v_max_size THEN
      RAISE EXCEPTION 'Group exceeds the max size (%) of its category', v_max_size;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_task_max_group_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_group_task THEN
    IF NEW.group_category_id IS NOT NULL THEN
      SELECT max_size INTO NEW.max_group_size
      FROM public.group_categories WHERE id = NEW.group_category_id;

      IF NEW.max_group_size IS NULL THEN
        RAISE EXCEPTION 'Group category % does not exist', NEW.group_category_id;
      END IF;
    ELSIF NEW.max_group_size IS NULL THEN
      RAISE EXCEPTION 'A group task without a category requires an explicit max_group_size';
    END IF;
  ELSE
    NEW.group_category_id := NULL;
    NEW.group_grading_mode := 'shared';
    NEW.max_group_size := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_submission_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_group_task BOOLEAN;
  v_task_category_id UUID;
  v_group_category_id UUID;
  v_group_members TEXT[];
BEGIN
  SELECT is_group_task, group_category_id
    INTO v_is_group_task, v_task_category_id
    FROM public.tasks WHERE id = NEW.task_id;

  IF v_is_group_task THEN
    IF NEW.group_id IS NULL THEN
      RAISE EXCEPTION 'This is a group task: group_id is required on the submission';
    END IF;

    SELECT category_id, members
      INTO v_group_category_id, v_group_members
      FROM public.groups WHERE id = NEW.group_id;

    IF v_group_category_id IS NULL AND v_group_members IS NULL THEN
      RAISE EXCEPTION 'Group % does not exist', NEW.group_id;
    END IF;

    IF v_task_category_id IS NOT NULL AND v_group_category_id IS DISTINCT FROM v_task_category_id THEN
      RAISE EXCEPTION 'The selected group does not belong to the category required by this task';
    END IF;

    IF NOT (NEW.student_id = ANY (v_group_members)) THEN
      RAISE EXCEPTION 'The student does not belong to the selected group';
    END IF;
  ELSE
    IF NEW.group_id IS NOT NULL THEN
      RAISE EXCEPTION 'This is an individual task: group_id must be null';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_submission_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_task_status TEXT;
  v_task_due TIMESTAMPTZ;
  v_course_due TIMESTAMPTZ;
BEGIN
  SELECT t.status, t.due_date, c.due_date
    INTO v_task_status, v_task_due, v_course_due
    FROM public.tasks t
    JOIN public.courses c ON c.id = t.course_id
    WHERE t.id = NEW.task_id;

  IF v_task_status IS NULL THEN
    RAISE EXCEPTION 'Task % does not exist', NEW.task_id;
  END IF;

  IF v_task_status = 'closed' THEN
    RAISE EXCEPTION 'Task is closed and no longer accepts submissions';
  END IF;

  IF v_task_due IS NOT NULL AND NOW() > v_task_due THEN
    RAISE EXCEPTION 'Task deadline has passed and no longer accepts submissions';
  END IF;

  IF v_course_due IS NOT NULL AND NOW() > v_course_due THEN
    RAISE EXCEPTION 'Course deadline has passed and no longer accepts submissions';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_enrollment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_mode TEXT;
  v_domain TEXT;
  v_pre_enrolled JSONB;
  v_locked BOOLEAN;
  v_email TEXT;
  v_matches_whitelist BOOLEAN;
BEGIN
  SELECT enrollment_mode, allowed_email_domain, pre_enrolled_emails, is_enrollment_locked
    INTO v_mode, v_domain, v_pre_enrolled, v_locked
    FROM public.courses WHERE id = NEW.course_id;

  IF v_mode IS NULL THEN
    RAISE EXCEPTION 'Course % does not exist', NEW.course_id;
  END IF;

  IF v_locked THEN
    RAISE EXCEPTION 'Enrollment is locked for this course';
  END IF;

  SELECT email INTO v_email FROM public.users WHERE id = NEW.user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User % does not exist', NEW.user_id;
  END IF;

  IF v_mode = 'open' THEN
    NEW.status := 'approved';
  ELSIF v_mode = 'approval' THEN
    NEW.status := 'pending';
  ELSE
    v_matches_whitelist :=
      (v_domain IS NOT NULL AND right(lower(v_email), length(lower(v_domain)) + 1) = '@' || lower(v_domain))
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(v_pre_enrolled) AS pre(email)
        WHERE lower(pre.email) = lower(v_email)
      );

    IF v_matches_whitelist THEN
      NEW.status := 'approved';
    ELSE
      NEW.status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_submission_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_last_version INT;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO v_last_version
  FROM public.submissions
  WHERE task_id = NEW.task_id AND student_id = NEW.student_id;

  NEW.version := v_last_version + 1;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS courses_teacher_all ON public.courses;
DROP POLICY IF EXISTS courses_member_select ON public.courses;
CREATE POLICY courses_select ON public.courses
  FOR SELECT TO authenticated
  USING (teacher_id = public.fn_requesting_user_id() OR public.fn_is_enrolled(id));
CREATE POLICY courses_insert ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = public.fn_requesting_user_id());
CREATE POLICY courses_update ON public.courses
  FOR UPDATE TO authenticated
  USING (teacher_id = public.fn_requesting_user_id())
  WITH CHECK (teacher_id = public.fn_requesting_user_id());
CREATE POLICY courses_delete ON public.courses
  FOR DELETE TO authenticated
  USING (teacher_id = public.fn_requesting_user_id());

DROP POLICY IF EXISTS group_categories_teacher_all ON public.group_categories;
DROP POLICY IF EXISTS group_categories_member_select ON public.group_categories;
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

DROP POLICY IF EXISTS groups_teacher_all ON public.groups;
DROP POLICY IF EXISTS groups_member_select ON public.groups;
DROP POLICY IF EXISTS groups_member_insert ON public.groups;
DROP POLICY IF EXISTS groups_member_update ON public.groups;
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
    OR (public.fn_is_enrolled(course_id) AND public.fn_requesting_user_id() = ANY (members))
  )
  WITH CHECK (
    public.fn_is_course_teacher(course_id)
    OR (public.fn_is_enrolled(course_id) AND public.fn_requesting_user_id() = ANY (members))
  );
CREATE POLICY groups_delete ON public.groups
  FOR DELETE TO authenticated
  USING (public.fn_is_course_teacher(course_id));

DROP POLICY IF EXISTS approved_gems_teacher_all ON public.approved_gems;
DROP POLICY IF EXISTS approved_gems_member_select ON public.approved_gems;
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

DROP POLICY IF EXISTS enrollments_insert_self ON public.course_enrollments;
DROP POLICY IF EXISTS enrollments_select_self ON public.course_enrollments;
DROP POLICY IF EXISTS enrollments_delete_own_pending ON public.course_enrollments;
DROP POLICY IF EXISTS enrollments_teacher_all ON public.course_enrollments;
CREATE POLICY enrollments_select ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (user_id = public.fn_requesting_user_id() OR public.fn_is_course_teacher(course_id));
CREATE POLICY enrollments_insert ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.fn_requesting_user_id() OR public.fn_is_course_teacher(course_id));
CREATE POLICY enrollments_update ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (public.fn_is_course_teacher(course_id))
  WITH CHECK (public.fn_is_course_teacher(course_id));
CREATE POLICY enrollments_delete ON public.course_enrollments
  FOR DELETE TO authenticated
  USING ((user_id = public.fn_requesting_user_id() AND status = 'pending') OR public.fn_is_course_teacher(course_id));

DROP POLICY IF EXISTS tasks_teacher_all ON public.tasks;
DROP POLICY IF EXISTS tasks_member_select ON public.tasks;
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
