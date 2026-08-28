# Plan de Proyecto: Sistema de Auditoría y Recolección de Uso de IA

## 1. Objetivo General
Desarrollar un sistema web donde los estudiantes registren de forma autónoma los enlaces públicos de sus interacciones con inteligencias artificiales (Gemini, ChatGPT, Claude, etc.) por cada tarea, permitiendo al profesor auditar, procesar y calificar automáticamente el nivel de uso crítico frente a la delegación total.

---

## 2. Arquitectura del Sistema

*   **Frontend:** Aplicación web en **React + TypeScript + Tailwind CSS**, alojada en **Cloudflare Pages**. Accesible como sitio independiente o embebible en Moodle. Layout compartido (`AppLayout`) con navbar/footer, componentes base reutilizables y página de pruebas de evaluación en `/dev/evaluate`.
*   **Backend / BaaS:** **Supabase** (Postgres + RLS) + **Clerk** (Auth). Clerk maneja autenticación (email/password y Google OAuth) y sesiones; Supabase provee base de datos relacional y reglas de acceso por rol. El JWT de Clerk se pasa en cada request a Supabase para que RLS aplique las políticas correctas.
*   **Motor de Análisis (automatizado, implementado):** **Supabase Edge Functions** que consultan la entrega, extraen solo los prompts del estudiante (Jina Reader) y evalúan con la API de Gemini:
    - **`evaluate-submission`:** motor completo — extracción resiliente por turnos, detección de gemas, desglose ponderado por criterios con evidencia citada `[CN-MK]`, total determinístico calculado en código, persistencia directa en `analysis`/`submission_chats`.
    - **Modo `on_submit`:** hoy lo dispara el frontend justo después de insertar la entrega. *(Pendiente: Database Webhook nativo para no depender del navegador.)*
    - **Modo `on_demand`:** el profesor pulsa Evaluate/Re-evaluate y el frontend invoca la función.
    - **Fallback de modelos:** cadena priorizada por calidad filtrada contra ListModels; salta rate-limits (429) automáticamente. Temperatura 0 para consistencia de calificaciones.
    - Corre con el `service_role` key de Supabase, así que escribe directo en `analysis` sin pasos intermedios.
    - Lógica compartida en `_shared/evaluation-core.ts` (rúbrica, bandas, prompt, extracción): un solo lugar para ajustar pesos/bandas.
    - **Jina Reader — capacidad:** sin API key (uso anónimo) el límite es de **20 RPM** pero **sin tope** total. Con **API key gratuita**: **10M tokens** incluidos y hasta **500 RPM**. Suficiente para el volumen por curso/tarea.

---

## 3. Documentación

| Archivo | Contenido |
|---|---|
| [schema.md](schema.md) | Modelo de datos, schema SQL, políticas RLS y triggers de validación, migraciones y Edge Functions |
| [flows.md](flows.md) | Flujos detallados por actor y escenario |
| [plan.md](plan.md) | Este archivo: objetivo, arquitectura, fases, consideraciones |
| [business-model.md](business-model.md) | Segmentos de cliente, planes/precios, y estrategia de adquisición |
| [evaluation-breakdown-design.md](evaluation-breakdown-design.md) | Diseño completo del motor de evaluación v2: rúbrica Brooks, bandas, citación por mensaje, extracción Jina, decisiones |

---

## 4. Fases de Desarrollo

- [x] **Fase 1: Base de datos y Auth** *(completada)*
    - Schema SQL, RLS y triggers de validación de negocio (ver [schema.md](schema.md)).
    - Clerk (email/password + Google OAuth) e integración con Supabase (JWT por request).
    - Aislamiento verificado; fix de políticas SELECT aplicado (migración 00013).

- [ ] **Fase 2: Frontend — Panel Profesor (Curso)** *(base hecha; falta gestión de inscripciones)*
    - [x] Login / registro con Clerk. Layout compartido con navbar/footer.
    - [x] Crear curso con `join_code` y modo de inscripción.
    - [x] Listado "Teaching" / "Enrolled" con cards, copy-code, estados vacíos y skeletons.
    - [ ] Gestionar inscripciones pendientes (aprobar/rechazar).
    - [ ] Definir categorías de grupo del curso (schema listo, UI pendiente).
    - [ ] Bloquear/desbloquear inscripciones.

