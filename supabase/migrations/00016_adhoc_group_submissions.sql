-- 00016: permitir entregas grupales ad-hoc (sin grupo formal) para que
-- cualquier integrante suba chats y cualquiera pueda enviar.
-- La validación estricta solo aplica cuando la tarea exige una categoría.
CREATE OR REPLACE FUNCTION validate_submission_group()
RETURNS TRIGGER AS $$
DECLARE
  v_is_group_task BOOLEAN;
  v_task_category_id UUID;
  v_group_category_id UUID;
  v_group_members UUID[];
BEGIN
  SELECT is_group_task, group_category_id
    INTO v_is_group_task, v_task_category_id
    FROM tasks WHERE id = NEW.task_id;

  IF v_is_group_task THEN
    IF NEW.group_id IS NOT NULL THEN
      SELECT category_id, members
        INTO v_group_category_id, v_group_members
        FROM groups WHERE id = NEW.group_id;

      IF v_task_category_id IS NOT NULL AND v_group_category_id IS DISTINCT FROM v_task_category_id THEN
        RAISE EXCEPTION 'El grupo seleccionado no pertenece a la categoría que exige esta tarea';
      END IF;

      IF NOT (NEW.student_id = ANY (v_group_members)) THEN
        RAISE EXCEPTION 'El estudiante no pertenece al grupo seleccionado';
      END IF;
    END IF;
    -- group_id NULL en tarea grupal: entrega grupal ad-hoc, permitida.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
