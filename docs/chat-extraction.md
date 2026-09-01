# Extracción de Chats de IA: Claude, Gemini, ChatGPT

> **Fecha:** 2026-08-28
> **Estado:** Documentación de flujo actual + cambios planeados

---

## 1. Visión General

El sistema acepta URLs de chats compartidos de tres plataformas de IA:
- **Gemini** (google.com/share/ o links de Gemas)
- **Claude** (anthropic.com/share/)
- **ChatGPT** (chatgpt.com/share/ o openai.com/share/)

Cada URL se registra en la tabla `submission_chats` con su `platform` correspondiente. La extracción del texto sigue una cadena de 3 estrategias usando **Jina Reader** (`https://r.jina.ai`), con una **salida especial para Gemini** cuando el acceso anónimo falla.

---

## 2. Flujo de Extracción Actual

### 2.1 Pipeline de Jina Reader (estrategia de 3 intentos)

Para cada `chat_url`, la Edge Function `evaluate-submission` llama a `fetchChatText()` que ejecuta:

| Intento | Descripción |
|---------|-------------|
| **1** | Jina Reader con `X-Target-Selector: user-query, [data-test-id="created-with-gem"]` — extrae **solo mensajes del estudiante** + marcadores de Gema (Gemini). **20 RPM** límite sin API key. |
| **2** | Intento 1 + `X-No-Cache: true` — evita reintentos envenenados por caché de 1h de Jina tras un render fallido. |
| **3** | Fallback: Jina Reader **sin selector** — página completa (incluye respuestas de la IA, pero garantiza contenido). Si aún falla, error accionable. |

**Limpieza posterior** (aún en todos los intentos):
- Remueve líneas de chrome: `Title:`, `URL Source:`, navegación, pie de página, botones, disclaimers
- Colapsa imágenes a `[adjunto]`
- Elimina rastros de sesión, firmas de IA, publicidad

**Split de mensajes** (después de la extracción):
| Plataforma | Marcador de split |
|---|---|
| **Gemini** | `/(?:^|\n)\s*(?:You said|Has dicho):?\s*(?:\n|$)/i` |
| **ChatGPT** | `/(?:^|\n)\s*(?:Has dicho|You said):?\s*(?:\n|$)/i` |
| **Claude** | `/(?:^|\n)\s*(?:You said|Has dicho):?\s*(?:\n|$)/i` (mismo patrón, nombres de turno pueden variar) |
| **Fallback** | Split por línea vacía simple |

---

## 3. Plataforma por Plataforma

### 3.1 Gemini

**Extracción normal (anónima):**
- Usa `X-Target-Selector: user-query, [data-test-id="created-with-gem"]`
- Obtiene solo los mensajes del estudiante (elementos `<user-query>` del share)
- **Límite:** 20 RPM sin API key, sin tope total
- **Con key gratuita:** 10M tokens, 500 RPM

**Fallback a Azure (cuando falla la extracción anónima):**
> **Nuevo comportamiento planeado:** Si la estrategia de Jina Reader falla (link requiere cuenta de Google, share privado/institucional, o excede los 20 RPM), la URL se encola a una **Azure Function** que ejecuta la misma extracción **con una cuenta de Google activa**. Esto permite leer links que de otro modo serían inaccesibles de forma anónima.

**Detección de Gemas (Gemini):**
- **Primaria:** Patrón de URL `/gem/` o parámetro `?gem=`
- **Secundaria:** Contenido con marcadores `creator's Gem` / `Gem de un creador` (vía selector combinado de Jina Reader)
- Se hace match contra `approved_gems` del curso (tabla nueva)
- Si coincide → `is_gem = true`, `approved_gem_id` poblado → "Gema verificada" (chip verde)
- Si no coincide → `is_gem = true`, `approved_gem_id = null` → "Gema no verificada" (chip ámbar)
- Fuera de esto: el estudiante puede pegar cualquier link de Gema, pero queda marcado accordingly

**Errores comunes (Gemini):**
- "Link doesn't exist" (share eliminado, sin permiso público)
- "Something went wrong (N)" (typical de shares via Drive sin permiso)
- "Este enlace no se puede leer sin iniciar sesión" (requiere cuenta de Google)
- Empty extraction (Jina Reader retornó solo chrome)

---

### 3.2 Claude

**Extracción:**
- Mismo pipeline Jina Reader de 3 intentos
- Selector `user-query` funciona con shares de Claude (marcan turnos con `You said`)
- **Límite conocido:** Igual que Gemini anónimo: **20 RPM** sin API key
- **Sin API key tope total** (igual que Gemini)

**Diferencias con Gemini:**
- No hay concepto de "Gemas" — Claude no tiene ese modelo de suscripción pública
- El `platform` se guarda como `'claude'`, `is_gem` queda siempre `false`
- Sin detección de instrucciones verificables (no aplica)