- [ ] **Fase 3: Frontend — Tareas** *(base hecha)*
    - [x] Crear tarea individual o grupal con `group_grading_mode` y `ai_evaluation_mode`.
    - [x] Ver entregas agrupadas con desglose de puntaje por integrante cuando aplique.
    - [ ] Restricción de tareas grupales a categorías (UI).
    - [ ] Flujo abierto: submit sin tarea previa + clustering IA para sugerir agrupación.
    - [ ] Cierre automático por fecha / botón "Comenzar calificación".

- [ ] **Fase 4: Frontend — Flujo Estudiante** *(base hecha)*
    - [x] Unirse a curso por código; entregar una o más URLs de chat; re-enviar (versiona).
    - [x] Ver resultados completos: score + perfil Brooks + desglose con evidencia.
    - [ ] Selección de grupos al entregar (tareas grupales); cancelar solicitud pendiente.

- [x] **Fase 5: Motor de Evaluación** *(completada — ver evaluation-breakdown-design.md)*
    - Edge Functions `evaluate-submission` + núcleo compartido `_shared/evaluation-core.ts`.
    - Extracción prompts-only con corte por turnos `[CN-MK]`, retry chain y detección de shares muertos/inaccesibles.
    - Desglose ponderado por 5 criterios Brooks con bandas y citas verificadas server-side; total determinístico; perfil clasificado.
    - Fallback de modelos Gemini priorizado por calidad (resuelve rate-limits sin intervención).
    - Detección de gemas (URL + contenido) y match contra `approved_gems`.
    - Persistencia directa en `analysis`/`submission_chats`; `on_demand` invocable desde el frontend (`on_submit` hoy vía frontend post-insert; webhook nativo pendiente).
    - Visualización completa en la app (profesor y estudiante ven el mismo detalle) + herramienta de prueba `/dev/evaluate`.

- [ ] **Fase 6: Deploy y multi-tenancy**
    - Deploy frontend en Cloudflare Pages.
    - Estructura para facturación por universidad (tabla `tenants`) y por profesor independiente (ver [business-model.md](business-model.md)).

---

## 5. Consideraciones

*   **Costo objetivo:** $0 en desarrollo (Supabase Free + Clerk Pro estudiante + Cloudflare Pages Free).
*   **Costo producción estimado:** ~$25/mes (Supabase Pro) hasta escala significativa.
*   **Portabilidad:** Supabase es open source y auto-hospedable (`pg_dump`). Clerk permite exportar usuarios.
*   **Resiliencia:** No depende de scraping. Usa enlaces compartidos públicos y Jina Reader como conversor estable.
*   **Resiliencia de cuotas:** los tiers gratuitos de Gemini agotan cupos (el diario se agotó durante las pruebas). Mitigado con la cadena de fallback de modelos: cada modelo tiene cuota propia, así que la evaluación sigue funcionando aunque el modelo primario esté rate-limited. Jina Reader tiene reintentos con validación y bypass de caché para renders fallidos.
*   **Límite conocido — Gemas de Gemini:** las instrucciones internas de una Gema no se pueden leer desde el enlace público, y el dueño puede cambiarlas en cualquier momento (antes o después de generar el chat), por lo que no son verificables por el sistema. Mitigación: el profesor puede aprobar Gemas específicas por curso (`approved_gems`) para que la evaluación se apoye en instrucciones que él conoce; fuera de eso, el estudiante puede usar Claude, ChatGPT o una Gema propia sin restricción, pero queda marcado como "no verificada". En última instancia, depende de la buena fe del estudiante — el sistema documenta la señal, no la garantiza al 100%.
*   **Seguridad pendiente antes de producción:** las Edge Functions corren con `verify_jwt = false` (persistente desde su primer deploy) y autentican decodificando el payload del JWT sin validar firma. Hardening requerido: verificación JWKS/RS256 de Clerk dentro de cada función.
