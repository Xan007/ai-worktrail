// Unified extractor interface - optimized for minimal token usage
import { extractGemini } from './gemini.ts'
import { extractChatGPT } from './chatgpt.ts'
import { extractClaude } from './claude.ts'
import { jinaFetch, cleanJinaOutput } from './jina.ts'

export type Platform = 'gemini' | 'chatgpt' | 'claude' | 'other'

interface ExtractionResult {
  text: string
  method: string
  error: string | null
}

/**
 * Extract chat content based on platform.
 * Uses platform-specific parsers for structured extraction.
 */
export async function extractChat(
  chatUrl: string,
  platform: Platform,
  apifyToken?: string,
  cookies?: string,
): Promise<ExtractionResult> {
  try {
    let text: string
    
    switch (platform) {
      case 'chatgpt':
        text = await extractChatGPT(chatUrl)
        break
      case 'claude':
        text = await extractClaude(chatUrl, cookies)
        break
      case 'gemini':
        text = await extractGemini(chatUrl)
        break
      default:
        text = await extractGeneric(chatUrl)
        break
    }
    
    return { text, method: 'jina', error: null }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    // If it's institutional Gemini and we have Apify token, try Apify
    if (platform === 'gemini' && isGeminiUrl(chatUrl) && apifyToken) {
      try {
        const text = await extractWithApify(chatUrl, apifyToken)
        return { text, method: 'apify', error: null }
      } catch (apifyError) {
        const apifyMsg = apifyError instanceof Error ? apifyError.message : String(apifyError)
        return { text: '', method: 'apify', error: `Apify failed: ${apifyMsg}` }
      }
    }
    
    return { text: '', method: 'jina', error: errorMsg }
  }
}

/**
 * Generic extractor - minimal token usage.
 */
async function extractGeneric(chatUrl: string): Promise<string> {
  try {
    const text = await jinaFetch(chatUrl)
    const cleaned = cleanJinaOutput(text)
    if (cleaned.length > 200) return cleaned
  } catch { /* continue */ }
  
  throw new Error('No se pudo extraer el contenido')
}

function isGeminiUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('gemini.google.com') || 
           parsed.hostname.includes('share.gemini.google')
  } catch {
    return false
  }
}

async function extractWithApify(chatUrl: string, token: string): Promise<string> {
  const actorId = 'apify/web-scraper'
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`
  
  const response = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startUrls: [{ url: chatUrl }],
      pageFunction: `async function pageFunction(context) {
        const { jQuery } = context;
        const messages = [];
        jQuery('[data-message-id], .model-response-text, .user-query').each((i, el) => {
          const text = jQuery(el).text().trim();
          if (text && text.length > 10) messages.push(text);
        });
        return messages.join('\\n\\n');
      }`,
      proxyConfiguration: { useApifyProxy: true },
    }),
  })

  if (!response.ok) throw new Error(`Apify run failed: ${response.status}`)

  const run = await response.json()
  const runId = run.data?.id

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    )
    const status = await statusResponse.json()
    
    if (status.data?.status === 'SUCCEEDED') {
      const datasetId = status.data?.defaultDatasetId
      const resultsResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`
      )
      const results = await resultsResponse.json()
      return results.map((r: any) => r.pageFunctionResult).join('\n\n')
    }
    
    if (status.data?.status === 'FAILED') {
      throw new Error('Apify actor failed')
    }
  }

  throw new Error('Apify run timed out')
}

// Re-export for direct use
export { extractGemini } from './gemini.ts'
export { extractChatGPT } from './chatgpt.ts'
export { extractClaude } from './claude.ts'
export { jinaFetch, cleanJinaOutput } from './jina.ts'
