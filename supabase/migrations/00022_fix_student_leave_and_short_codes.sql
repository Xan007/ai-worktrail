-- 00022: permitir que estudiante salga aunque esté aprobado + asegurar códigos cortos funcionan

-- Fix enrollments_delete: allow self-delete regardless of status (pending/approved/rejected)
DROP POLICY IF EXISTS enrollments_delete ON public.course_enrollments;
CREATE POLICY enrollments_delete ON public.course_enrollments
  FOR DELETE TO authenticated
  USING (
    user_id = public.fn_requesting_user_id()
    OR public.fn_is_course_teacher(course_id)
  );

-- Ensure short code generator is VOLATILE and has proper search_path
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Normalize any remaining join_codes to uppercase (handles old hex lowercase)
UPDATE public.courses SET join_code = upper(join_code) WHERE join_code <> upper(join_code);

-- Ensure any future task join_code lookups via getCoursePreview are case-insensitive:
-- update get_course_preview to upper() the input comparison
CREATE OR REPLACE FUNCTION public.get_course_preview(p_join_code TEXT)
RETURNS TABLE (
  course_id UUID,
  name TEXT,
  enrollment_mode TEXT,
  is_enrollment_locked BOOLEAN,
  due_date TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
  SELECT id, name, enrollment_mode, is_enrollment_locked, due_date
  FROM public.courses
  WHERE upper(join_code) = upper(trim(p_join_code))
$$;

GRANT EXECUTE ON FUNCTION public.get_course_preview(TEXT) TO authenticated, anon;

-- Guard: block resubmission when task does not allow it
CREATE OR REPLACE FUNCTION public.guard_allow_resubmission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_allow BOOLEAN;
BEGIN
  SELECT allow_resubmission INTO v_allow FROM public.tasks WHERE id = NEW.task_id;
  IF v_allow IS NOT NULL AND v_allow = false THEN
    IF EXISTS (SELECT 1 FROM public.submissions WHERE task_id = NEW.task_id AND student_id = NEW.student_id) THEN
      RAISE EXCEPTION 'Esta tarea no permite corregir la entrega.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_allow_resubmission ON public.submissions;
CREATE TRIGGER trg_guard_allow_resubmission BEFORE INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.guard_allow_resubmission();

NOTIFY pgrst, 'reload schema';
