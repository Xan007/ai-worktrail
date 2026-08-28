# Schema de Base de Datos (Supabase / Postgres)

## Tablas

```sql
-- Usuarios (gestionados por Clerk, sincronizados en Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'email', -- 'email' | 'google'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-tenancy (por universidad / institución)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cursos
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  enrollment_mode TEXT NOT NULL DEFAULT 'open'
    CHECK (enrollment_mode IN ('open', 'approval', 'whitelist')),
  allowed_email_domain TEXT, -- ej: "universidad.edu.ar"
  pre_enrolled_emails JSONB DEFAULT '[]'::jsonb, -- ["a@x.com","b@x.com"]
  is_enrollment_locked BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMPTZ, -- fecha y hora máxima de entrega del curso
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de grupo (por curso). Ahora SÍ pueden condicionar qué grupos
-- entregan en una tarea — ver `tasks.group_category_id` más abajo.
CREATE TABLE group_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ej: "Proyecto Final", "Corte 1"
  max_size INT NOT NULL CHECK (max_size >= 2), -- tamaño máximo de los grupos de esta categoría
  UNIQUE(course_id, name)
);

-- Grupos (opcionalmente pertenecen a una categoría del curso).
-- Un estudiante puede estar en más de un grupo (por ejemplo, uno por categoría):
-- no hay restricción de unicidad de usuario entre grupos.
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES group_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL, -- ej: "Grupo A"
  members UUID[] NOT NULL DEFAULT '{}', -- array de user_ids
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, name)
);

-- Inscripciones a cursos
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- Tareas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date TIMESTAMPTZ, -- fecha y hora máxima de entrega
  is_group_task BOOLEAN DEFAULT FALSE,
  group_category_id UUID REFERENCES group_categories(id) ON DELETE SET NULL,
    -- si NO es NULL: solo grupos de esta categoría pueden entregar (ver trigger validate_submission_group)
    -- si es NULL: la tarea grupal acepta cualquier grupo (comportamiento libre)
  max_group_size INT CHECK (max_group_size >= 2),
    -- si group_category_id es NULL: el profesor lo define directamente
    -- si group_category_id NO es NULL: se autocompleta con el max_size de la categoría (ver trigger sync_task_max_group_size)
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  ai_evaluation_mode TEXT NOT NULL DEFAULT 'on_demand'
    CHECK (ai_evaluation_mode IN ('on_submit', 'on_demand')),
    -- 'on_submit': se dispara la evaluación (Jina Reader + Gemini) apenas el estudiante entrega
    -- 'on_demand': no se evalúa nada hasta que el profesor abre esa entrega puntual para revisarla
  group_grading_mode TEXT NOT NULL DEFAULT 'shared'
    CHECK (group_grading_mode IN ('shared', 'individual')),
    -- solo relevante si is_group_task = true
    -- 'shared': un solo análisis para toda la entrega, mismo puntaje para todos los miembros
    -- 'individual': un análisis por integrante, basado solo en los chats que ese integrante aportó (submission_chats.student_id)
  created_by TEXT NOT NULL DEFAULT 'teacher'
    CHECK (created_by IN ('teacher', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entregas
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL, -- null si es individual
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1,
  pending_task_name TEXT -- usado en el flujo abierto sin tarea creada
);

-- Gemas de Gemini aprobadas por el profesor para un curso (opcional).
-- Una entrega que use una de estas se considera "verificada": el profesor
-- conoce/controla las instrucciones de esta Gema puntual.
CREATE TABLE approved_gems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ej: "Gema oficial del curso"
  gem_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats de IA incluidos en una entrega (uno o más)
CREATE TABLE submission_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- quién pegó esta URL. En entrega individual coincide siempre con submissions.student_id.
    -- En entrega grupal es clave cuando group_grading_mode = 'individual': permite evaluar
    -- a cada integrante solo con los chats que él mismo aportó.
  chat_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'gemini'
    CHECK (platform IN ('gemini', 'claude', 'chatgpt', 'other')),
  is_gem BOOLEAN DEFAULT FALSE,
    -- lo completa la Edge Function al analizar el chat_url: patrones de URL (/gem/, ?gem=),
    -- match contra approved_gems normalizadas, o marcador de contenido ("creator's Gem")
  approved_gem_id UUID REFERENCES approved_gems(id) ON DELETE SET NULL,
    -- si is_gem = true y coincide con una Gema de la lista aprobada del curso, se linkea acá ("verificada")
    -- si is_gem = true pero no está en la lista, queda NULL ("gema no verificada")
  gem_instructions_pasted TEXT, -- opcional: instrucciones que el estudiante dice que tiene la Gema (no verificable por el sistema)
  extracted_text TEXT,
    -- texto crudo extraído del share por la función de evaluación (solo mensajes del estudiante,
    -- vía Jina Reader con X-Target-Selector). Alimenta el panel docente "View prompts" con
    -- marcadores de turno [CN-MK]. NULL si la extracción falló.
  extraction_error TEXT,
    -- motivo por el que no se pudo leer el enlace (share eliminado, privado/requiere login,
    -- render fallido). La UI lo muestra bajo el chat. NULL cuando la extracción fue exitosa.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Análisis / Calificación
CREATE TABLE analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    -- NULL: análisis de toda la entrega (individual, o grupal con group_grading_mode = 'shared')
    -- con valor: análisis de un integrante puntual (grupal con group_grading_mode = 'individual')
    -- una entrega grupal en modo 'individual' genera una fila de analysis por cada integrante
  score NUMERIC(5,2), -- 0 a 100; total ponderado calculado en código a partir de breakdown.criteria
  justification TEXT, -- resumen legible (= breakdown.summary); se mantiene por compatibilidad
  breakdown JSONB,
    -- desglose estructurado y auditable del puntaje (ver docs/evaluation-breakdown-design.md):
    -- { profile: productive_passenger|reluctant_optimizer|mental_marathoner,
    --   criteria: [{ key, rating 0-100, band {level,label,description}, explanation,
    --               evidence: [{chat, message, quote}] }],
    --   strengths: [], improvements: [], summary }
    -- Filas anteriores a esta feature tienen breakdown = NULL (la UI muestra render simple).
  flagged BOOLEAN DEFAULT FALSE, -- total <= 30 (umbral determinístico, rango "Pasajero productivo")
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Políticas RLS (Row-Level Security)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_gems ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis ENABLE ROW LEVEL SECURITY;
```

