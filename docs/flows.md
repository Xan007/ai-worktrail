# Flujos del Sistema (User Stories)

> **Nota 2026-08-28 — Estado actual implementado:** Este documento refleja lo que existe en `main` y lo que sigue pendiente. Las secciones 1-6 mantienen el diseño objetivo; la tabla de estado indica la implementación real verificada en código (`src/pages`, `src/lib/data`, `src/components`).

## 0. Estado actual — Implementado (2026-08-28)

| Área | Flujo | Estado | Ubicación | Notas |
|------|-------|--------|-----------|-------|
| Auth | Registro Clerk email/Google + elección rol | Implementado | `LandingPage.tsx:76`, `App.tsx:43`, `LoginPage.tsx:18`, `OnboardingPage.tsx:16`, `RequireProfile.tsx:205` | CTA `Comenzar ahora` → `/onboarding`, `SignedOut` con `redirect_url`, `LoginPage` redirige directo a onboarding si `!profile` |
| Auth | Indicador pasos onboarding `Rol — Curso` | Implementado | `OnboardingPage.tsx:417` | Label fijo `Curso`, sin alternancia `Primer curso ↔ Unirse a clase` |
| Cursos | Listado con persistencia de pestaña | Implementado | `CoursesPage.tsx:313` | `activeTab teacher|student|requests` con `awt_courses_activeTab_${user.id}` y validación de `requests` vacío. Toggle con `ArrowLeftRight` solo flechas |
| Cursos | Crear curso con highlight | Implementado | `CoursesPage.tsx:382` | Anillo `ring-2` sin `animate-pulse` cuando `teacherCourses.length===0`; `navigate(/courses/${id})` + `showSuccessNoProgress` |
| Cursos | Unirse por código | Implementado | `JoinCourseDialog` | `join_code` upper 8 chars, estados `approved|pending|rejected`, cancelable |
| Navegación | Breadcrumb alineado | Implementado | `AppBreadcrumb.tsx:27` | `marginBottom 0` y wrapper `pb-5` en detalle |
| Curso | Header fusionado Estudiantes | Implementado | `CourseDetailPage.tsx:339` | `DropdownMenu` `Estudiantes` (invitar + ver lista) + `Nueva tarea` + `Settings` icon; `Vista previa` pill `h-5` fuera del card |
| Curso | Onboarding checklist | Implementado | `TeacherOnboardingChecklist.tsx:100` | 3 pasos (`hasCourses`, `hasStudents||hasCopiedLocally`, `hasTasks`), inicia expandido, auto-expande si hay highlight, auto-cierre animado `isExiting` tras `3/3`, `dismissed` persistente en DB `users.onboarding_dismissed` |
| Curso | Highlights secuenciales | Implementado | `CourseDetailPage.tsx:402` | `shouldHighlightInvite` y `shouldHighlightTask` secuenciales, anillo `ring-2` sin fondo pulsante, solo si checklist visible |
| Tareas | Listado y creación | Implementado | `CourseDetailPage.tsx:214` | Lista con `Vence` formateado, solo `Ver`; `TaskDialog` con `is_group_task`, `max_group_size`, `group_grading_mode`, `ai_evaluation_mode`, `allow_resubmission` |
| Tareas | Borrado con confirmación y Deshacer | Implementado | `TaskDetailPage.tsx:391` | `Dialog` “Se eliminarán todas las entregas” + borrado optimista Notion + toast `Deshacer` 5s que re-crea vía `createTask` + evento `awt:task-restored` → `CourseDetailPage.tsx:482` hace `load()` sin reload; si tiene entregas, borrado sin undo |
| Tareas | Cierre automático por fecha | Implementado | `CourseDetailPage.tsx:110` `isTaskOverdue`/`isTaskClosed` y `TaskDetailPage.tsx:359` | `due_at < now` o `status==='closed'` → badge `Cerrada` y `canStudentSubmit=false` sin cron |
| Tareas | Crear con toast Ver | Implementado | `CourseDetailPage.tsx:527` | `showTaskCreated` con botón `Ver` → `navigate` |
| Estudiantes | Gestión inscripciones | Implementado | `StudentsPage.tsx:38` | `Aprobar`/`Rechazar` individual y en bloque (`Promise.all`), `Expulsar`/`Hacer monitor` con toasts centralizados `src/lib/toast.ts:15`, `InviteModal` con `hideTrigger` |
| Toasts | Sistema centralizado | Implementado | `src/lib/toast.ts` `App.tsx:35` | `baseOptions` único, `ToastContainer` único `bottom-right`, `showSuccessNoProgress` para curso, `showUndoDeleteTask` y `showTaskCreated`, progress sólido `#1E5AA8` sin arcoíris. `react-doctor` 63/100 |
| Pendiente | Whitelist dominio/CSV, categorías de grupo, pool abierto, cierre manual “Comenzar calificación”, evaluación individual por chat | Pendiente | Ver §2-§4 | Requiere tablas `course_group_categories`, `pending_submissions`, etc. |