**Errores comunes (Claude):**
- Same error types que Gemini anónimo
- "Link doesn't exist" / "Requiere sesión" / Empty extraction

---

### 3.3 ChatGPT

**Extracción:**
- Mismo pipeline Jina Reader de 3 intentos
- Selector `user-query` funciona con shares de ChatGPT (marcan turnos con `Has dicho`)
- **Límite conocido:** Igual que Gemini/Claude anónimo: **20 RPM** sin API key
- **Sin API key tope total** (igual que las otras plataformas)

**Diferencias con Gemini:**
- No hay concepto de Gemas
- El `platform` se guarda como `'chatgpt'`, `is_gem` queda siempre `false`
- Sin detección de instrucciones verificables (no aplica)

**Errores comunes (ChatGPT):**
- Same error types que las otras plataformas anónimas

---

## 4. Flujo de Fallback para Gemini a Azure

### 4.1 Cuándo se dispara
La extracción Jina Reader falla después de los 3 intentos O retorna texto vacío/muy corto (<200 chars limpios) O el error indica "requiere sesión de Google" / "acceso institucional".

### 4.2 Flujo Azure Function
1. El sistema toma el `chat_url` del chat Gemini que falló
2. Lo envía a una **Azure Function** (nuevo endpoint por crear)
3. La Azure Function ejecuta Jina Reader o similar **con credenciales de cuenta de Google** (Google API OAuth)
4. La extracción exitosa retorna el texto limpio
5. El texto se persiste en `submission_chats.extracted_text`
6. `extraction_error` queda `NULL` (aunque el camino fue "Azure fallback")

### 4.3 Ventajas
- Permite leer links de Gemini que requieren cuenta de Google
- Sin contar contra los 20 RPM límite anónimo
- El profesor/estudiante no nota diferencia en la UI

### 4.4 Consideraciones
- **Costo:** Azure Functions + cuentas de Google pueden tener costo asociado (diferente a Supabase Edge Functions gratuitas)
- **Privacidad:** Las URLs se procesan con credenciales de Google, pero el contenido sigue siendo de los chats compartidos (públicos o con link)
- **Límites de Google:** Las cuentas gratuitas de Google tienen sus propios límites de API, típicamente más altos que 20 RPM anónimo

---

## 5. Límites Conocidos por Plataforma

| Plataforma | Límite RPM (anónimo) | Límite tope | Comentarios |
|---|---|---|---|
| **Gemini** | 20 RPM | Sin tope (con key: 10M tokens) | Fallback Azure para links que requieren cuenta |
| **Claude** | 20 RPM | Desconocido / igual que Gemini | Mismo patrón de shares, selector user-query funciona |
| **ChatGPT** | 20 RPM | Desconocido / igual que Gemini | Mismo patrón de shares, selector user-query funciona |
| **Con key gratuita** | 500 RPM | 10M tokens / cuenta | Aplicable a las 3 plataformas cuando se configura Jina Reader API key |

**Notas adicionales:**
- Los reintentos incluyen `sleep 1.5s` entre intentos (estrategia 1→2 y 2→3)
- Si **ningún** chat de una entrega es legible, la Edge Function retorna **422** y **no genera análisis falso**
- Los estudiantes deben compartir con "Anyone with the link" para acceso anónimo exitoso
- El sistema detecta y maneja shares "muertos" (Link doesn't exist) cortando reintentos inmediatamente

---

## 6. Roadmap de Cambios

### 6.1 Pendiente implementar
1. **Azure Function para Gemini fallback** — crear endpoint que ejecute extracción con cuenta Google
2. **Detectar cuándo falla Jina Reader anónimo** — lógica en `fetchChatText` para encolar a Azure
3. **UI para indicar "usó Azure fallback"** — opcional, chip o aviso bajo el chat cuando el camino fue Azure vs. Jina Reader directo

### 6.2 Para futura verificación
- Probar límites RPM reales con cada plataforma (Claude/ChatGPT shares)
- Medir tasa de fallos anónimos vs. éxito con Azure fallback
- Validar que `extraction_error` messages sean claros por plataforma

---

## 7. Referencias de Código

- **Edge Function principal:** `supabase/functions/evaluate-submission/index.ts` — lógica de extracción y retry chain
- **Core compartido:** `src/lib/evaluation-core.ts` — `fetchChatText()`, `splitIntoMessages()`, `detectGem()`
- **Schema DB:** `docs/schema.md:124-150` — tabla `submission_chats` con `platform`, `extracted_text`, `extraction_error`
- **Documentos relacionados:**
  - `docs/flows.md` — flujos de entrega y evaluación
  - `docs/prompt.md` — especificación UI de vistas de prompts y calificación
  - `docs/evaluation-breakdown-design.md` — diseño del motor de evaluación v2