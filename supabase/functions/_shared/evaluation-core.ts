declare const Deno: {
  env: { get(key: string): string | undefined }
}

export type Platform = 'gemini' | 'claude' | 'chatgpt' | 'other'

export interface SubmissionChat {
  id: string
  submission_id: string
  student_id: string
  chat_url: string
  platform: Platform
  is_gem: boolean
  approved_gem_id: string | null
  gem_instructions_pasted: string | null
}

export interface ApprovedGem {
  id: string
  course_id: string
  name: string
  gem_url: string
}

export type Profile = 'productive_passenger' | 'reluctant_optimizer' | 'mental_marathoner'

export interface EvidenceRef {
  chat: number
  message: number
  quote: string
}

export interface CriterionResult {
  key: string
  rating: number
  band: { level: number; label: string; description: string }
  explanation: string
  evidence: EvidenceRef[]
}

export interface EvaluationBreakdown {
  profile: Profile
  criteria: CriterionResult[]
  strengths: string[]
  improvements: string[]
  summary: string
}

export const CRITERIA: Array<{ key: string; weight: number }> = [
  { key: 'ownership', weight: 30 },
  { key: 'critical_engagement', weight: 25 },
  { key: 'ai_as_tutor', weight: 20 },
  { key: 'integration_originality', weight: 15 },
  { key: 'process_awareness', weight: 10 },
]

export const PROFILES: Profile[] = ['productive_passenger', 'reluctant_optimizer', 'mental_marathoner']
export const FLAG_THRESHOLD = 30
const MAX_COMPOSED_CHARS = 300_000

type Band = { max: number; description: string }

const CRITERIA_BANDS: Record<string, Band[]> = {
  ownership: [
    { max: 20, description: 'Pidió la respuesta final para copiarla tal cual; no hizo trabajo propio.' },
    { max: 40, description: 'Solo pidió ajustes de formato o extensión sobre lo que escribió la IA.' },
    { max: 60, description: 'Aportó material o instrucciones propias, pero delegó el trabajo central.' },
    { max: 80, description: 'Hizo la mayor parte del trabajo y usó la IA para dudas puntuales.' },
    { max: 100, description: 'Produjo su propio trabajo; la IA solo verificó o ayudó en lo rutinario.' },
  ],
  critical_engagement: [
    { max: 20, description: 'Aceptó todo sin cuestionar (rendición cognitiva); sin seguimiento.' },
    { max: 40, description: 'Comentarios sueltos ("escribe más") sin validar el contenido.' },
    { max: 60, description: 'Revisó resultados y señaló errores, pero sin pedir fundamentos ni fuentes.' },
    { max: 80, description: 'Cuestionó respuestas y pidió justificación o correcciones concretas.' },
    { max: 100, description: 'Iteró profundamente: desafió, redirigió, comparó alternativas y verificó.' },
  ],
  ai_as_tutor: [
    { max: 20, description: 'Usó la IA como máquina de respuestas finales para entregar.' },
    { max: 40, description: 'Algún pedido de explicación, pero predominó el "dame el resultado".' },
    { max: 60, description: 'Mezcla: pidió resultados y también algo de orientación.' },
    { max: 80, description: 'Predominio de pedir pistas, explicaciones o guía paso a paso.' },
    { max: 100, description: 'IA usada como tutora: entender primero, obtener después.' },
  ],
  integration_originality: [
    { max: 20, description: 'Salida genérica copiada tal cual, sin aporte personal.' },
    { max: 40, description: 'Cambios cosméticos sobre un texto genérico.' },
    { max: 60, description: 'Contextualizó parcialmente con datos propios.' },
    { max: 80, description: 'Integró material propio sustantivo y adaptó la salida a su contexto.' },
    { max: 100, description: 'Producto claramente personal: ideas del estudiante con IA de apoyo.' },
  ],
  process_awareness: [
    { max: 20, description: 'Delegó incluso la parte creativa o de redacción (lo que debía ser propio).' },
    { max: 40, description: 'Reservó poco esfuerzo propio: casi todo fue generado por IA.' },
    { max: 60, description: 'Alternó algo de esfuerzo propio con delegación a la IA.' },
    { max: 80, description: 'Reservó lo creativo y analítico; delegó solo lo rutinario.' },
    { max: 100, description: 'Proceso deliberado: IA solo donde aporta; el pensamiento propio queda protegido.' },
  ],
}

