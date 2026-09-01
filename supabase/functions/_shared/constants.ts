import type { CriteriaBand, CriterionConfig, Profile } from './types.ts'

export const CRITERIA: CriterionConfig[] = [
  { key: 'ownership', weight: 30 },
  { key: 'critical_engagement', weight: 25 },
  { key: 'ai_as_tutor', weight: 20 },
  { key: 'integration_originality', weight: 15 },
  { key: 'process_awareness', weight: 10 },
]

export const PROFILES: Profile[] = ['productive_passenger', 'reluctant_optimizer', 'mental_marathoner']
export const FLAG_THRESHOLD = 30
export const MAX_COMPOSED_CHARS = 300_000

export const CRITERIA_BANDS: Record<string, CriteriaBand[]> = {
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

export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
export const JINA_READER_URL = 'https://r.jina.ai'

export const GEMINI_MODEL_CHAIN = [
  'gemini-3.6-pro',
  'gemini-3.6-flash',
  'gemini-3.5-pro',
  'gemini-3.5-flash',
  'gemini-pro-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash',
]

export const EVALUATION_PROMPT = `You are evaluating how a student used AI assistants on an academic assignment, based EXCLUSIVELY on the messages the student typed.

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