---

## 1. Auth y Roles

1. Usuario se registra con email/contraseña o Google (Clerk). Elige rol: `student` o `teacher`.
2. Si entra por Google, el email ya está verificado. Si es por email, Clerk envía link de verificación.
3. Clerk devuelve un JWT en cada request. Este token se envía a Supabase para que RLS aplique las políticas según el rol y el usuario.

---

## 2. Profesor — Curso

### Crear curso — Implementado (parcial)
1. Profesor llena: nombre del curso y descripción (opcional). [Implementado]
2. Sistema genera `join_code` y enlace automáticamente (ej: `/join/abc123`). [Implementado]
3. Profesor elige modo de inscripción: [Parcial]
   - **Abierto:** cualquiera con el enlace entra directo. [Implementado]
   - **Aprobación:** entra, queda `pending`, profesor revisa uno por uno o en bloque. [Implementado] uno por uno y en bloque
   - **Whitelist:** define dominio institucional (ej: `@universidad.edu.ar`) y/o sube CSV/lista de correos pre-inscritos. Quien coincide con el dominio **o** está en la lista pre-inscrita entra directo; el resto queda `pending`. [Pendiente] requiere `enrollment_mode whitelist` + `allowed_domain` + `pre_enrolled_emails` y RLS
4. Profesor define **categorías de grupo** del curso: cada una con nombre (ej: "Proyecto Final", "Corte 1") y `max_size` (tamaño máximo de los grupos de esa categoría). Un estudiante puede pertenecer a más de un grupo (por ejemplo, uno por categoría). Estas categorías pueden usarse luego para **restringir tareas grupales** (ver sección 3 y nota en sección 6). [Pendiente] requiere tabla `course_group_categories` + `group_memberships`
5. Opcionalmente, el profesor **bloquea inscripciones** al curso cuando lo considere. [Implementado] toggle `is_enrollment_locked` en `SettingsDialog`, persiste con `Guardar cambios` y `joinCourse` rechaza si bloqueado

### Gestionar inscripciones — Parcial
1. Profesor ve lista de pendientes (`pending`) con opción de aprobar/rechazar uno por uno o en bloque. [Implementado] uno por uno y en bloque con `Promise.all`
2. Puede revisar quiénes están aprobados y expulsar si es necesario. [Implementado] (`Expulsar` con `Dialog` + `showSuccess`)
3. Puede bloquear el curso para que nadie más se inscriba. [Implementado]

---

## 3. Profesor — Tareas

### Flujo A: Profesor crea la tarea primero — Implementado
1. Dentro de un curso, profesor crea tarea: nombre + **fecha y hora** de vencimiento (opcional). [Implementado]
2. Decide si es entrega individual o grupal. [Implementado]
3. Si es grupal: el profesor elige entre (a) **restringirla a una categoría de grupo** del curso — solo los grupos de esa categoría podrán entregar, y el límite se hereda del `max_size` de la categoría — o (b) dejarla abierta a cualquier grupo y definir `max_group_size` directamente. [(b) Implementado, (a) Pendiente requiere categorías]
4. Si es grupal, además elige el **modo de calificación** (`group_grading_mode`): (a) **compartida** — un solo puntaje para todo el grupo, igual para todos (comportamiento por defecto), o (b) **individual** — cada integrante recibe su propio puntaje, evaluado solo con los chats que él mismo aportó. [Implementado] esquema listo, UI `NativeSelect` en `TaskDialog`
5. Elige el **momento de evaluación de IA** para esta tarea (ver sección 4): al instante de cada entrega, o bajo demanda cuando ella decida revisar una entrega puntual. Puede cambiarlo después. [Implementado] `ai_evaluation_mode`
6. Tarea se publica en estado `open`. Estudiantes ven la tarea y pueden entregar. [Implementado]

### Flujo B: Estudiantes entregan sin tarea creada (pool abierto) — No implementado
> Restricción: el estudiante debe estar inscripto (aprobado) en al menos un curso para poder hacer un submit.

