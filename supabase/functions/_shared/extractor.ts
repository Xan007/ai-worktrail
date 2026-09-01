import { JINA_READER_URL } from './constants.ts'
import { sleep } from './http.ts'
import type { Platform } from './types.ts'

const DEAD_SHARE_RE = /(Link doesn't exist|might have been deleted|Something went wrong \(\d+\))/i

const SYSTEM_NOISE_RE =
  /^(Title:|URL Source:|Markdown Content:|Images:|Links\/Buttons:|Warning:|This page does not seem to contain|Responses below were generated|Las respuestas que aparecen a continuación|Google apps|Sign in\s*$|Report\s+http|Copy public link|Gemini may display inaccurate|Show code|Show thinking|Show more|(Mostrar|Ver) c(ó|o)digo|\[(About Gemini|FAQ|Google Privacy Policy|Google Terms of Service|Sign in|https?:))/i

export function extractChatGPTFromHtml(html: string): string[] | null {
  const match = html.match(/streamController\.enqueue\(("[\s\S]*?")\);/)
  if (!match) return null

  try {
    const arr = JSON.parse(JSON.parse(match[1]))
    const userIdx = arr.indexOf('user')
    if (userIdx === -1) return null

    const userPrompts: Array<{ text: string; time: number }> = []

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        let isUserAuthor = false
        for (const val of Object.values(item)) {
          if (val === userIdx) isUserAuthor = true
        }

        if (isUserAuthor) {
          for (let j = 0; j < arr.length; j++) {
            const msg = arr[j]
            if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
              let matchesAuthor = false
              for (const mVal of Object.values(msg)) {
                if (mVal === i) matchesAuthor = true
              }

              if (matchesAuthor) {
                let time = 0
                for (const mVal of Object.values(msg)) {
                  if (typeof mVal === 'number' && mVal > 1000000000 && mVal < 3000000000) {
                    time = mVal
                  }
                }

                for (const mVal of Object.values(msg)) {
                  if (typeof mVal === 'number' && arr[mVal] && typeof arr[mVal] === 'object' && !Array.isArray(arr[mVal])) {
                    const contentObj = arr[mVal]
                    for (const cVal of Object.values(contentObj)) {
                      if (typeof cVal === 'number' && Array.isArray(arr[cVal])) {
                        const partsArr = arr[cVal]
                        for (const partIdx of partsArr) {
                          const str = typeof partIdx === 'number' ? arr[partIdx] : partIdx
                          if (
                            typeof str === 'string' &&
                            str.trim().length > 0 &&
                            str !== 'user' &&
                            str !== 'text' &&
                            str !== 'reason'
                          ) {
                            userPrompts.push({ text: str.trim(), time })
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    userPrompts.sort((a, b) => a.time - b.time)
    const seen = new Set<string>()
    const cleanPrompts: string[] = []
    for (const p of userPrompts) {
      if (!seen.has(p.text)) {
        seen.add(p.text)
        cleanPrompts.push(p.text)
      }
    }

    return cleanPrompts.length > 0 ? cleanPrompts : null
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
      'X-Retain-Images': 'none',
      'X-Retain-Links': 'none',
      'X-With-Links-Summary': 'false',
      'X-With-Images-Summary': 'false',
      'X-Respond-Timing': 'network-idle',
      ...extraHeaders,
    },
  })
  if (response.status === 429) {
    throw new Error('Jina Reader rate limit (429)')
  }
  if (!response.ok) {
    throw new Error(`No se pudo leer el enlace (error del lector: status ${response.status})`)
  }
  return await response.text()
}

export function detectPlatformFromUrl(url: string): Platform {
  const lower = url.toLowerCase()
  if (lower.includes('gemini.google.com') || lower.includes('share.gemini.google')) return 'gemini'
  if (lower.includes('chatgpt.com') || lower.includes('chat.openai.com')) return 'chatgpt'
  if (lower.includes('claude.ai')) return 'claude'
  return 'other'
}

export function getPlatformSelector(platform: Platform): string {
  switch (platform) {
    case 'chatgpt':
      return '[data-message-author-role="user"]'
    case 'claude':
      return '[data-testid="user-message"]'
    case 'gemini':
      return 'user-query'
    default:
      return ''
  }
}

function cleanTurnText(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (SYSTEM_NOISE_RE.test(trimmed)) return false
      if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) return false
      if (/^-\s*!\[[^\]]*\]/i.test(trimmed)) return false
      if (/^-\s*\[Learn more/i.test(trimmed)) return false
      return true
    })
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .trim()
}

export function splitIntoMessages(rawText: string, platformHint?: string): string[] {
  const isGemini = platformHint === 'gemini' || /#{1,6}\s*(?:You said|Has dicho)\b/i.test(rawText)

  if (isGemini) {
    const lines = rawText.split('\n')
    const turns: string[] = []
    let currentLines: string[] = []
    let inTurn = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (/^#{1,6}\s*(?:You said|Has dicho)\b/i.test(trimmed)) {
        if (inTurn && currentLines.length > 0) {
          const cleaned = cleanTurnText(currentLines.join('\n'))
          if (cleaned) turns.push(cleaned)
        }
        inTurn = true
        currentLines = []
        continue
      }
      if (inTurn) {
        currentLines.push(line)
      }
    }
    if (inTurn && currentLines.length > 0) {
      const cleaned = cleanTurnText(currentLines.join('\n'))
      if (cleaned) turns.push(cleaned)
    }
    if (turns.length > 0) return turns
  }

  const lines = rawText.split('\n')
  const filtered = lines.filter((line) => {
    const trimmed = line.trim()
    if (!trimmed) return true
    if (SYSTEM_NOISE_RE.test(trimmed)) return false
    if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) return false
    if (/^-\s*!\[[^\]]*\]/i.test(trimmed)) return false
    if (/^-\s*\[Learn more/i.test(trimmed)) return false
    return true
  })

  const blocks = filtered
    .join('\n')
    .trim()
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !SYSTEM_NOISE_RE.test(b))

  return blocks
}

export function isUsableExtraction(rawText: string, platformHint?: string): boolean {
  const totalChars = splitIntoMessages(rawText, platformHint).reduce((acc, message) => acc + message.length, 0)
  return totalChars >= 5
}

export async function fetchChatText(chatUrl: string): Promise<string> {
  const platform = detectPlatformFromUrl(chatUrl)

  if (platform === 'chatgpt') {
    try {
      const directRes = await fetch(chatUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
      })
      if (directRes.ok) {
        const html = await directRes.text()
        const extracted = extractChatGPTFromHtml(html)
        if (extracted && extracted.length > 0) {
          return extracted.join('\n\n')
        }
      }
    } catch {
      /* fallback */
    }
  }

  const targetSelector = getPlatformSelector(platform)

  const strategies: Array<Record<string, string>> = [
    ...(targetSelector
      ? [
          {
            'X-Target-Selector': targetSelector,
            'X-Wait-For-Selector': targetSelector,
            'X-Timeout': '30',
            'X-No-Cache': 'true',
          },
        ]
      : []),
    { 'X-No-Cache': 'true', 'X-Timeout': '30' },
  ]

  let lastText = ''
  let lastError: unknown = null

  for (let i = 0; i < strategies.length; i++) {
    if (i > 0) await sleep(2000)
    let text: string
    try {
      text = await jinaFetch(chatUrl, {
        'X-Remove-Selector': 'nav, footer, aside, header, button, [role="toolbar"], [role="navigation"], [data-testid="sidebar"]',
        ...strategies[i],
      })
    } catch (err) {
      lastError = err
      const msg = describeError(err)
      if (msg.includes('429')) {
        await sleep(3000)
      }
      continue
    }
    lastText = text
    if (DEAD_SHARE_RE.test(text)) {
      throw new Error(
        'Este enlace no se puede leer sin iniciar sesión (cuenta institucional). Comparte desde una cuenta personal como "Cualquiera con el enlace".',
      )
    }
    if (isUsableExtraction(text, platform)) return text
  }

  if (lastText) return lastText
  throw lastError ?? new Error('El lector devolvió una respuesta vacía.')
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
