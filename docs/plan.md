# Plan de Proyecto: Sistema de Auditoría y Recolección de Uso de IA

## 1. Objetivo General
Desarrollar un sistema web donde los estudiantes registren de forma autónoma los enlaces públicos de sus interacciones con inteligencias artificiales (Gemini, ChatGPT, Claude, etc.) por cada tarea, permitiendo al profesor auditar, procesar y calificar automáticamente el nivel de uso crítico frente a la delegación total.

---

## 2. Arquitectura del Sistema

*   **Frontend:** Aplicación web en **React + TypeScript + Tailwind CSS**, alojada en **Cloudflare Pages**. Accesible como sitio independiente o embebible en Moodle.
*   **Backend / BaaS:** **Supabase** (Postgres + RLS) + **Clerk** (Auth). Clerk maneja autenticación (email/password y Google OAuth) y sesiones; Supabase provee base de datos relacional y reglas de acceso por rol. El JWT de Clerk se pasa en cada request a Supabase para que RLS aplique las políticas correctas.
*   **Motor de Análisis (automatizado):** **Supabase Edge Function** que consulta la entrega, extrae el texto de los chats (Jina Reader) y evalúa con la API de Gemini. Se dispara sola — no requiere que el profesor descargue ni ejecute nada localmente:
    - **Modo `on_submit`:** un **Database Webhook** de Supabase la invoca automáticamente al insertarse la entrega.
    - **Modo `on_demand`:** el frontend la invoca (`supabase.functions.invoke(...)`) cuando el profesor abre una entrega puntual sin `analysis` todavía.
    - Corre con el `service_role` key de Supabase, así que escribe directo en `analysis` sin pasos intermedios (ver [flows.md](flows.md) sección 4, "Motor de evaluación automatizado").
    - **Jina Reader — capacidad:** sin API key (uso anónimo) el límite es de **20 RPM** (requests por minuto) pero **sin tope** de cantidad total de requests. Con **API key gratuita** se suman **10M tokens** incluidos y hasta **500 RPM**. Cualquiera de las dos opciones alcanza sin problema para el volumen esperado (por curso/tarea), tanto en modo `on_submit` como `on_demand`.

---

## 3. Documentación

| Archivo | Contenido |
|---|---|
| [schema.md](schema.md) | Modelo de datos, schema SQL, políticas RLS y triggers de validación |
| [flows.md](flows.md) | Flujos detallados por actor y escenario |
| [plan.md](plan.md) | Este archivo: objetivo, arquitectura, fases, consideraciones |
| [business-model.md](business-model.md) | Segmentos de cliente, planes/precios, y estrategia de adquisición |

---

## 4. Fases de Desarrollo

- [ ] **Fase 1: Base de datos y Auth**
    - Schema SQL, RLS y triggers de validación de negocio (ver [schema.md](schema.md)): tamaño de grupo por categoría, coherencia grupo-tarea.
    - Configurar Clerk (email/password y Google OAuth).
    - Integración Clerk → Supabase: pasar JWT en cada request.
    - Verificar aislamiento por rol y curso.

- [ ] **Fase 2: Frontend — Auth y Panel Profesor (Curso)**
    - Login / registro con Clerk.
    - Dashboard profesor: crear curso, configurar inscripción (modo, dominio, whitelist).
    - Gestionar inscripciones pendientes.
    - Definir categorías de grupo del curso (nombre + tamaño máximo); se podrán usar para restringir tareas grupales.
    - Bloquear/desbloquear inscripciones.