1. Estudiante (ya dentro de un curso) hace un submit manual: elige el curso, escribe un nombre y pega **una o más** URLs de chat de IA. El submit se guarda como "sin tarea asignada" (`pending_task_name`), sin crear todavía una tarea.
2. El sistema detecta submits con nombres similares (por similitud de texto o embedding con IA) y sugiere agruparlos como una misma tarea tentativa.
3. Los submits se van acumulando en una bandeja visible para el profesor, sugerido-agrupados por IA.
4. Profesor revisa: confirma la agrupación (creando la tarea unificada), renombra la tarea, o **separa** un submit que fue mal agrupado en otra tarea distinta.
5. Al confirmar, se crea la tarea (`status: 'open'`) automáticamente y los submits se vinculan a ella.
6. [Mejora] El profesor puede disparar **"Comenzar calificación"** en cualquier momento: cambia `status` a `closed`, nadie más entrega.

*(Nota: este flujo reemplaza y unifica lo que antes eran dos secciones separadas — "pool abierto" no es un camino "sin profesor": el profesor siempre interviene para confirmar/renombrar/separar antes de que la tarea quede oficial. Ver sección 6.)*

### Cierre de tarea — Parcial
1. Si tiene fecha/hora de vencimiento: sistema la cierra automáticamente al llegar el momento. [Implementado] vía `isTaskOverdue`/`isTaskClosed` derivado en render (`canStudentSubmit=false` + badge `Cerrada`), sin cron server
2. Si no tiene fecha: profesor pulsa **"Comenzar calificación"** para cerrarla manualmente. [Pendiente] No hay botón aún; hoy se usa `due_at` como límite
3. Estado cambia a `closed`. Estudiantes no pueden enviar más entregas para esa tarea. [Implementado] `task.status` existe, `allow_resubmission` y `canStudentSubmit` lo respetan, falta UI de cierre manual

---

## 4. Profesor — Revisión y Calificación

### Momento de la evaluación de IA — Lógica lista, falta UI de disparo manual
- El profesor elige este modo **por tarea**, al crearla (ver sección 3, Flujo A, paso 4): `ai_evaluation_mode`.
  - **Al instante (`on_submit`):** apenas el estudiante hace la entrega, se dispara la evaluación (Jina Reader + Gemini) automáticamente para esa entrega.
  - **Bajo demanda (`on_demand`, por defecto):** no se evalúa nada hasta que el profesor decide revisarlo — al abrir esa entrega puntual, o al seleccionarla dentro del flujo de abajo (puntos 5-7).
- En **cualquiera de los dos modos**, evaluar una entrega grupal dispara el análisis según el `group_grading_mode` de la tarea (ver subsección más abajo): **compartida** → un solo análisis para todo el grupo (todos los chats juntos); **individual** → un análisis separado por integrante (cada uno con sus propios chats).
- El modo solo cambia el disparador (automático al entregar vs. manual cuando el profesor decide mirar); el mecanismo de análisis en sí (Jina Reader + Gemini) es el mismo.

1. Profesor entra a una tarea y ve todas las entregas. [Implementado] (`TaskDetailPage.tsx:474` `SubmissionsListSection` + `getSubmissionDetail` prefetch)
2. Si la entrega es individual, o es grupal con calificación **compartida**: los chats de la entrega se evalúan como una sola unidad, y el puntaje/justificación/flagged pertenecen a la entrega completa. Si es grupal con calificación **individual**: cada chat pertenece a un integrante (ver `submission_chats.student_id`), y se evalúa cada integrante por separado. [Implementado] Esquema `student_id` existe
3. Visualización por defecto: lista plana. Opción de agrupar por grupo completo (si es grupal). [Pendiente] falta filtro por grupo
4. Puede acceder a cualquiera de los chats de una entrega, y además ver **los prompts que el estudiante escribió** en cada uno (panel "View prompts", solo docente), numerados con los mismos marcadores `[CN-MK]` que cita el desglose del puntaje. [Implementado] Edge Function `evaluate-submission` extrae prompts
5. Pulsa **Evaluate / Re-evaluate** sobre una entrega: la Edge Function `evaluate-submission` extrae los prompts (Jina Reader, solo mensajes del estudiante), evalúa con Gemini y guarda los resultados directamente en `analysis` con su clave `service_role`. [Implementado]
6. Los resultados se ven en la app al instante: score, perfil Brooks, desglose por criterio con bandas y evidencia citada, fortalezas y mejoras. [Implementado]
7. Si un chat no pudo leerse (link eliminado o privado), la UI muestra el motivo bajo ese chat (`extraction_error`) y pide al estudiante re-compartir con "Anyone with the link". Si NINGÚN chat es legible, la función devuelve 422 y no genera análisis falso. [Implementado]
8. Si es entrega grupal con calificación **compartida**, el puntaje se asigna igual a cada miembro del grupo. Si es **individual**, cada miembro recibe su propio puntaje, distinto entre sí — así el profesor puede identificar puntualmente quién usó mal la IA sin que la nota se le pegue a todo el grupo. [Implementado]

