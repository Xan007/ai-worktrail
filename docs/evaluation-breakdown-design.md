# Diseño: Evaluación con puntaje justificado (breakdown estructurado)

Estado: implementado y verificado · 2026-08-24
Función afectada: `supabase/functions/evaluate-submission` · UI: `src/pages/TaskDetail.tsx`

## 1. Problema

La evaluación original devolvía `{ score, justification, flagged }` donde Gemini asignaba el total
directamente y lo justificaba con un párrafo suelto de 2–4 frases. El "por qué" del puntaje no era
verificable ni auditable: el número lo inventaba el modelo.

## 2. Principio de diseño

**El puntaje debe ser explicable por construcción.** Gemini evalúa criterios individuales con
evidencia citada a nivel de mensaje; el servidor calcula el total como promedio ponderado
determinístico. El desglose se justifica con aritmética, no con la opinión del modelo.

Marco conceptual: *"The People Who Will Thrive in the AI Age"* (David Brooks, The Atlantic) —
tres perfiles según necesidad de cognición:

| Perfil | Definición | Señales en los prompts |
|---|---|---|
| Pasajero productivo (*Productive Passenger*) | Usa IA para evitar pensar; delega el trabajo intelectual | Prompts pidiendo la respuesta final para copiar, instrucciones anti-detección ("humanizer"), cero seguimiento |
| Optimizador reacio (*Reluctant Optimizer*) | Sabe que depender es malo pero sucumbe bajo presión | Empieza con ideas propias pero termina aceptando la salida tal cual; pide atajos; "rendición cognitiva" |
| Maratonista mental (*Mental Marathoner*) | Alta necesidad de cognición; usa IA sin perder agencia | Trae trabajo propio para ser criticado, pide pistas en vez de respuestas, estructura sus ideas antes de consultar |

## 3. Rúbrica: criterios y pesos

Constantes editables en la Edge Function (`CRITERIA`):

| # | Criterio | Peso | Mide |
|---|---|---|---|
| C1 | Propiedad del pensamiento (*ownership*) | 30% | ¿El estudiante hizo el trabajo intelectual central o lo delegó? |
| C2 | Compromiso crítico | 25% | Cuestiona, pide justificación/fuentes, propone hipótesis a testear |
| C3 | IA como tutora vs. enciclopedia | 20% | Pide pistas/explicaciones vs. respuestas directas para copiar |
| C4 | Integración y originalidad | 15% | Material propio sustantivo, adaptación a su contexto |
| C5 | Conciencia de proceso | 10% | Reserva IA para lo rutinario; protege lo creativo/analítico |

Cada criterio se califica 0–100 con **citas textuales obligatorias** de los prompts.

## 4. Modelo de datos (migraciones `00014`, `00015`)

```sql
ALTER TABLE public.analysis ADD COLUMN breakdown JSONB;
ALTER TABLE public.submission_chats ADD COLUMN extracted_text TEXT;
ALTER TABLE public.submission_chats ADD COLUMN extraction_error TEXT;
```

Forma de `breakdown`:

```json
{
  "profile": "productive_passenger",
  "criteria": [
    {
      "key": "ownership",
      "rating": 45,
      "band": { "level": 3, "label": "41-60", "description": "Aportó material o instrucciones propias, pero delegó el trabajo central." },
      "explanation": "...",
      "evidence": [{ "chat": 1, "message": 2, "quote": "..." }]
    }
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "summary": "..."
}
```

- `justification` (TEXT existente) sigue poblándose con `summary`: compatibilidad hacia atrás.
- Filas previas sin `breakdown` renderizan por fallback simple.
- La banda (`level/label/description`) se calcula determinísticamente desde el rating
  (`bandFor`) usando `CRITERIA_BANDS`: la misma tabla va al prompt para anclar al modelo.

## 5. Pipeline de evaluación

### 5.1 Extracción y corte por turnos

Jina Reader con `X-Target-Selector: user-query, [data-test-id="created-with-gem"]`: extrae
**únicamente los mensajes del estudiante** (elementos `<user-query>` del share) más el marcador de
Gema, excluyendo por completo las respuestas de la IA (49KB → 7.4KB en la prueba). Los shares de
Gemini (igual que ChatGPT) marcan cada turno con ` You said ` / ` Has dicho `. Pipeline:

1. **Cadena de reintentos con validación** (`isUsableExtraction`: ≥200 chars limpios):
   a. target selector · b. target selector + `X-No-Cache` (evita reintentos envenenados por la
   caché de 1h de Jina tras un render fallido) · c. página completa sin selector (fallback:
   incluye respuestas, pero garantiza contenido). Motivación: shares con Gema renderizan tarde y
   una captura prematura devuelve solo chrome.
2. Limpieza: quitar líneas de chrome (`Title:`, `URL Source:`, nav, footer), botones,
   disclaimers; colapsar imágenes a `[adjunto]`.
3. Split por `/(?:^|\n)\s*(?:You said|Has dicho):?\s*(?:\n|$)/i` → un mensaje por turno real.
   Fallback: split clásico por línea vacía si la plataforma no usa marcadores.
4. `extracted_text` persiste la extracción cruda limpia; el mismo algoritmo vive en
   `TaskDetail.tsx` para el panel docente, garantizando que los `[CN-MK]` coincidan.