### Políticas principales

**Profesor (teacher):**
- Ve/edita sus propios cursos.
- Ve entregas de sus cursos.
- Ve análisis de sus cursos.

**Estudiante (student):**
- Ve solo cursos donde está `approved`.
- Ve/crea submissions solo suyos (o de su grupo).
- Ve análisis solo de sus propios submissions.

**Nota de integración Clerk → Supabase RLS:**
Clerk devuelve un JWT con `sub = user.id`. Supabase RLS espera que `auth.uid()` sea ese valor. La integración requiere:
1. Configurar Clerk para que el JWT incluya el `sub` con el `user.id`.
2. En el frontend, cada request a Supabase incluye el header `Authorization: Bearer <JWT>`.
3. Supabase extrae el uid desde el JWT de Clerk (tercera parte configurada en el proyecto).

Alternativa: Edge Function intermediaria que reciba el JWT de Clerk, lo valide y ejecute las queries con `auth.uid()` seteado. El frontend habla solo con tu API.

**Lección aprendida — políticas SELECT con snapshot (migración 00013):**
una política SELECT no puede re-consultar la misma tabla dentro de `USING` para decidir visibilidad
de la fila actual: en un `INSERT ... RETURNING` (PostgREST `return=representation`) la fila recién
insertada **no es visible para el snapshot del propio statement**, así que cualquier helper que
re-query devuelva falso y la inserción falle con 42501. Las políticas de `submissions`
(`submissions_select_visible`) evalúan columnas de la fila directamente (`student_id = uid`,
docente/grupo vía helpers SECURITY DEFINER) sin re-query.

