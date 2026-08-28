CREATE OR REPLACE FUNCTION public.validate_group_size()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_validate_group_size
BEFORE INSERT OR UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.validate_group_size();

CREATE OR REPLACE FUNCTION public.sync_task_max_group_size()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_sync_task_max_group_size
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_task_max_group_size();

CREATE OR REPLACE FUNCTION public.validate_submission_group()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_validate_submission_group
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.validate_submission_group();

CREATE OR REPLACE FUNCTION public.guard_submission_window()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_guard_submission_window
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_submission_window();

CREATE OR REPLACE FUNCTION public.resolve_enrollment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_resolve_enrollment_status
BEFORE INSERT ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.resolve_enrollment_status();

CREATE OR REPLACE FUNCTION public.set_submission_version()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_set_submission_version
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.set_submission_version();
