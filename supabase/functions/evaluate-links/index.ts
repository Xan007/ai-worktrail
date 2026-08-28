declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
}

import {
  composeChatsText,
  corsHeaders,
  decodeJwtPayload,
  detectGem,
  describeError,
  evaluateWithGemini,
  fetchChatText,
  FLAG_THRESHOLD,
  jsonResponse,
  type EvaluationBreakdown,
} from '../_shared/evaluation-core.ts'

const MAX_URLS = 8

interface LinkResult {
  url: string
  ok: boolean
  is_gem?: boolean
  score?: number
  flagged?: boolean
  profile?: EvaluationBreakdown['profile']
  breakdown?: EvaluationBreakdown
  error?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const callerId = decodeJwtPayload(token)?.sub
  if (!callerId) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  let payload: { urls?: unknown }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const rawUrls = Array.isArray(payload.urls) ? payload.urls : []
  const urls: string[] = []
  for (const u of rawUrls) {
    if (typeof u !== 'string') continue
    const v = u.trim()
    if (!/^https?:\/\//i.test(v)) continue
    urls.push(v)
    if (urls.length >= MAX_URLS) break
  }

  if (urls.length === 0) {
    return jsonResponse({ error: 'Provide at least one http(s) chat URL' }, 400)
  }

  const extracted = await Promise.all(
    urls.map(async (url) => {
      try {
        const text = await fetchChatText(url)
        return { url, text, error: null as string | null, is_gem: detectGem(url, text) }
      } catch (err) {
        return { url, text: '', error: describeError(err), is_gem: false }
      }
    }),
  )

  const results: LinkResult[] = await Promise.all(
    extracted.map(async (item) => {
      if (item.error || !item.text) {
        return { url: item.url, ok: false, error: item.error ?? 'empty extraction' } as LinkResult
      }
      const composed = composeChatsText([
        { chat_url: item.url, platform: 'gemini', is_gem: item.is_gem, extraction_error: null, extracted_text: item.text },
      ])
      try {
        const result = await evaluateWithGemini(composed.text, composed.messageCounts)
        return {
          url: item.url,
          ok: true,
          is_gem: item.is_gem,
          score: result.score,
          flagged: result.score <= FLAG_THRESHOLD,
          profile: result.breakdown.profile,
          breakdown: result.breakdown,
        } as LinkResult
      } catch (err) {
        return { url: item.url, ok: false, error: `Evaluation failed: ${describeError(err)}` } as LinkResult
      }
    }),
  )

  const usable = extracted.filter((item) => !item.error && item.text)

  let overall: LinkResult | null = null
  if (usable.length > 0) {
    const composed = composeChatsText(
      usable.map((item) => ({
        chat_url: item.url,
        platform: 'gemini',
        is_gem: item.is_gem,
        extraction_error: null,
        extracted_text: item.text,
      })),
    )
    try {
      const result = await evaluateWithGemini(composed.text, composed.messageCounts)
      overall = {
        url: `${usable.length} chats combined`,
        ok: true,
        score: result.score,
        flagged: result.score <= FLAG_THRESHOLD,
        profile: result.breakdown.profile,
        breakdown: result.breakdown,
      }
    } catch (err) {
      overall = { url: `${usable.length} chats combined`, ok: false, error: describeError(err) }
    }
  }

  return jsonResponse({ results, overall })
})
