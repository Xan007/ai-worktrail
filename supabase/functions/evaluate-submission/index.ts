declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import {
  corsHeaders,
  composeChatsText,
  decodeJwtPayload,
  detectGem,
  describeError,
  evaluateWithGemini,
  fetchChatText,
  FLAG_THRESHOLD,
  jsonResponse,
  normalizeGemUrl,
  type ApprovedGem,
  type EvaluationBreakdown,
  type Platform,
  type SubmissionChat,
} from '../_shared/evaluation-core.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Falta la configuración interna del servidor.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Sesión no proporcionada.' }, 401)

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const callerId = decodeJwtPayload(token)?.sub
  if (!callerId) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  let payload: { submission_id?: string }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Cuerpo de la solicitud inválido.' }, 400)
  }

  if (!payload.submission_id) {
    return jsonResponse({ error: 'Se requiere el identificador de la entrega.' }, 400)
  }

  const { data: submission, error: submissionError } = await adminClient
    .from('submissions')
    .select('id, task_id, student_id, group_id')
    .eq('id', payload.submission_id)
    .single()

  if (submissionError || !submission) {
    return jsonResponse({ error: `Submission not found: ${describeError(submissionError)}` }, 404)
  }

  const { data: task, error: taskError } = await adminClient
    .from('tasks')
    .select('id, course_id, is_group_task, group_grading_mode')
    .eq('id', submission.task_id)
    .single()

  if (taskError || !task) {
    return jsonResponse({ error: `Task not found: ${describeError(taskError)}` }, 404)
  }

  const { data: course, error: courseError } = await adminClient
    .from('courses')
    .select('id, teacher_id')
    .eq('id', task.course_id)
    .single()

  if (courseError || !course) {
    return jsonResponse({ error: `Course not found: ${describeError(courseError)}` }, 404)
  }

  const { data: callerProfile } = await adminClient
    .from('users').select('role').eq('id', callerId)
    .maybeSingle();
  const isStaff = callerProfile?.role === 'teacher' || callerProfile?.role === 'monitor';
  const isTeacher = course.teacher_id === callerId || isStaff;
  const isOwnerStudent = submission.student_id === callerId
  const isGroupMember = await (async () => {
    if (!submission.group_id) return false
    const { data } = await adminClient
      .from('groups')
      .select('members')
      .eq('id', submission.group_id)
      .single()
    return data?.members?.includes(callerId) ?? false
  })()

  if (!isTeacher && !isOwnerStudent && !isGroupMember) {
    return jsonResponse({ error: 'No tienes acceso para evaluar esta entrega.' }, 403)
  }

  const { data: chats, error: chatsError } = await adminClient
    .from('submission_chats')
    .select('id, submission_id, student_id, chat_url, platform, is_gem, approved_gem_id, gem_instructions_pasted')
    .eq('submission_id', payload.submission_id)
    .order('created_at', { ascending: true })

  if (chatsError) {
    return jsonResponse({ error: `Failed to load chats: ${describeError(chatsError)}` }, 500)
  }
  if (!chats || chats.length === 0) {
    return jsonResponse({ error: 'Submission has no chats to evaluate' }, 400)
  }

  const { data: approvedGems } = await adminClient
    .from('approved_gems')
    .select('id, course_id, name, gem_url')
    .eq('course_id', course.id)

  const approvedByUrl = new Map<string, ApprovedGem>()
  for (const gem of approvedGems ?? []) {
    approvedByUrl.set(normalizeGemUrl(gem.gem_url), gem)
  }

  const enrichedChats: Array<SubmissionChat & { extracted_text: string; extraction_error: string | null }> = await Promise.all(
    (chats as SubmissionChat[]).map(async (chat) => {
      let text = ''
      let error: string | null = null
      try {
        text = await fetchChatText(chat.chat_url)
      } catch (err) {
        error = describeError(err)
      }
      const isGem = detectGem(chat.chat_url, text)
      const matchedApproved = isGem ? approvedByUrl.get(normalizeGemUrl(chat.chat_url)) ?? null : null

      const update: Record<string, unknown> = {
        is_gem: isGem,
        extracted_text: error ? null : text,
        extraction_error: error,
      }
      if (matchedApproved) update.approved_gem_id = matchedApproved.id
      else if (isGem) update.approved_gem_id = null

      await adminClient.from('submission_chats').update(update).eq('id', chat.id)

      return { ...chat, is_gem: isGem, approved_gem_id: matchedApproved?.id ?? null, extracted_text: text, extraction_error: error }
    }),
  )

  if (enrichedChats.every((c) => c.extraction_error || !c.extracted_text)) {
    return jsonResponse(
      { error: 'None of the submitted chats could be read. Check each share link is public ("Anyone with the link") and still exists.' },
      422,
    )
  }

  type Bucket = { student_id: string | null; label: string; chats: typeof enrichedChats }
  const buckets = new Map<string, Bucket>()

  if (task.is_group_task && task.group_grading_mode === 'individual') {
    for (const chat of enrichedChats) {
      const key = chat.student_id
      if (!buckets.has(key)) {
        buckets.set(key, { student_id: chat.student_id, label: chat.student_id, chats: [] })
      }
      buckets.get(key)!.chats.push(chat)
    }
  } else {
    const sharedKey = task.is_group_task ? 'shared' : (enrichedChats[0]?.student_id ?? 'shared')
    buckets.set(sharedKey, { student_id: task.is_group_task ? null : (enrichedChats[0]?.student_id ?? null), label: sharedKey, chats: enrichedChats })
  }

  const analyses: Array<{
    submission_id: string
    student_id: string | null
    score: number
    justification: string
    flagged: boolean
    breakdown: EvaluationBreakdown
  }> = []

  const bucketList = Array.from(buckets.values())
  let evaluated: typeof analyses
  try {
    evaluated = await Promise.all(
      bucketList.map(async (bucket) => {
        const composed = composeChatsText(bucket.chats)
        const result = await evaluateWithGemini(composed.text, composed.messageCounts)
        return {
          submission_id: payload.submission_id,
          student_id: bucket.student_id,
          score: result.score,
          justification: result.breakdown.summary,
          flagged: result.score <= FLAG_THRESHOLD,
          breakdown: result.breakdown,
        }
      }),
    )
  } catch (err) {
    return jsonResponse({ error: `Gemini evaluation failed: ${describeError(err)}` }, 502)
  }
  analyses.push(...evaluated)

  await adminClient.from('analysis').delete().eq('submission_id', payload.submission_id)
  const { error: insertError } = await adminClient.from('analysis').insert(analyses)
  if (insertError) {
    return jsonResponse({ error: `Failed to persist analysis: ${describeError(insertError)}` }, 500)
  }

  return jsonResponse({
    submission_id: payload.submission_id,
    chats: enrichedChats.map((c) => ({ id: c.id, is_gem: c.is_gem, approved_gem_id: c.approved_gem_id, extraction_error: c.extraction_error })),
    analyses,
  })
})

export type { Platform }
