# Flujos del Sistema (User Stories)

## 1. Auth y Roles

1. Usuario se registra con email/contraseña o Google (Clerk). Elige rol: `student` o `teacher`.
2. Si entra por Google, el email ya está verificado. Si es por email, Clerk envía link de verificación.
3. Clerk devuelve un JWT en cada request. Este token se envía a Supabase para que RLS aplique las políticas según el rol y el usuario.

---

## 2. Profesor — Curso

### Crear curso
1. Profesor llena: nombre del curso y descripción (opcional).
2. Sistema genera `join_code` y enlace automáticamente (ej: `/join/abc123`).
3. Profesor elige modo de inscripción:
   - **Abierto:** cualquiera con el enlace entra directo.
   - **Aprobación:** entra, queda `pending`, profesor revisa uno por uno o en bloque.
   - **Whitelist:** define dominio institucional (ej: `@universidad.edu.ar`) y/o sube CSV/lista de correos pre-inscritos. Quien coincide con el dominio **o** está en la lista pre-inscrita entra directo; el resto queda `pending`.
4. Profesor define **categorías de grupo** del curso: cada una con nombre (ej: "Proyecto Final", "Corte 1") y `max_size` (tamaño máximo de los grupos de esa categoría). Un estudiante puede pertenecer a más de un grupo (por ejemplo, uno por categoría). Estas categorías pueden usarse luego para **restringir tareas grupales** (ver sección 3 y nota en sección 6).
5. Opcionalmente, el profesor **bloquea inscripciones** al curso cuando lo considere.

### Gestionar inscripciones
1. Profesor ve lista de pendientes (`pending`) con opción de aprobar/rechazar uno por uno o en bloque.
2. Puede revisar quiénes están aprobados y expulsar si es necesario.
3. Puede bloquear el curso para que nadie más se inscriba.

---

## 3. Profesor — Tareas

### Flujo A: Profesor crea la tarea primero
1. Dentro de un curso, profesor crea tarea: nombre + **fecha y hora** de vencimiento (opcional).
2. Decide si es entrega individual o grupal.
3. Si es grupal: el profesor elige entre (a) **restringirla a una categoría de grupo** del curso — solo los grupos de esa categoría podrán entregar, y el límite se hereda del `max_size` de la categoría — o (b) dejarla abierta a cualquier grupo y definir `max_group_size` directamente.
4. Si es grupal, además elige el **modo de calificación** (`group_grading_mode`): (a) **compartida** — un solo puntaje para todo el grupo, igual para todos (comportamiento por defecto, como hasta ahora), o (b) **individual** — cada integrante recibe su propio puntaje, evaluado solo con los chats que él mismo aportó. Sirve para identificar puntualmente quién usó mal la IA dentro de un grupo, en vez de que la nota se le pegue a todos por igual.
5. Elige el **momento de evaluación de IA** para esta tarea (ver sección 4): al instante de cada entrega, o bajo demanda cuando ella decida revisar una entrega puntual. Puede cambiarlo después.
6. Tarea se publica en estado `open`. Estudiantes ven la tarea y pueden entregar.

### Flujo B: Estudiantes entregan sin tarea creada (pool abierto)

> Restricción: el estudiante debe estar inscripto (aprobado) en al menos un curso para poder hacer un submit.

1. Estudiante (ya dentro de un curso) hace un submit manual: elige el curso, escribe un nombre y pega **una o más** URLs de chat de IA. El submit se guarda como "sin tarea asignada" (`pending_task_name`), sin crear todavía una tarea.
2. El sistema detecta submits con nombres similares (por similitud de texto o embedding con IA) y sugiere agruparlos como una misma tarea tentativa.
3. Los submits se van acumulando en una bandeja visible para el profesor, sugerido-agrupados por IA.
4. Profesor revisa: confirma la agrupación (creando la tarea unificada), renombra la tarea, o **separa** un submit que fue mal agrupado en otra tarea distinta.
5. Al confirmar, se crea la tarea (`status: 'open'`) automáticamente y los submits se vinculan a ella.
6. [Mejora] El profesor puede disparar **"Comenzar calificación"** en cualquier momento: cambia `status` a `closed`, nadie más entrega.

