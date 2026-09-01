declare const Deno: {
  env: { get(key: string): string | undefined }
}

import { CRITERIA, EVALUATION_PROMPT, GEMINI_API_URL, GEMINI_MODEL_CHAIN, PROFILES } from './constants.ts'
import { bandFor, describeError } from './http.ts'
import type { CriterionResult, EvaluationBreakdown, EvidenceRef, Profile } from './types.ts'

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
      criteria: CRITERIA.map((c) => byKey.get(c.key) ?? { key: c.key, rating: 0, band: { level: 1, label: '—', description: '' }, explanation: '', evidence: [] }),
      strengths: Array.isArray(obj.strengths) ? (obj.strengths as string[]).filter((s) => typeof s === 'string') : [],
      improvements: Array.isArray(obj.improvements) ? (obj.improvements as string[]).filter((s) => typeof s === 'string') : [],
      summary: typeof obj.summary === 'string' ? obj.summary : '',
    },
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
      /* pass */
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

  const parsed = JSON.parse(raw)
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