export function bandFor(criterionKey: string, rating: number): { level: number; label: string; description: string } {
  const bands = CRITERIA_BANDS[criterionKey] ?? []
  const index = bands.findIndex((b) => rating <= b.max)
  const level = index === -1 ? bands.length : index + 1
  const min = level === 1 ? 0 : bands[level - 2].max + 1
  const max = index === -1 ? 100 : bands[index].max
  return {
    level,
    label: `${min}–${max}`,
    description: bands[index === -1 ? bands.length - 1 : index]?.description ?? '',
  }
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const JINA_READER_URL = 'https://r.jina.ai'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function decodeJwtPayload(jwt: string): { sub?: string } | null {
  try {
    const part = jwt.split('.')[1]
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    return JSON.parse(json)
  } catch {
    return null
  }
}

async function jinaFetch(chatUrl: string, extraHeaders: Record<string, string>): Promise<string> {
  const response = await fetch(`${JINA_READER_URL}/${chatUrl}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Engine': 'browser',
      'X-Return-Format': 'markdown',
      ...extraHeaders,
    },
  });
  if (!response.ok) {
    throw new Error(`No se pudo leer el enlace (error del lector: status ${response.status}`);
  }
  return await response.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEAD_SHARE_RE = /(Link doesn't exist|might have been deleted|Something went wrong \(\d+\))/i;

const TARGET_SELECTOR = 'user-query, [data-test-id="created-with-gem"]';

/** Extracción anónima en cascada para shares públicos. */
export async function fetchChatText(chatUrl: string): Promise<string> {
  const strategies: Array<Record<string, string>> = [
  { 'X-Target-Selector': TARGET_SELECTOR },
  { 'X-Target-Selector': TARGET_SELECTOR, 'X-No-Cache': 'true' },
  { 'X-No-Cache': 'true' },
  ];
  let lastText = '';
  let lastError: unknown = null;
  for (let i = 0; i < strategies.length; i++) {
    if (i > 0) await sleep(1500);
    let text: string;
    try {
      text = await jinaFetch(chatUrl, strategies[i]);
    } catch (err) {
      lastError = err;
      continue;
    }
    lastText = text;
    if (DEAD_SHARE_RE.test(text)) {
      throw new Error(
        'Este enlace no se puede leer sin iniciar sesión (cuenta institucional). Comparte desde una cuenta personal de Google como "Cualquiera con el enlace".',
      );
    }
    if (isUsableExtraction(text)) return text;
  }
  if (lastText) return lastText;
  throw lastError ?? new Error('El lector devolvió una respuesta vacía.');
}

export function detectGem(chatUrl: string, extractedText: string): boolean {
  try {
    const parsed = new URL(chatUrl)
    if (parsed.pathname.includes('/gem/')) return true
    if (parsed.searchParams.has('gem')) return true
  } catch {
    return false
  }
  const lowered = extractedText.toLowerCase()
  if (lowered.includes('this is a gem') || lowered.includes('is a gem')) return true
  if (lowered.includes("creator's gem") || lowered.includes('el gem de un creador')) return true
  if (lowered.includes('created with gemini') && lowered.includes('gem')) return true
  return false
}

export function normalizeGemUrl(chatUrl: string): string {
  try {
    const parsed = new URL(chatUrl)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return chatUrl
  }
}

const TURN_SPLIT_RE = /(?:^|\n)[^\S\n]*(?:You said|Has dicho):?[^\S\n]*(?:\n|$)/i

const BOILERPLATE_LINE_RE =
  /^(Title:|URL Source:|Markdown Content:|Copy public link|Gemini may display inaccurate|Show code|Show thinking|Show more|(Mostrar|Ver) c(ó|o)digo|Responses below were generated|Las respuestas que aparecen a continuación|Google apps|Sign in\s*$|Report\s+http|\[(About Gemini|FAQ|Google Privacy Policy|Google Terms of Service|Sign in|https?:))/i

function cleanExtraction(rawText: string): string {
  return rawText
    .split('\n')
    .filter((line) => !BOILERPLATE_LINE_RE.test(line.trim()))
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '[adjunto]')
}

export function splitIntoMessages(rawText: string): string[] {
  const cleaned = cleanExtraction(rawText);

  // Corta en líneas que INICIEN con el marcador de turno, tolerando
  // headings markdown (##### You said) y texto pegado después del label.
  const markerRe = /^\s*(?:#{1,6}\s*)?(?:You said|Has dicho)\b:?/i;
  const turns: string[] = [];
  let current: string[] = [];
  let started = false;

  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trimEnd();
    if (markerRe.test(line)) {
      if (started) {
        const t = current.join('\n').trim();
        if (t) turns.push(t);
      }
      started = true;
      const rest = line.replace(markerRe, '').trim();
      current = rest ? [rest] : [];
      continue;
    }
    if (started) current.push(line);
  }
  if (started) {
    const t = current.join('\n').trim();
    if (t) turns.push(t);
  }

  if (turns.length > 0) return turns;

  return cleaned
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}
function isUsableExtraction(rawText: string): boolean {
  const totalChars = splitIntoMessages(rawText).reduce((acc, message) => acc + message.length, 0)
  return totalChars >= 200
}

export function composeChatsText(
  chats: Array<{ chat_url: string; platform: string; is_gem: boolean; extraction_error: string | null; extracted_text: string }>,
): { text: string; messageCounts: number[] } {
  const parts: string[] = []
  const messageCounts: number[] = []
  let used = 0
  chats.forEach((chat, idx) => {
    const n = idx + 1
    parts.push(`--- Chat ${n} (${chat.platform}${chat.is_gem ? ', verified gem' : ''}) ---`)
    parts.push(`URL: ${chat.chat_url}`)
    if (chat.extraction_error || !chat.extracted_text) {
      parts.push(`ERROR: ${chat.extraction_error ?? 'empty extraction'}`)
      messageCounts.push(0)
      return
    }
    let count = 0
    for (const message of splitIntoMessages(chat.extracted_text, chat.platform === 'gemini')) {
      if (used + message.length > MAX_COMPOSED_CHARS) {
        parts.push('[truncated due to size limits]')
        break
      }
      parts.push(`[C${n}-M${count + 1}] ${message}`)
      used += message.length
      count++
    }
    messageCounts.push(count)
  })
  return { text: parts.join('\n\n'), messageCounts }
}

const EVALUATION_PROMPT = `You are evaluating how a student used AI assistants on an academic assignment, based EXCLUSIVELY on the messages the student typed.

WHAT YOU SEE: markers [C<chat>-M<message>] identify each message the student sent (M1 = first message, M2 = next, and so on). The assistant's replies are deliberately EXCLUDED from the transcripts — this is by design, not missing evidence. Judge only what the student wrote. Never speculate about what the assistant answered, and never lower a rating because a reply is absent or because the conversation appears to "end" mid-exchange: students submit excerpts, and every visible student message is complete evidence in itself.

Rate the student's AI usage on five criteria, each an integer from 0 to 100. Use these band descriptions to anchor each rating:

- ownership — Did the student do the central intellectual work themselves or delegate it?
  * 0-20: asked for final answers to copy verbatim; no own work.
  * 21-40: only requested formatting/length tweaks over AI-written text.
  * 41-60: provided own material or instructions but delegated the core work.
  * 61-80: did most of the work themselves; AI for specific doubts.
  * 81-100: produced their own work; AI only verified or handled routine parts.
- critical_engagement — Critical stance, judged from the student's own wording regardless of message count.
  * 0-20: accepted everything without question (cognitive surrender); pure compliance.
  * 21-40: loose remarks ("write more") without validating content.
  * 41-60: flagged errors but didn't ask for justification or propose alternatives.
  * 61-80: questioned, requested justification or corrections, proposed hypotheses to test.
  * 81-100: genuine critical stance: challenged assumptions with own reasoning, proposed concrete alternatives, asked for verification against specific sources or criteria.
- ai_as_tutor — Tutor vs. answer machine.
  * 0-20: used AI as a final-answer machine to hand in.
  * 21-40: occasional explanation requests, mostly "give me the result".
  * 41-60: mixed results and guidance requests.
  * 61-80: predominantly asked for hints, explanations, step-by-step guidance.
  * 81-100: AI as tutor: understanding first, output second (e.g. brings own work for critique, asks to be challenged).
- integration_originality — Personal integration vs. generic copy-paste.
  * 0-20: generic output copied as-is; nothing personal.
  * 21-40: cosmetic changes over generic text.
  * 41-60: partially contextualized with own data.
  * 61-80: integrated substantive own material and adapted output to context.
  * 81-100: clearly personal product: student ideas with AI support.
- process_awareness — Protecting creative/intellectual work from automation.
  * 0-20: delegated even the writing/creative part that should be their own.
  * 21-40: reserved little; almost everything AI-generated.
  * 41-60: alternated some own effort with delegation.
  * 61-80: kept creative/analytical work; delegated routine tasks.
  * 81-100: deliberate process: AI only where it adds value.

Profiles:
- productive_passenger: uses AI to avoid thinking; delegates the intellectual core of the task.
- reluctant_optimizer: starts engaged but succumbs to optimization under time pressure; values the final product over understanding.
- mental_marathoner: high need for cognition; keeps agency, uses AI as tutor, protects original thinking.

Calibration anchors (single-message contrasts):
- LOW: "[C1-M1] Based on this info. Answer: the questions in the photo [attaches the assignment]" → demands the solution itself: ownership ~10, ai_as_tutor ~10, integration ~15. Attaching the ASSIGNMENT to get its solution is delegation even though the student attached "material".
- HIGH: "[C1-M1] Here is the draft model my partner and I built from chapter 2. I'm unsure what goes in management processes, and I think I can split financial management further — tell me if I'm doing it right." → brings OWN work built offline, states own hypothesis, requests critique: ownership ~85, critical_engagement ~85, ai_as_tutor ~90, integration ~85, process_awareness ~85.

Rules:
- IMPORTANT: Write ALL human-readable text (explanation, strengths, improvements, summary) in the SAME LANGUAGE as the student's chat transcripts.
- Each criterion MUST include evidence: short verbatim quotes copied exactly from the transcripts, identified by "chat" (1-based chat number) and "message" (the M number from its [CN-MK] marker).
- In every explanation, explicitly name which band behaviors you observed (e.g. "asks for tweaks over AI text (21-40)").
- IMPORTANT: message COUNT carries no inherent weight. Students are never expected to submit full conversations — excerpts of 1-3 messages are the norm. Rate the QUALITY of the behavior visible in each message: one rich message that brings own work, states a hypothesis and asks to be challenged fully demonstrates top-band behavior and MUST be rated 81-100 on the criteria it evidences. Conversely, many shallow messages stay low.
- If a transcript failed to load (ERROR line), you may leave that criterion's evidence empty and rate conservatively.

Respond strictly as JSON with this exact shape:
{
  "profile": "<productive_passenger | reluctant_optimizer | mental_marathoner>",
  "criteria": [
    {
      "key": "<one of: ${CRITERIA.map((c) => c.key).join(', ')}>",
      "rating": <integer 0-100>,
      "explanation": "<why this rating, naming observed band behaviors, in the transcript language>",
      "evidence": [{ "chat": <int>, "message": <int>, "quote": "<verbatim>" }]
    }
  ],
  "strengths": ["<...>"],
  "improvements": ["<actionable advice to move toward mental_marathoner behavior>"],
  "summary": "<1-2 sentence executive summary of the case, in the transcript language>"
}

CHATS:
"""
{{CHATS_TEXT}}
"""`

const GEMINI_MODEL_CHAIN = [
  'gemini-3.6-pro',
  'gemini-3.6-flash',
  'gemini-3.5-pro',
  'gemini-3.5-flash',
  'gemini-pro-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash',
]

let cachedAvailableModels: string[] | null = null

async function fetchAvailableModels(apiKey: string): Promise<string[]> {
  if (cachedAvailableModels) return cachedAvailableModels
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}&pageSize=100`)
    if (!res.ok) return []
    const data = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>
    }
    const names: string[] = []
    for (const m of data.models ?? []) {
      if (!m.supportedGenerationMethods?.includes('generateContent') || typeof m.name !== 'string') continue
      names.push(m.name.replace(/^models\//, ''))
    }
    if (names.length > 0) cachedAvailableModels = names
    return names
  } catch {
    return []
  }
}

async function attemptEvaluation(
  model: string,
  composedText: string,
  messageCounts: number[],
  apiKey: string,
): Promise<{ score: number; breakdown: EvaluationBreakdown }> {
  const endpoint = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: EVALUATION_PROMPT.replace('{{CHATS_TEXT}}', composedText) }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            profile: { type: 'STRING', enum: PROFILES },
            criteria: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  key: { type: 'STRING', enum: CRITERIA.map((c) => c.key) },
                  rating: { type: 'INTEGER' },
                  explanation: { type: 'STRING' },
                  evidence: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        chat: { type: 'INTEGER' },
                        message: { type: 'INTEGER' },
                        quote: { type: 'STRING' },
                      },
                      required: ['chat', 'message', 'quote'],
                    },
                  },
                },
                required: ['key', 'rating', 'explanation', 'evidence'],
              },
            },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            improvements: { type: 'ARRAY', items: { type: 'STRING' } },
            summary: { type: 'STRING' },
          },
          required: ['profile', 'criteria', 'strengths', 'improvements', 'summary'],
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let detail = errorText.slice(0, 300)
    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } }
      if (parsed.error?.message) detail = parsed.error.message.slice(0, 250)
    } catch {
      /* keep raw slice */
    }
    const hint =
      response.status === 429
        ? ' — quota exhausted. It resets at midnight Pacific Time, or enable billing on Google AI Studio for higher limits.'
        : ''
    throw new Error(`Error de la IA generativa (status ${response.status}${hint}: ${detail}`)
  }

  const data = await response.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) throw new Error('Gemini returned an empty response')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`Failed to parse Gemini response as JSON: ${describeError(error)}`)
  }

  return normalizeEvaluation(parsed, messageCounts)
}