*(Nota: este flujo reemplaza y unifica lo que antes eran dos secciones separadas — "pool abierto" no es un camino "sin profesor": el profesor siempre interviene para confirmar/renombrar/separar antes de que la tarea quede oficial. Ver sección 6.)*

### Cierre de tarea
1. Si tiene fecha/hora de vencimiento: sistema la cierra automáticamente al llegar el momento.
2. Si no tiene fecha: profesor pulsa **"Comenzar calificación"** para cerrarla manualmente.
3. Estado cambia a `closed`. Estudiantes no pueden enviar más entregas para esa tarea.

---

## 4. Profesor — Revisión y Calificación

### Momento de la evaluación de IA

- El profesor elige este modo **por tarea**, al crearla (ver sección 3, Flujo A, paso 4): `ai_evaluation_mode`.
  - **Al instante (`on_submit`):** apenas el estudiante hace la entrega, se dispara la evaluación (Jina Reader + Gemini) automáticamente para esa entrega.
  - **Bajo demanda (`on_demand`, por defecto):** no se evalúa nada hasta que el profesor decide revisarlo — al abrir esa entrega puntual, o al seleccionarla dentro del flujo de abajo (puntos 5-7).
- En **cualquiera de los dos modos**, evaluar una entrega grupal dispara el análisis según el `group_grading_mode` de la tarea (ver subsección más abajo): **compartida** → un solo análisis para todo el grupo (todos los chats juntos); **individual** → un análisis separado por integrante (cada uno con sus propios chats).
- El modo solo cambia el disparador (automático al entregar vs. manual cuando el profesor decide mirar); el mecanismo de análisis en sí (Jina Reader + Gemini) es el mismo. La capacidad de Jina Reader soporta ambos modos sin problema (ver [plan.md](plan.md), sección 2).

1. Profesor entra a una tarea y ve todas las entregas.
2. Si la entrega es individual, o es grupal con calificación **compartida**: los chats de la entrega se evalúan como una sola unidad, y el puntaje/justificación/flagged pertenecen a la entrega completa. Si es grupal con calificación **individual**: cada chat pertenece a un integrante (ver `submission_chats.student_id`), y se evalúa cada integrante por separado (ver subsección abajo).
3. Visualización por defecto: lista plana. Opción de agrupar por grupo completo (si es grupal).
4. Puede acceder a cualquiera de los chats de una entrega.
5. Selecciona entregas y descarga `.json` (uno por entrega, con todos sus chats) para procesar localmente.
6. Ejecuta el script Python (Jina Reader + Gemini) contra cada entrega completa.
7. Los resultados se guardan en `analysis`, vinculados a la entrega (y al integrante, si el modo es individual). *(Punto a definir: falta especificar cómo vuelven los resultados a la plataforma — ¿el profesor sube el JSON generado manualmente, o el script llama directo a la API de la plataforma? Hoy hay un salto entre "correr el script en local" y "quedar guardado en `analysis`".)*
8. [Mejora] El profesor también ve los resultados directamente en la app, con el puntaje y justificación de cada entrega (individual, por grupo, o por integrante dentro del grupo).
9. Si es entrega grupal con calificación **compartida**, el puntaje se asigna igual a cada miembro del grupo. Si es **individual**, cada miembro recibe su propio puntaje, distinto entre sí — así el profesor puede identificar puntualmente quién usó mal la IA sin que la nota se le pegue a todo el grupo.

### Calificación grupal: compartida vs. individual (`group_grading_mode`)

