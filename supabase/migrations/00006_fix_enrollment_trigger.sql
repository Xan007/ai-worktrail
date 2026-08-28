CREATE OR REPLACE FUNCTION public.resolve_enrollment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS trg_resolve_enrollment_status ON public.course_enrollments;
CREATE TRIGGER trg_resolve_enrollment_status
BEFORE INSERT ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.resolve_enrollment_status();