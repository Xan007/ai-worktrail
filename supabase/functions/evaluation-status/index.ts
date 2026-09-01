declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import {
  corsHeaders,
  decodeJwtPayload,
  jsonResponse,
} from '../_shared/evaluation-core.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing configuration' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Sesión no proporcionada.' }, 401)

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const callerId = decodeJwtPayload(token)?.sub
  if (!callerId) return jsonResponse({ error: 'Invalid or expired session' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const submissionId = url.searchParams.get('submission_id')

  if (!submissionId) {
    return jsonResponse({ error: 'submission_id parameter required' }, 400)
  }

  // Get queue job status
  const { data: job } = await adminClient
    .from('evaluation_queue')
    .select('id, status, attempts, last_error, created_at, started_at, completed_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get analysis if completed
  let analysis = null
  if (job?.status === 'completed') {
    const { data } = await adminClient
      .from('analysis')
      .select('id, score, flagged, justification, evaluated_at')
      .eq('submission_id', submissionId)
      .maybeSingle()
    analysis = data
  }

  return jsonResponse({ job: job ?? null, analysis })
})