### Validaciones de negocio (triggers)

RLS controla *quién* puede leer/escribir una fila, pero no puede validar relaciones cruzadas entre tablas (ej: "¿este grupo pertenece a la categoría que pide la tarea?"). Eso se resuelve con triggers, para que la regla se cumpla siempre — no solo cuando el frontend la valida.

**Nota (fuera del alcance de un trigger):** `submission_chats.is_gem`, `approved_gem_id`, `extracted_text` y `extraction_error` no se calculan con triggers de Postgres — los completa la Edge Function `evaluate-submission` al analizar cada `chat_url` (extracción Jina Reader, detección de Gema por URL/contenido, match contra `approved_gems` del curso). La base de datos no puede detectar por sí sola si un enlace es una Gema ni verificar sus instrucciones; ese es justo el límite explicado en `flows.md` (sección 4, "Limitación conocida: instrucciones de la Gema").

**Nota sobre `group_grading_mode = 'individual'`:** tampoco hay un trigger que agrupe automáticamente los `submission_chats` por `student_id` y genere las filas de `analysis` — eso lo hace la Edge Function al evaluar: agrupa los chats de la entrega por integrante (buckets) y crea un `analysis` por cada uno (en vez de uno solo para toda la entrega). La base de datos solo guarda el resultado ya calculado.

```sql
-- 1) Si un grupo tiene categoría, sus miembros no pueden superar el max_size de esa categoría
CREATE OR REPLACE FUNCTION validate_group_size()
RETURNS TRIGGER AS $$
DECLARE
  v_max_size INT;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT max_size INTO v_max_size FROM group_categories WHERE id = NEW.category_id;
    IF array_length(NEW.members, 1) > v_max_size THEN
      RAISE EXCEPTION 'El grupo excede el max_size (%) de su categoría', v_max_size;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_group_size
BEFORE INSERT OR UPDATE ON groups
FOR EACH ROW EXECUTE FUNCTION validate_group_size();

-- 2) Si una tarea tiene group_category_id, hereda automáticamente el max_size de esa categoría
CREATE OR REPLACE FUNCTION sync_task_max_group_size()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_category_id IS NOT NULL THEN
    SELECT max_size INTO NEW.max_group_size
    FROM group_categories WHERE id = NEW.group_category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_task_max_group_size
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION sync_task_max_group_size();

-- 3) Al entregar: si la tarea exige una categoría, el grupo elegido debe pertenecer
--    a esa categoría, y el estudiante debe ser miembro de ese grupo
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
    IF NEW.group_id IS NULL THEN
      RAISE EXCEPTION 'Esta tarea es grupal: falta group_id en la entrega';
    END IF;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_submission_group
BEFORE INSERT OR UPDATE ON submissions
FOR EACH ROW EXECUTE FUNCTION validate_submission_group();
```

Con esto, si un estudiante intenta entregar con un grupo que no es el que le corresponde para la categoría que pide la tarea, el insert falla con un error explícito en vez de aceptarse silenciosamente.

---

## Cambios respecto a versión anterior

