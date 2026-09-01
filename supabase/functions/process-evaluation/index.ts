declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders, jsonResponse } from '../_shared/evaluation-core.ts'
import { extractChat } from '../_shared/extractors/index.ts'

const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN')

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  
  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    return jsonResponse({ error: 'Missing configuration' }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Get next pending job
  const { data: job, error: jobError } = await adminClient
    .from('evaluation_queue')
    .select('id, submission_id')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (jobError || !job) {
    return jsonResponse({ message: 'No pending jobs' })
  }

  const submissionId = job.submission_id

  try {
    // Mark as extracting
    await adminClient
      .from('evaluation_queue')
      .update({ 
        status: 'extracting', 
        started_at: new Date().toISOString(),
        worker_id: 'edge-function',
      })
      .eq('id', job.id)

    // Fetch submission chats
    const { data: chats, error: chatsError } = await adminClient
      .from('submission_chats')
      .select('id, chat_url, platform')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })

    if (chatsError || !chats || chats.length === 0) {
      throw new Error('No chats to evaluate')
    }

    // Extract chat content using platform-specific extractors
    const extractedChats = await Promise.all(
      chats.map(async (chat) => {
        const result = await extractChat(
          chat.chat_url, 
          chat.platform as 'gemini' | 'chatgpt' | 'claude' | 'other', 
          APIFY_TOKEN
        )
        
        // Update chat with extraction results
        await adminClient
          .from('submission_chats')
          .update({
            extracted_text: result.error ? null : result.text,
            extraction_error: result.error,
          })
          .eq('id', chat.id)
        
        return {
          ...chat,
          extracted_text: result.text,
          extraction_error: result.error,
          extraction_method: result.method,
        }
      }),
    )

    // Check if any chats were successfully extracted
    const successfulChats = extractedChats.filter((c) => !c.extraction_error && c.extracted_text)
    if (successfulChats.length === 0) {
      throw new Error('None of the submitted chats could be read')
    }

    // Mark as evaluating
    await adminClient
      .from('evaluation_queue')
      .update({ status: 'evaluating' })
      .eq('id', job.id)

    // Compose and evaluate
    const composedText = composeChatsText(extractedChats)
    const result = await evaluateWithGemini(composedText, geminiApiKey)

    // Store analysis
    await adminClient.from('analysis').delete().eq('submission_id', submissionId)
    
    const { error: insertError } = await adminClient
      .from('analysis')
      .insert({
        submission_id: submissionId,
        score: result.score,
        flagged: result.score <= 30,
        justification: result.breakdown.summary,
        breakdown: result.breakdown,
        extraction_method: extractedChats[0]?.extraction_method,
      })

    if (insertError) throw new Error(`Failed to store analysis: ${insertError.message}`)

    // Mark as completed
    await adminClient
      .from('evaluation_queue')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    return jsonResponse({ 
      success: true, 
      submission_id: submissionId,
      score: result.score,
    })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Processor] Failed submission ${submissionId}:`, errorMsg)

    // Mark as failed
    await adminClient
      .from('evaluation_queue')
      .update({ 
        status: 'failed',
        last_error: errorMsg,
        attempts: { increment: 1 },
      })
      .eq('id', job.id)

    return jsonResponse({ error: errorMsg }, 500)
  }
})

// ============ COMPOSITION ============

function composeChatsText(
  chats: Array<{ chat_url: string; platform: string; extracted_text: string; extraction_error: string | null }>,
): string {
  const parts: string[] = []
  
  chats.forEach((chat, idx) => {
    const n = idx + 1
    parts.push(`--- Chat ${n} (${chat.platform}) ---`)
    parts.push(`URL: ${chat.chat_url}`)
    
    if (chat.extraction_error || !chat.extracted_text) {
      parts.push(`ERROR: ${chat.extraction_error ?? 'empty extraction'}`)
      return
    }
    
    // The extracted_text is already formatted with [Message N] markers
    // from the platform-specific extractors
    parts.push(chat.extracted_text)
  })
  
  return parts.join('\n\n')
}

// ============ EVALUATION ============

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const CRITERIA = [
  { key: 'ownership', weight: 30 },
  { key: 'critical_engagement', weight: 25 },
  { key: 'ai_as_tutor', weight: 20 },
  { key: 'integration_originality', weight: 15 },
  { key: 'process_awareness', weight: 10 },
]

const EVALUATION_PROMPT = `You are evaluating how a student used AI assistants on an academic assignment, based EXCLUSIVELY on the messages the student typed.

Rate the student's AI usage on five criteria, each an integer from 0 to 100.

Rules:
- Write ALL human-readable text in the SAME LANGUAGE as the student's chat transcripts.
- Each criterion MUST include evidence: short verbatim quotes identified by "chat" and "message".
- Message COUNT carries no inherent weight. Rate the QUALITY of behavior.

Respond strictly as JSON:
{
  "profile": "<productive_passenger | reluctant_optimizer | mental_marathoner>",
  "criteria": [
    {
      "key": "<ownership | critical_engagement | ai_as_tutor | integration_originality | process_awareness>",
      "rating": <integer 0-100>,
      "explanation": "<why this rating>",
      "evidence": [{ "chat": <int>, "message": <int>, "quote": "<verbatim>" }]
    }
  ],
  "strengths": ["<...>"],
  "improvements": ["<...>"],
  "summary": "<1-2 sentence summary>"
}

CHATS:
"""
{{CHATS_TEXT}}
"""`

async function evaluateWithGemini(
  composedText: string,
  apiKey: string,
): Promise<{ score: number; breakdown: any }> {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
  
  for (const model of models) {
    try {
      const endpoint = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: EVALUATION_PROMPT.replace('{{CHATS_TEXT}}', composedText) }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      })

      if (!response.ok) continue

      const data = await response.json()
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!raw) continue

      const parsed = JSON.parse(raw)
      const score = calculateScore(parsed.criteria)
      
      return { score, breakdown: parsed }
    } catch {
      continue
    }
  }
  
  throw new Error('All Gemini models failed')
}

function calculateScore(criteria: any[]): number {
  const totalWeight = CRITERIA.reduce((acc, c) => acc + c.weight, 0)
  const weightedSum = CRITERIA.reduce((acc, c) => {
    const found = criteria.find((cr: any) => cr.key === c.key)
    return acc + c.weight * (found?.rating ?? 0)
  }, 0)
  return Math.round(weightedSum / totalWeight)
}
