-- 00036_recreate_submissions_clean.sql
DROP TRIGGER IF EXISTS trg_validate_submission_group ON public.submissions CASCADE;
DROP TRIGGER IF EXISTS trg_guard_submission_window ON public.submissions CASCADE;
DROP TRIGGER IF EXISTS trg_set_submission_version ON public.submissions CASCADE;

DROP FUNCTION IF EXISTS public.validate_submission_group() CASCADE;
DROP FUNCTION IF EXISTS public.guard_submission_window() CASCADE;
DROP FUNCTION IF EXISTS public.set_submission_version() CASCADE;

DROP TABLE IF EXISTS public.analysis CASCADE;
DROP TABLE IF EXISTS public.submission_chats CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1,
  pending_task_name TEXT
);

CREATE TABLE public.submission_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chat_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'gemini'
    CHECK (platform IN ('gemini', 'claude', 'chatgpt', 'other')),
  is_gem BOOLEAN NOT NULL DEFAULT FALSE,
  approved_gem_id UUID REFERENCES public.approved_gems(id) ON DELETE SET NULL,
  gem_instructions_pasted TEXT,
  extracted_text TEXT,
  extraction_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) CHECK (score BETWEEN 0 AND 100),
  justification TEXT,
  breakdown JSONB,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_task ON public.submissions (task_id);
CREATE INDEX idx_submissions_student ON public.submissions (student_id);
CREATE INDEX idx_submissions_group ON public.submissions (group_id);
CREATE INDEX idx_submission_chats_submission ON public.submission_chats (submission_id);
CREATE INDEX idx_submission_chats_student ON public.submission_chats (student_id);
CREATE INDEX idx_analysis_submission ON public.analysis (submission_id);
CREATE INDEX idx_analysis_student ON public.analysis (student_id);

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
      RAISE EXCEPTION 'Esta tarea es grupal: se requiere group_id en la entrega';
    END IF;

    SELECT category_id, members
      INTO v_group_category_id, v_group_members
      FROM public.groups WHERE id = NEW.group_id;

    IF v_group_category_id IS NULL AND v_group_members IS NULL THEN
      RAISE EXCEPTION 'El grupo % no existe', NEW.group_id;
    END IF;

    IF v_task_category_id IS NOT NULL AND v_group_category_id IS DISTINCT FROM v_task_category_id THEN
      RAISE EXCEPTION 'El grupo seleccionado no pertenece a la categoría requerida por la tarea';
    END IF;

    IF NOT (NEW.student_id = ANY (v_group_members)) THEN
      RAISE EXCEPTION 'El estudiante no pertenece al grupo seleccionado';
    END IF;
  ELSE
    IF NEW.group_id IS NOT NULL THEN
      RAISE EXCEPTION 'Esta tarea es individual: group_id debe ser nulo';
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
  v_allow_resubmission BOOLEAN;
  v_has_previous BOOLEAN;
BEGIN
  SELECT t.status, t.due_date, c.due_date, COALESCE(t.allow_resubmission, TRUE)
    INTO v_task_status, v_task_due, v_course_due, v_allow_resubmission
    FROM public.tasks t
    JOIN public.courses c ON c.id = t.course_id
    WHERE t.id = NEW.task_id;

  IF v_task_status IS NULL THEN
    RAISE EXCEPTION 'La tarea % no existe', NEW.task_id;
  END IF;

  IF v_task_status = 'closed' THEN
    RAISE EXCEPTION 'La tarea está cerrada y ya no acepta entregas';
  END IF;

  IF v_task_due IS NOT NULL AND NOW() > v_task_due THEN
    RAISE EXCEPTION 'La fecha límite de la tarea ha vencido';
  END IF;

  IF v_course_due IS NOT NULL AND NOW() > v_course_due THEN
    RAISE EXCEPTION 'La fecha límite del curso ha vencido';
  END IF;

  IF NOT v_allow_resubmission THEN
    SELECT EXISTS (
      SELECT 1 FROM public.submissions
      WHERE task_id = NEW.task_id AND student_id = NEW.student_id
    ) INTO v_has_previous;

    IF v_has_previous THEN
      RAISE EXCEPTION 'Esta tarea no permite reentregas';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_submission_window
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_submission_window();

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.submission_chats FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analysis FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_requesting_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')
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
    JOIN public.tasks t ON t.id = s.task_id
    JOIN public.courses c ON c.id = t.course_id
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

REVOKE EXECUTE ON FUNCTION public.fn_can_view_submission(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_can_view_analysis(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_requesting_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_view_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_can_view_analysis(UUID, TEXT) TO authenticated;

CREATE POLICY submissions_select_visible ON public.submissions
  FOR SELECT TO authenticated
  USING (public.fn_can_view_submission(id));

CREATE POLICY submissions_insert_own ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT public.fn_requesting_user_id())
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments e
      JOIN public.tasks t ON t.id = task_id
      WHERE e.course_id = t.course_id
        AND e.user_id = (SELECT public.fn_requesting_user_id())
        AND e.status = 'approved'
    )
  );

CREATE POLICY submissions_delete_own_or_teacher ON public.submissions
  FOR DELETE TO authenticated
  USING (
    student_id = (SELECT public.fn_requesting_user_id())
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.courses c ON c.id = t.course_id
      WHERE t.id = task_id AND c.teacher_id = (SELECT public.fn_requesting_user_id())
    )
  );

CREATE POLICY submission_chats_select_visible ON public.submission_chats
  FOR SELECT TO authenticated
  USING (public.fn_can_view_submission(submission_id));

CREATE POLICY submission_chats_insert_own ON public.submission_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT public.fn_requesting_user_id())
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id
        AND s.student_id = (SELECT public.fn_requesting_user_id())
    )
  );

CREATE POLICY analysis_select_visible ON public.analysis
  FOR SELECT TO authenticated
  USING (public.fn_can_view_analysis(submission_id, student_id));

NOTIFY pgrst, 'reload schema';