| Cambio | Motivo |
|---|---|
| Agregado `group_category_id` (nullable) en `tasks` | Corrección: una tarea grupal puede restringirse a una categoría específica — solo grupos de esa categoría entregan ahí. Si se deja `NULL`, cualquier grupo puede entregar (comportamiento libre). |
| Categorías ahora sí condicionan la entrega | Un estudiante puede pertenecer a más de un grupo (uno por categoría, por ejemplo). Si la tarea exige una categoría puntual, solo se acepta un grupo de esa categoría — se rechaza si el estudiante intenta entregar con otras personas. |
| Trigger `validate_group_size` | Antes el `max_size` de la categoría no se aplicaba en ningún lado; ahora se valida al crear/editar un grupo. |
| Trigger `sync_task_max_group_size` | Evita mantener dos valores manuales (el de la categoría y el de la tarea) que podrían desincronizarse. |
| Trigger `validate_submission_group` | Aplica la regla de categoría + pertenencia al grupo directamente en la base, no solo en el frontend. |
| `max_group_size` solo en `tasks` (cuando no hay categoría) | La tarea define el límite directamente si no está atada a una categoría. |
| Agregado `due_date TIMESTAMPTZ` en `courses` y `tasks` | Fecha y hora máxima, no solo fecha. |
| Agregado `pending_task_name` en `submissions` | Permite el flujo abierto donde el estudiante hace submit antes de que exista la tarea. |
| Eliminada categoría "Individual" | Un grupo significa >=2. Entrega individual es simplemente `group_id = null`. |
| Cierre de tarea solo por fecha o botón "Comenzar calificación" | Simplificado: no hay botón de "Cerrar tarea" separado. |
| Eliminado `chat_url` de `submissions`, agregada tabla `submission_chats` | Una entrega puede tener uno o más chats de IA. Cada chat es una fila indexada a la entrega. |
| Agregada tabla `approved_gems` | Permite al profesor listar Gemas de Gemini específicas que él controla, para poder confiar en sus instrucciones al calificar. |
| Agregados `platform`, `is_gem`, `approved_gem_id`, `gem_instructions_pasted` en `submission_chats` | Soporta la detección de Gemas de Gemini (solo Gemini por ahora) y distingue "gema verificada" (está en `approved_gems`) de "gema no verificada" (el estudiante usó otra). Claude y ChatGPT quedan como `platform` estándar, sin este problema. |
| Agregado `ai_evaluation_mode` en `tasks` | El profesor elige, por tarea, si la evaluación de IA se dispara sola al entregar (`on_submit`) o solo cuando el profesor abre esa entrega puntual (`on_demand`). En entregas grupales, la evaluación sigue siendo una sola por entrega (no una por miembro), sin importar el modo elegido. |
| Agregado `group_grading_mode` en `tasks`, `student_id` en `submission_chats` y `student_id` (nullable) en `analysis` | Permite calificar cada integrante de un grupo por separado (`individual`) en vez de repartir siempre el mismo puntaje a todo el grupo (`shared`, comportamiento anterior). Cada chat queda atribuido a quien lo pegó, y el análisis se genera por integrante cuando el modo es individual. |

### Migraciones aplicadas (supabase/migrations)

| Migración | Contenido |
|---|---|
| 00001–00004 | Schema inicial, triggers, RLS y consolidación de políticas |
| 00005–00011 | Debug de autenticación/RLS (creación y limpieza posterior) |
| 00012 | Helpers `fn_requesting_user_id` / `fn_can_view_*` marcados VOLATILE para evaluar por fila |
| 00013 | Fix política SELECT de `submissions`: sin re-query dentro del USING (bug de snapshot en INSERT...RETURNING — ver nota más arriba) |
| 00014 | `analysis.breakdown JSONB` + `submission_chats.extracted_text TEXT` |
| 00015 | `submission_chats.extraction_error TEXT` |

### Edge Functions (supabase/functions)

- **`evaluate-submission`** — motor de evaluación completo: extrae los prompts con Jina Reader
  (solo mensajes del estudiante), detecta gemas, compone transcript numerado `[CN-MK]`, evalúa con
  Gemini (cadena de fallback priorizada por calidad), calcula total ponderado determinístico,
  persiste `analysis` + `breakdown` y actualiza `extracted_text`/`extraction_error` por chat.
- **`evaluate-links`** — endpoint de prueba: recibe hasta 8 URLs, califica cada chat individualmente
  y todos combinados; no persiste nada. Comparte toda la lógica vía `_shared/evaluation-core.ts`.
- Ambas: CORS habilitado, identidad del caller decodificada desde el JWT (`sub`), temperatura 0.
  ⚠️ Pendiente de endurecimiento: verificar firma Clerk (JWKS) dentro de las funciones — hoy el
  gateway corre con `verify_jwt = false` (persistente desde el primer deploy) y solo se decodifica
  el payload sin validar firma.
