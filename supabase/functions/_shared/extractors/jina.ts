// Shared Jina Reader fetch with token optimizations
// Reduces token usage by:
// 1. Stripping images (X-Retain-Images: false)
// 2. Removing navigation, buttons, toolbars
// 3. Targeting only relevant content
// 4. Not using readerlm-v2 (costs 3x tokens)

const JINA_READER_URL = 'https://r.jina.ai'

export interface JinaOptions {
  targetSelector?: string
  removeSelector?: string
  waitForSelector?: string
  cookies?: string
  noCache?: boolean
}

/**
 * Optimized Jina Reader fetch.
 * Minimizes token usage while extracting chat content.
 */
export async function jinaFetch(
  chatUrl: string,
  options: JinaOptions = {},
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Engine': 'browser',
    'X-Return-Format': 'markdown',
    // OPTIMIZATION: Strip all images (saves ~30-50% tokens)
    'X-Retain-Images': 'false',
    // OPTIMIZATION: Don't create links or images summary sections
    'X-With-Links-Summary': 'none',
    'X-With-Images-Summary': 'none',
  }

  // Add target selector to extract only user content
  if (options.targetSelector) {
    headers['X-Target-Selector'] = options.targetSelector
  }

  // Add remove selector to strip navigation, buttons, etc.
  if (options.removeSelector) {
    headers['X-Remove-Selector'] = options.removeSelector
  } else {
    headers['X-Remove-Selector'] = 'nav, footer, aside, header, button, [role="toolbar"], [role="navigation"], [data-testid="sidebar"]'
  }

  // Wait for dynamic content if needed
  if (options.waitForSelector) {
    headers['X-Wait-Selector'] = options.waitForSelector
  }

  // Forward cookies for authenticated pages
  if (options.cookies) {
    headers['X-Set-Cookie'] = options.cookies
  }

  // Bypass cache if needed
  if (options.noCache) {
    headers['X-No-Cache'] = 'true'
  }

  const response = await fetch(`${JINA_READER_URL}/${chatUrl}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Jina Reader failed (status ${response.status})`)
  }

  return await response.text()
}

/**
 * Clean Jina output by removing boilerplate lines.
 */
export function cleanJinaOutput(text: string): string {
  const BOILERPLATE_RE = /^(?:Title:|URL Source:|Markdown Content:|Copy public link|Copy response|Share|Warning:.*loaded|Return to|Report conversation)/i
  
  return text
    .split('\n')
    .filter((line) => !BOILERPLATE_RE.test(line.trim()))
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '[image]')
    .trim()
}

/**
 * Split text into user messages using turn markers.
 */
export function splitByTurnMarkers(
  text: string,
  userPattern: RegExp,
  assistantPattern?: RegExp,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const lines = text.split('\n')
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  
  let currentRole: 'user' | 'assistant' | null = null
  let currentContent: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    const isUser = userPattern.test(trimmed)
    const isAssistant = assistantPattern?.test(trimmed) ?? false
    
    if (isUser || isAssistant) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        const content = currentContent.join('\n').trim()
        if (content.length > 0) {
          messages.push({ role: currentRole, content })
        }
      }
      
      currentRole = isUser ? 'user' : 'assistant'
      currentContent = []
      
      // Capture content after marker on same line
      const markerRe = /^(?:\*\*)?(?:.*?)(?::?\*\*)?\s*:?\s*(.*)/i
      const match = trimmed.match(markerRe)
      if (match && match[1].trim()) {
        currentContent.push(match[1].trim())
      }
      continue
    }
    
    if (currentRole) {
      currentContent.push(line)
    }
  }
  
  // Don't forget last message
  if (currentRole && currentContent.length > 0) {
    const content = currentContent.join('\n').trim()
    if (content.length > 0) {
      messages.push({ role: currentRole, content })
    }
  }
  
  return messages
}

/**
 * Format only user messages for evaluation.
 */
export function formatForEvaluation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): string {
  return messages
    .filter((m) => m.role === 'user')
    .map((msg, i) => `[Message ${i + 1}] ${msg.content}`)
    .join('\n\n')
}