export async function evaluateWithGemini(
  composedText: string,
  messageCounts: number[],
): Promise<{ score: number; breakdown: EvaluationBreakdown }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const available = await fetchAvailableModels(apiKey)
  const chain = available.length > 0 ? GEMINI_MODEL_CHAIN.filter((m) => available.includes(m)) : GEMINI_MODEL_CHAIN
  const modelsToTry = chain.length > 0 ? chain : GEMINI_MODEL_CHAIN

  const errors: string[] = []
  for (const model of modelsToTry) {
    try {
      return await attemptEvaluation(model, composedText, messageCounts, apiKey)
    } catch (err) {
      errors.push(`${model}: ${describeError(err)}`)
    }
  }
  throw new Error(`All Gemini models failed (${modelsToTry.join(', ')}). Last errors: ${errors.join(' | ').slice(0, 600)}`)
}

function normalizeEvaluation(
  raw: unknown,
  messageCounts: number[],
): { score: number; breakdown: EvaluationBreakdown } {
  const obj = raw as Record<string, unknown>
  if (!obj || typeof obj !== 'object') throw new Error('Gemini response did not match the expected schema')

  const profile = obj.profile as Profile
  if (!PROFILES.includes(profile)) throw new Error(`Invalid profile in Gemini response: ${String(obj.profile)}`)

  if (!Array.isArray(obj.criteria)) throw new Error('Gemini response is missing criteria array')

  const byKey = new Map<string, CriterionResult>()
  for (const item of obj.criteria as Array<Record<string, unknown>>) {
    const key = String(item?.key ?? '')
    const known = CRITERIA.find((c) => c.key === key)
    if (!known || byKey.has(key)) continue

    const ratingRaw = Number(item?.rating)
    if (!Number.isFinite(ratingRaw)) continue
    const rating = Math.max(0, Math.min(100, Math.round(ratingRaw)))

    const evidence: EvidenceRef[] = []
    if (Array.isArray(item?.evidence)) {
      for (const ref of item.evidence as Array<Record<string, unknown>>) {
        const chatNum = Number(ref?.chat)
        const messageNum = Number(ref?.message)
        const quote = typeof ref?.quote === 'string' ? ref.quote : ''
        if (!quote.trim()) continue
        if (
          Number.isInteger(chatNum) &&
          chatNum >= 1 &&
          chatNum <= messageCounts.length &&
          Number.isInteger(messageNum) &&
          messageNum >= 1 &&
          messageNum <= messageCounts[chatNum - 1]
        ) {
          evidence.push({ chat: chatNum, message: messageNum, quote })
        }
      }
    }

    byKey.set(key, {
      key,
      rating,
      band: bandFor(key, rating),
      explanation: typeof item?.explanation === 'string' ? item.explanation : '',
      evidence,
    })
  }

  const missing = CRITERIA.filter((c) => !byKey.has(c.key))
  if (missing.length > 0) {
    throw new Error(`Gemini response is missing criteria: ${missing.map((c) => c.key).join(', ')}`)
  }

  const totalWeight = CRITERIA.reduce((acc, c) => acc + c.weight, 0)
  const weightedSum = CRITERIA.reduce((acc, c) => acc + c.weight * (byKey.get(c.key)?.rating ?? 0), 0)
  const score = Math.round(weightedSum / totalWeight)

  return {
    score,
    breakdown: {
      profile,
      criteria: CRITERIA.map((c) => byKey.get(c.key) ?? { key: c.key, name: c.name, weight: c.weight, rating: 0, band: { level: 1, label: '—', description: '' }, explanation: '', evidence: [] }),
      strengths: Array.isArray(obj.strengths) ? (obj.strengths as string[]).filter((s) => typeof s === 'string') : [],
      improvements: Array.isArray(obj.improvements) ? (obj.improvements as string[]).filter((s) => typeof s === 'string') : [],
      summary: typeof obj.summary === 'string' ? obj.summary : '',
    },
  }
}