- Definido por el profesor al crear la tarea (sección 3, Flujo A, paso 4).
- **Compartida (por defecto):** todos los chats de la entrega se juntan y se evalúan como una sola unidad; el resultado es idéntico para todos los miembros del grupo.
- **Individual:** cada chat pegado en la entrega queda asociado al integrante que lo aportó (`submission_chats.student_id`). El motor de evaluación agrupa los chats por integrante y genera un análisis separado por cada uno, con su propio puntaje, justificación y flag — de modo que si un integrante delegó todo a la IA y otro la usó de forma crítica, eso queda diferenciado en vez de promediarse o repartirse por igual.
- En ambos casos sigue siendo **una sola entrega** (un solo `submission_id`) por grupo/tarea; lo que cambia es cuántas filas de `analysis` genera esa entrega al evaluarse (una, o una por integrante).

### Detección de Gemas (solo Gemini, por el momento)

1. Por cada chat de un enlace de **Gemini**, el sistema (script Python, vía Jina Reader) detecta si el enlace corresponde a una **Gema** (Gem) o a un chat estándar de Gemini.
2. En la bandeja de revisión, cada chat se marca claramente: **"Esta es una gema"** o **"Esta no es una gema"**. Es solo informativo por ahora — no bloquea ni penaliza automáticamente.
3. Esta detección **solo aplica a Gemini** por el momento. Los chats de Claude o ChatGPT se tratan siempre como chat estándar (no existe el concepto de "Gema" ahí todavía).

### Limitación conocida: instrucciones de la Gema

- Jina Reader (y en general cualquier lectura del enlace público) solo devuelve **la conversación**, no las instrucciones internas ("system prompt") que el dueño de la Gema configuró. No hay forma de recuperarlas automáticamente desde el enlace compartido.
- Si esas instrucciones importan para la evaluación, el **estudiante debe copiarlas y pegarlas manualmente** al hacer el submit (ver `submission_chats.gem_instructions_pasted` en el schema).
- Problema de fondo: el dueño de la Gema puede **cambiar las instrucciones en cualquier momento** (por ejemplo, pedirle a la Gema que dé la respuesta directa, generar el chat, y luego revertir las instrucciones a algo "inocente"). Esto significa que ni el enlace ni el texto pegado por el estudiante son evidencia confiable de qué instrucciones estaban activas quan se generó la conversación — el estudiante podría estar "saltándose" el control.
- **Mitigación adoptada:** en vez de confiar en instrucciones arbitrarias pegadas por cada estudiante, el profesor puede definir una o más **Gemas aprobadas** para el curso (la suya propia, u otra específica que él mismo controla o audita). Solo las entregas que usan una Gema de esa lista se consideran "verificadas"; el resto se marca como "Gema no verificada" — sigue permitida, pero el profesor sabe que no puede confiar en las instrucciones declaradas.
- **Alternativa siempre disponible:** el estudiante puede usar **Claude o ChatGPT** en lugar de una Gema de Gemini. Ahí no aplica el problema de instrucciones ocultas/cambiantes, porque es un chat estándar sin capa de configuración previa.
- En última instancia, esto depende de la buena fe del estudiante — el sistema documenta y hace visible la señal (gema / no gema / gema verificada), pero no puede garantizar al 100% que no se manipuló la Gema entre medio.

---

## 5. Estudiante — Inscripción y Tareas

### Unirse a un curso
1. Estudiante accede por el `join_code` del curso (link compartido por el profesor).
2. Según el modo:
   - **Abierto:** entra directo, ve tareas de inmediato.
   - **Aprobación:** ve "Esperando aprobación del profesor" con opción de **cancelar su solicitud**.
   - **Whitelist:** si su email no coincide con dominio ni pre-inscrito, queda `pending` y puede cancelar.
3. [Mejora] El estudiante puede ver el nombre del curso, profesor y descripción antes de ser aprobado.