- [ ] **Fase 3: Frontend — Tareas**
    - Flujo profesor: crear tarea (individual o grupal). Si es grupal, elige entre restringirla a una categoría de grupo del curso (el `max_group_size` se hereda de esa categoría) o dejarla abierta a cualquier grupo (define `max_group_size` directamente).
    - Al crear la tarea, elegir el **momento de evaluación de IA** (`ai_evaluation_mode`): al instante de cada entrega, o bajo demanda cuando el profesor decida revisar (por defecto).
    - Si es grupal, elegir el **modo de calificación** (`group_grading_mode`): compartida (un puntaje para todo el grupo) o individual (un puntaje por integrante, para identificar quién usó mal la IA sin afectar al resto).
    - Validación de entrega grupal: si la tarea exige una categoría, el estudiante solo puede elegir entre sus grupos de esa categoría; si intenta entregar con compañeros que no forman ese grupo, el sistema avisa que no es válido.
    - Flujo abierto: estudiante hace submit sin tarea previa; clustering IA sugiere agrupación.
    - Cierre de tarea: automático por fecha/hora de vencimiento o manual con "Comenzar calificación".
    - Ver entregas agrupadas; si `group_grading_mode = 'individual'`, ver el desglose de puntaje por integrante dentro del grupo.

- [ ] **Fase 4: Frontend — Flujo Estudiante**
    - Unirse a curso, cancelar solicitud pendiente.
    - Ver tareas, entregar individual o grupal. Un estudiante puede pertenecer a más de un grupo (por ejemplo, uno por categoría); al entregar, solo ve/selecciona los grupos válidos según lo que pida la tarea.
    - Re-enviar mientras la tarea esté abierta.
    - Ver resultados (puntaje, justificación, flag) — propio, del grupo completo, o solo el propio dentro del grupo según `group_grading_mode`.

- [ ] **Fase 5: Motor de Evaluación**
    - Desarrollar la **Supabase Edge Function**: recibe una entrega (o corre por Database Webhook), consulta Supabase, extrae texto con Jina Reader y evalúa con Gemini Free Tier.
    - Configurar el **Database Webhook** para el modo `on_submit` (dispara la función al insertarse la entrega).
    - Exponer la invocación manual (`supabase.functions.invoke`) desde el frontend para el modo `on_demand`.
    - Detección de Gemas (solo Gemini por ahora): marcar cada chat como "es gema" / "no es gema", y si coincide con la lista `approved_gems` del curso, como "verificada" (ver [flows.md](flows.md) sección 4 y [schema.md](schema.md)).
    - Respetar `group_grading_mode` de la tarea: si es `shared`, evaluar todos los chats de la entrega juntos (un `analysis`); si es `individual`, agrupar los chats por `submission_chats.student_id` y generar un `analysis` por integrante.
    - Guardar resultados en `analysis` directamente desde la función (con `service_role` key), sin pasos manuales.
    - Visualización de resultados en el panel (incluyendo la etiqueta de gema por chat, y el desglose por integrante cuando aplique).

- [ ] **Fase 6: Deploy y multi-tenancy**
    - Deploy frontend en Cloudflare Pages.
    - Estructura para facturación por universidad (tabla `tenants`) y por profesor independiente (ver [business-model.md](business-model.md)).

---

## 5. Consideraciones

*   **Costo objetivo:** $0 en desarrollo (Supabase Free + Clerk Pro estudiante + Cloudflare Pages Free).
*   **Costo producción estimado:** ~$25/mes (Supabase Pro) hasta escala significativa.
*   **Portabilidad:** Supabase es open source y auto-hospedable (`pg_dump`). Clerk permite exportar usuarios.
*   **Resiliencia:** No depende de scraping. Usa enlaces compartidos públicos y Jina Reader como conversor estable.
*   **Límite conocido — Gemas de Gemini:** las instrucciones internas de una Gema no se pueden leer desde el enlace público, y el dueño puede cambiarlas en cualquier momento (antes o después de generar el chat), por lo que no son verificables por el sistema. Mitigación: el profesor puede aprobar Gemas específicas por curso (`approved_gems`) para que la evaluación se apoye en instrucciones que él conoce; fuera de eso, el estudiante puede usar Claude, ChatGPT o una Gema propia sin restricción, pero queda marcado como "no verificada". En última instancia, depende de la buena fe del estudiante — el sistema documenta la señal, no la garantiza al 100%.