### Motor de evaluación v2 — puntaje justificado (implementado)
### Detección de Gemas (solo Gemini, por el momento) — Parcial
### Calificación grupal: compartida vs. individual (`group_grading_mode`) — Esquema implementado

---

## 5. Estudiante — Inscripción y Tareas

### Unirse a un curso — Implementado
1. Estudiante accede por el `join_code` del curso (link compartido por el profesor). [Implementado] (`JoinPage`, `JoinCourseDialog` upper 8 chars)
2. Según el modo: [Implementado]
   - **Abierto:** entra directo, ve tareas de inmediato.
   - **Aprobación:** ve "Esperando aprobación del profesor" con opción de **cancelar su solicitud**. [Implementado] (`CourseRow` pending + `cancelMyEnrollment`)
   - **Whitelist:** si su email no coincide con dominio ni pre-inscrito, queda `pending` y puede cancelar. [Pendiente] Falta dominio/CSV
3. [Mejora] El estudiante puede ver el nombre del curso, profesor y descripción antes de ser aprobado. [Implementado] (`CourseRow` muestra `course.name`)

### Entregar — Parcial
1. Ve lista de tareas de sus cursos aprobados. [Implementado]
2. Si es individual: selecciona la tarea, pega una o más URLs de chat de IA, envía. [Implementado] (`SubmitTaskPage`)
3. Si es grupal: selecciona uno de sus grupos (puede pertenecer a más de uno). Si la tarea exige una categoría específica, solo puede elegir entre sus grupos de esa categoría; si intenta entregar con compañeros que no forman ese grupo, el sistema avisa que no es válido. Pega una o más URLs, envía. Cada URL queda registrada como aportada por quien la pegó (`submission_chats.student_id`) — esto es lo que permite la calificación individual dentro del grupo cuando la tarea la tiene activada (ver sección 4). [Implementado] `student_id` guardado, [Pendiente] categorías no restringen aún
4. Mientras la tarea esté `open`, puede re-enviar (se guarda historial, última versión es vigente). En una entrega grupal, distintos integrantes pueden ir agregando sus propias URLs con re-envíos sucesivos. [Implementado] `allow_resubmission` + `latestByStudent`
5. Por cada URL pegada, el estudiante puede usar **Claude, ChatGPT o Gemini** indistintamente (ver "Detección de Gemas" en la sección 4). Si el enlace es de una Gema de Gemini y quiere que cuente como "verificada", debe elegirla de la lista de Gemas aprobadas del curso (si el profesor definió alguna); si no, puede pegar igual el enlace y opcionalmente las instrucciones de la Gema, sabiendo que quedará marcada como "no verificada". [Pendiente] Gemas aprobadas lista

### Ver resultados — Implementado
1. Ve score, perfil Brooks, desglose por criterio con bandas y evidencia citada, fortalezas/mejoras y flag de uso inadecuado — **el mismo detalle que el profesor** (decisión de producto: feedback formativo completo para ambos). [Implementado]
2. Si es entrega grupal con calificación **compartida**, ve el resultado del grupo completo (igual para todos los miembros). Si es **individual**, ve solo su propio puntaje/desglose, evaluado con base en los chats que él mismo aportó — no ve el de sus compañeros. [Implementado]
3. No puede ver resultados de otros estudiantes ni de otras tareas. [Implementado] (RLS + filtro `isTeacher || s.student.id === user.id`)

---

## 5b. Herramienta de prueba — Evaluador de links (`/dev/evaluate`) — Implementado

Para testear el motor sin crear entregas ni tocar la base de datos: [Implementado] (`EvaluatePage`)

1. Se pegan hasta 8 URLs de chats compartidos.
2. La Edge Function `evaluate-links` extrae y evalúa **cada chat individualmente** y también **todos combinados** (holístico).
3. Muestra por cada uno: score, perfil Brooks, bandas por criterio y resumen; nada se persiste.
4. Enlace en la navbar ("Link evaluator"), en el footer, y desde el Home.

