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
  if (!callerId) return jsonResponse({ error: 'Invalid or expired session' }, 401)

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

  // Verify submission exists and user has access
  const { data: submission, error: submissionError } = await adminClient
    .from('submissions')
    .select('id, task_id, student_id')
    .eq('id', payload.submission_id)
    .single()

  if (submissionError || !submission) {
    return jsonResponse({ error: 'Submission not found' }, 404)
  }

  // Check authorization
  const { data: task } = await adminClient
    .from('tasks')
    .select('course_id')
    .eq('id', submission.task_id)
    .single()

  if (!task) {
    return jsonResponse({ error: 'Task not found' }, 404)
  }

  const { data: course } = await adminClient
    .from('courses')
    .select('teacher_id')
    .eq('id', task.course_id)
    .single()

  if (!course) {
    return jsonResponse({ error: 'Course not found' }, 404)
  }

  const { data: callerProfile } = await adminClient
    .from('users').select('role').eq('id', callerId).maybeSingle()
  
  const isTeacher = course.teacher_id === callerId || callerProfile?.role === 'teacher'
  const isOwnerStudent = submission.student_id === callerId

  if (!isTeacher && !isOwnerStudent) {
    return jsonResponse({ error: 'No tienes acceso para evaluar esta entrega.' }, 403)
  }

  // Check if there's already a pending/processing job
  const { data: existingJob } = await adminClient
    .from('evaluation_queue')
    .select('id, status')
    .eq('submission_id', payload.submission_id)
    .in('status', ['pending', 'extracting', 'evaluating'])
    .maybeSingle()

  if (existingJob) {
    return jsonResponse({ 
      message: 'Ya hay una evaluación en progreso',
      job_id: existingJob.id,
      status: existingJob.status,
    })
  }

  // Enqueue the evaluation job
  const { data: job, error: jobError } = await adminClient
    .from('evaluation_queue')
    .insert({
      submission_id: payload.submission_id,
      priority: isTeacher ? 1 : 0,
    })
    .select('id')
    .single()

  if (jobError) {
    return jsonResponse({ error: `Failed to enqueue evaluation: ${jobError.message}` }, 500)
  }

  return jsonResponse({
    message: 'Evaluación encolada exitosamente',
    job_id: job.id,
    submission_id: payload.submission_id,
  })
})
