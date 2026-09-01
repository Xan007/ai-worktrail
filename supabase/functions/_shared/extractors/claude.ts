// Claude extractor - optimized for minimal token usage
import { jinaFetch, cleanJinaOutput, splitByTurnMarkers, formatForEvaluation } from './jina.ts'

// Turn markers for Claude conversations
const USER_MARKER = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:You said|Has dicho|Tú dijiste|Human)(?::?\*\*)?/i
const ASSISTANT_MARKER = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:Claude responded|Claude ha respondido|Assistant)(?::?\*\*)?/i

/**
 * Extract Claude messages from shared link.
 * Only returns user messages for evaluation.
 */
export async function extractClaude(chatUrl: string, cookies?: string): Promise<string> {
  // Strategy 1: Target transcript list only
  try {
    const text = await jinaFetch(chatUrl, {
      targetSelector: '[data-testid="transcript-list"], [data-testid="message-container"]',
      removeSelector: 'nav, aside, footer, [data-testid="sidebar"], button, [role="toolbar"], [data-cds="MessageActions"]',
      cookies,
    })
    
    const messages = splitByTurnMarkers(text, USER_MARKER, ASSISTANT_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
  } catch { /* continue */ }

  // Strategy 2: Wait for dynamic content
  try {
    const text = await jinaFetch(chatUrl, {
      waitForSelector: '[data-testid="user-message"], [data-testid="tool-status-pill"]',
      removeSelector: 'nav, aside, footer, button, [role="toolbar"]',
      cookies,
    })
    
    const messages = splitByTurnMarkers(text, USER_MARKER, ASSISTANT_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
  } catch { /* continue */ }

  // Strategy 3: Minimal
  try {
    const text = await jinaFetch(chatUrl, { cookies })
    const cleaned = cleanJinaOutput(text)
    const messages = splitByTurnMarkers(cleaned, USER_MARKER, ASSISTANT_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
    if (cleaned.length > 200) return cleaned
  } catch { /* continue */ }

  throw new Error('No se pudo extraer el contenido del chat')
}