Links inaccesibles: si la página responde con estado de share muerto ("Link doesn't exist",
"Something went wrong (N)" — típico de shares via Drive sin permiso público), `fetchChatText`
corta los reintentos de inmediato y lanza error accionable; el handler lo persiste en
`submission_chats.extraction_error` (migración 00015) y la UI lo muestra bajo el chat. Si NINGÚN
chat de la entrega es legible, la función devuelve 422 en lugar de generar un análisis falso.
Los estudiantes deben compartir con "Cualquiera con el link".

Detección de gemas: primaria por URL (`/gem/`, parámetro, match contra gema aprobada
normalizada); secundaria por contenido (`creator's Gem` / `el Gem de un creador` vía el marcador
incluido por el selector combinado).

### 5.2 Bandas descriptivas por criterio

Cada criterio tiene 5 bandas con comportamiento observable definido en código
(`CRITERIA_BANDS`). La misma tabla va al prompt (para anclar el rating del modelo) y la banda se
persiste dentro de cada criterio. El prompt exige nombrar las conductas de banda observadas en
cada explicación. Así un 10 vs un 50 vs un 100 tiene significado explícito y visible en la UI
(badge de rango + descripción bajo la barra del criterio).

### 5.3 Evaluación basada solo en prompts (principio)

El evaluador ve **exclusivamente los mensajes del estudiante**; las respuestas del asistente se
excluyen por diseño (son largas y no aportan al juicio del comportamiento del estudiante). El
prompt lo explicita: no especular sobre respuestas ausentes, no penalizar que la conversación
"termine" a mitad de intercambio — cada mensaje visible es evidencia completa. Temperatura 0 para
consistencia de calificaciones (casos fronterizos como `flagged` en el umbral 30 no deben variar
entre corridas).

### 5.4 Filosofía de puntaje

**Nunca se exige el diálogo completo**: los estudiantes comparten extractos de 1–3 mensajes por
diseño, y la rúbrica está calibrada para eso. El conteo de mensajes **no tiene peso inherente** —
lo que se mide es la calidad del comportamiento visible. La distinción clave: adjuntar LA TAREA
para que la resuelvan = delegación; adjuntar TRABAJO PROPIO construido offline pidiendo crítica =
modo tutor pleno (banda 81–100 alcanzable con un solo mensaje). Anclas por contraste en el prompt
(ejemplo delegador ~10 vs ejemplo maratonista ~85) calibran al modelo mejor que reglas abstractas.

Verificación con entregas reales (2026-08-24): chat de Gema con tutoría genuina → **84**
(*Mental Marathoner*); chat delegador con instrucciones anti-detección → **30, flagged**
(*Productive Passenger*). Separación clara sin requerir volumen.

## 6. UI (TaskDetail)

- Badge de perfil coloreado: rosa = Pasajero, ámbar = Optimizador reacio, esmeralda = Maratonista.
- Score + perfil; por criterio: barra de rating, badge de banda con descripción, explicación y
  citas en blockquote con badge `Chat N · Mk`.
- Listas de fortalezas y mejoras (cómo escalar hacia Maratonista).
- Panel **View prompts** solo docente: mensajes numerados con los mismos marcadores `[CN-MK]`.
- Si `extraction_error` está poblado, se muestra aviso ámbar bajo el chat ("Extraction failed: ...").
- Fallback al render simple cuando `breakdown IS NULL`.

## 7. Decisiones registradas

- Idioma del feedback: el de los chats del estudiante.
- Visibilidad del desglose: profesor **y** estudiante (feedback formativo).
- Pesos 30/25/20/15/10; total determinístico en código; `flagged := total ≤ 30`.
- Evaluación multi-chat holística (un llamado a Gemini por entrega; buckets por miembro en
  tareas grupales con calificación individual).
- Citas a nivel mensaje `[CN-MK]` validadas server-side contra referencias inventadas.
- Solo prompts del estudiante, jamás las respuestas de la IA (decisión firme del producto).
- Nunca se exige compartir el diálogo completo; la calidad del mensaje importa, no el volumen.
- Temperatura 0 para reproducibilidad de calificaciones.
- Cadena de fallback de modelos Gemini priorizada por calidad (`GEMINI_MODEL_CHAIN`: pro ->
  flash -> aliases), filtrada en runtime contra ListModels; se salta rate-limited (429) o
  inexistente (404) y agrega error consolidado si todos fallan. Cada modelo tiene cuota propia,
  asi que el fallback resuelve agotamientos diarios sin intervencion.

## 8. Checklist de implementación

- [x] Migración `00014_analysis_breakdown.sql` (breakdown JSONB + extracted_text)
- [x] Migración `00015_extraction_error.sql` (extraction_error)
- [x] Edge Function: CRITERIA/bandas, compose con marcadores, retry chain Jina, detección de
      share muerto, prompt/schema con anclas, total ponderado, persistencia completa
- [x] TaskDetail.tsx: tipos extendidos, desglose visual con bandas, panel Ver prompts, avisos de
      error de extracción, fallback
- [x] Push migraciones, deploys, pruebas end-to-end, `npm run build`