---

## 6. Notas sobre decisiones — Actualizado

- **"Separar" un submit:** cuando la IA agrupa submits bajo una tarea tentativa, el profesor puede corregir el error moviendo un submit a otra tarea distinta (porque el tema es otro o quiere dividir la materia en dos tareas). [Pendiente] Requiere Flujo B
- **Categorías de grupo:** SÍ condicionan la entrega cuando la tarea lo pide. Un estudiante puede pertenecer a más de un grupo (uno por categoría, por ejemplo). Si una tarea grupal se restringe a una categoría puntual, solo los grupos de esa categoría pueden entregar; si el estudiante intenta enviar con personas que no son su grupo asignado para esa categoría, el sistema lo rechaza. Si la tarea no elige categoría, cualquier grupo puede entregar, como antes. [Pendiente]
- **Max_group_size:** si la tarea está restringida a una categoría, el límite se hereda del `max_size` de la categoría (un solo valor, sin duplicar). Si la tarea no tiene categoría, el profesor define `max_group_size` directamente para esa tarea. [Implementado]
- **Solo "Comenzar calificación":** el profesor no necesita un botón de "Cerrar tarea" separado. Con poner fecha/hora de vencimiento o pulsar "Comenzar calificación" alcanza. [Pendiente] Botón “Comenzar calificación” aún no en UI (hoy solo `due_at`)
- **Pool abierto es un solo flujo:** lo que antes aparecía como "Flujo B" y "Flujo Adicional — Pool abierto (sin profesor)" describían exactamente el mismo camino (submit sin tarea → agrupado por IA → confirmado por el profesor). Se dejaron unificados en la sección 3 para evitar mantener la misma lógica en dos lugares.
- **Por qué existe la calificación individual dentro de un grupo:** con calificación compartida, un integrante que usó la IA de forma crítica y otro que delegó todo terminan con la misma nota — eso ocultaba justamente el problema que el sistema busca detectar. Con `group_grading_mode = 'individual'`, cada quien responde por sus propios chats (`submission_chats.student_id`), y el profesor puede ver puntualmente quién quedó mal sin penalizar al resto del grupo. [Implementado]
- **Gemas de Gemini — por qué no se confía en las instrucciones pegadas por el estudiante:** las instrucciones de una Gema no se pueden leer desde el enlace público, y el dueño de la Gema puede cambiarlas en cualquier momento (antes o después de generar el chat que se entrega). Por eso el texto pegado por el estudiante es informativo, no verificable. La única forma de tener garantías reales es que la evaluación se apoye en una **Gema específica que el profesor conoce y controla** (lista de Gemas aprobadas por curso); todo lo demás (Gema propia del estudiante, o directamente Claude/ChatGPT) sigue permitido, pero se etiqueta según corresponda ("gema no verificada" o "chat estándar") para que el profesor tenga el contexto al calificar. [Implementado] Documentado

---

## 7. Gaps — Plan de implementación (priorizado, buenas prácticas React)

### Alta prioridad (esta iteración)
1. **Bloquear inscripciones** (`courses.is_enrollment_locked` boolean + `SettingsDialog` toggle + RLS `joinCourse` rechaza si locked) — evita que se sigan uniendo tras cerrar cupo. [Implementado]
2. **Aprobar/Rechazar en bloque** (`StudentsPage.tsx` checkbox + `Promise.all` para `setEnrollmentStatus` en paralelo, `client-parallel` + `async-parallel` + `showSuccess` único) [Implementado]
3. **Cierre automático por `due_at`** (`CourseDetailPage`/`TaskDetailPage` `useMemo` `isOverdue = due_at < now` → `canStudentSubmit = !isOverdue && status==='open'` + `rendering-conditional` ternario, sin `&&`) [Implementado]

### Media prioridad (siguiente sprint)
- Whitelist dominio/CSV (`courses.allowed_domain`, `pre_enrolled_emails` + Edge Function de validación)
- Categorías de grupo (`course_group_categories` + `group_memberships` + `NativeSelect` en `TaskDialog`)
- “Comenzar calificación” (update `tasks.status='closed'` + `showSuccessNoProgress`)
- Pool abierto Flujo B (tabla `pending_submissions` + agrupación IA + bandeja profesor)

### Baja prioridad / Investigar
- Gemas aprobadas por curso (`approved_gems` JSONB)
- Agrupar entregas por grupo en `TaskDetailPage` (filtro `groupBy`)
- Soft-delete para `deleteCourse` con papelera (evitar undo incompleto)