### Entregar
1. Ve lista de tareas de sus cursos aprobados.
2. Si es individual: selecciona la tarea, pega una o más URLs de chat de IA, envía.
3. Si es grupal: selecciona uno de sus grupos (puede pertenecer a más de uno). Si la tarea exige una categoría específica, solo puede elegir entre sus grupos de esa categoría; si intenta entregar con compañeros que no forman ese grupo, el sistema avisa que no es válido. Pega una o más URLs, envía. Cada URL queda registrada como aportada por quien la pegó (`submission_chats.student_id`) — esto es lo que permite la calificación individual dentro del grupo cuando la tarea la tiene activada (ver sección 4).
4. Mientras la tarea esté `open`, puede re-enviar (se guarda historial, última versión es vigente). En una entrega grupal, distintos integrantes pueden ir agregando sus propias URLs con re-envíos sucesivos.
5. Por cada URL pegada, el estudiante puede usar **Claude, ChatGPT o Gemini** indistintamente (ver "Detección de Gemas" en la sección 4). Si el enlace es de una Gema de Gemini y quiere que cuente como "verificada", debe elegirla de la lista de Gemas aprobadas del curso (si el profesor definió alguna); si no, puede pegar igual el enlace y opcionalmente las instrucciones de la Gema, sabiendo que quedará marcada como "no verificada".

### Ver resultados
1. Ve puntaje, justificación y flag de uso inadecuado.
2. Si es entrega grupal con calificación **compartida**, ve el resultado del grupo completo (igual para todos los miembros). Si es **individual**, ve solo su propio puntaje/justificación, evaluado con base en los chats que él mismo aportó — no ve el de sus compañeros.
3. No puede ver resultados de otros estudiantes ni de otras tareas.

---

## 6. Notas sobre decisiones

- **"Separar" un submit:** cuando la IA agrupa submits bajo una tarea tentativa, el profesor puede corregir el error moviendo un submit a otra tarea distinta (porque el tema es otro o quiere dividir la materia en dos tareas).
- **Categorías de grupo:** SÍ condicionan la entrega cuando la tarea lo pide. Un estudiante puede pertenecer a más de un grupo (uno por categoría, por ejemplo). Si una tarea grupal se restringe a una categoría puntual, solo los grupos de esa categoría pueden entregar; si el estudiante intenta enviar con personas que no son su grupo asignado para esa categoría, el sistema lo rechaza. Si la tarea no elige categoría, cualquier grupo puede entregar, como antes.
- **Max_group_size:** si la tarea está restringida a una categoría, el límite se hereda del `max_size` de esa categoría (un solo valor, sin duplicar). Si la tarea no tiene categoría, el profesor define `max_group_size` directamente para esa tarea.
- **Solo "Comenzar calificación":** el profesor no necesita un botón de "Cerrar tarea" separado. Con poner fecha/hora de vencimiento o pulsar "Comenzar calificación" alcanza.
- **Pool abierto es un solo flujo:** lo que antes aparecía como "Flujo B" y "Flujo Adicional — Pool abierto (sin profesor)" describían exactamente el mismo camino (submit sin tarea → agrupado por IA → confirmado por el profesor). Se dejaron unificados en la sección 3 para evitar mantener la misma lógica en dos lugares.
- **Por qué existe la calificación individual dentro de un grupo:** con calificación compartida, un integrante que usó la IA de forma crítica y otro que delegó todo terminan con la misma nota — eso ocultaba justamente el problema que el sistema busca detectar. Con `group_grading_mode = 'individual'`, cada quien responde por sus propios chats (`submission_chats.student_id`), y el profesor puede ver puntualmente quién quedó mal sin penalizar al resto del grupo.
- **Gemas de Gemini — por qué no se confía en las instrucciones pegadas por el estudiante:** las instrucciones de una Gema no se pueden leer desde el enlace público, y el dueño de la Gema puede cambiarlas en cualquier momento (antes o después de generar el chat que se entrega). Por eso el texto pegado por el estudiante es informativo, no verificable. La única forma de tener garantías reales es que la evaluación se apoye en una **Gema específica que el profesor conoce y controla** (lista de Gemas aprobadas por curso); todo lo demás (Gema propia del estudiante, o directamente Claude/ChatGPT) sigue permitido, pero se etiqueta según corresponda ("gema no verificada" o "chat estándar") para que el profesor tenga el contexto al calificar.
