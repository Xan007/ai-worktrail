// ChatGPT extractor - optimized for minimal token usage
import { jinaFetch, cleanJinaOutput, splitByTurnMarkers, formatForEvaluation } from './jina.ts'

// Turn markers for ChatGPT conversations
const USER_MARKER = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:You said|Tú dijiste|User)(?::?\*\*)?/i
const ASSISTANT_MARKER = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:ChatGPT(?:\s*(?:said|Plus|Free))?|Assistant)(?::?\*\*)?/i

/**
 * Extract ChatGPT messages from shared link.
 * Only returns user messages for evaluation.
 */
export async function extractChatGPT(chatUrl: string): Promise<string> {
  // Strategy 1: Target conversation transcript only
  try {
    const text = await jinaFetch(chatUrl, {
      targetSelector: 'ol[aria-label="Conversación"], [data-conversation-transcript]',
      removeSelector: 'nav, footer, header, aside, button, [role="toolbar"]',
    })
    
    const messages = splitByTurnMarkers(text, USER_MARKER, ASSISTANT_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
  } catch { /* continue */ }

  // Strategy 2: Wait for dynamic content
  try {
    const text = await jinaFetch(chatUrl, {
      waitForSelector: '[data-message-role], ._wdUoQG_messageTurn',
      removeSelector: 'nav, footer, header, aside, button',
    })
    
    const messages = splitByTurnMarkers(text, USER_MARKER, ASSISTANT_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
  } catch { /* continue */ }

  // Strategy 3: Minimal - just strip noise
  try {
    const text = await jinaFetch(chatUrl)
    const cleaned = cleanJinaOutput(text)
    const messages = splitByTurnMarkers(cleaned, USER_MARKER, ASSISTANT_MARKER)
    if (messages.length > 0) return formatForEvaluation(messages)
    if (cleaned.length > 200) return cleaned
  } catch { /* continue */ }

  throw new Error('No se pudo extraer el contenido del chat')
}
