// Gemini extractor - optimized for minimal token usage
import { jinaFetch, cleanJinaOutput, splitByTurnMarkers, formatForEvaluation } from './jina.ts'

const DEAD_SHARE_RE = /(Link doesn't exist|might have been deleted|Something went wrong|no se puede leer sin iniciar sesión)/i

// Turn markers for Gemini conversations
const USER_MARKER = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:You said|Has dicho)(?::?\*\*)?/i

/**
 * Extract Gemini messages from shared link.
 * Only returns user messages for evaluation.
 */
export async function extractGemini(chatUrl: string): Promise<string> {
  // Strategy 1: Target user queries only
  try {
    const text = await jinaFetch(chatUrl, {
      targetSelector: 'user-query, [data-test-id="created-with-gem"]',
      removeSelector: 'nav, aside, footer, [data-test-id="sidebar"], button, [role="toolbar"]',
    })
    
    if (DEAD_SHARE_RE.test(text)) throw new Error('Enlace institucional detectado')
    
    const messages = splitByTurnMarkers(text, USER_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
  } catch (err) {
    if (err instanceof Error && err.message.includes('institucional')) throw err
  }

  // Strategy 2: Wait for dynamic content
  try {
    const text = await jinaFetch(chatUrl, {
      waitForSelector: 'user-query, .model-response-text',
      removeSelector: 'nav, aside, footer, button',
    })
    
    if (DEAD_SHARE_RE.test(text)) throw new Error('Enlace institucional detectado')
    
    const messages = splitByTurnMarkers(text, USER_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
  } catch (err) {
    if (err instanceof Error && err.message.includes('institucional')) throw err
  }

  // Strategy 3: Minimal
  try {
    const text = await jinaFetch(chatUrl)
    const cleaned = cleanJinaOutput(text)
    
    if (DEAD_SHARE_RE.test(cleaned)) throw new Error('Enlace institucional detectado')
    
    const messages = splitByTurnMarkers(cleaned, USER_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
    if (cleaned.length > 200) return cleaned
  } catch (err) {
    if (err instanceof Error && err.message.includes('institucional')) throw err
  }

  throw new Error('No se pudo extraer el contenido del chat')
}
