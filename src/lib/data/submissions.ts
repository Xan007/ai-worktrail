import type { SupabaseClient } from '@supabase/supabase-js';
import type { Analysis, Task } from '@/lib/mockdata';
import {
  invalidateSubmissionDetailCache,
  invalidateTaskBundleCache,
  readStoredBundle,
  readStoredDetail,
  writeStoredBundle,
  writeStoredDetail,
} from './cache';
import { mapAnalysis, mapChat, mapCourse } from './mappers';
import type { ChatView, SubmissionDetail, SubmissionView, TaskBundle } from './types';

type Client = SupabaseClient;

const inflightDetails = new Map<string, Promise<SubmissionDetail | null>>();
const inflightBundles = new Map<string, Promise<TaskBundle | null>>();

export async function getSubmissionDetail(client: Client, submissionId: string): Promise<SubmissionDetail | null> {
  const cached = readStoredDetail(submissionId);
  if (cached !== undefined) return cached;

  const existing = inflightDetails.get(submissionId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data: subRows, error: subErr } = await client
        .from('submissions')
        .select('id, task_id, student_id, version, submitted_at')
        .eq('id', submissionId)
        .limit(1);
      if (subErr) throw new Error(subErr.message);
      if (!subRows || subRows.length === 0) {
        writeStoredDetail(submissionId, null);
        return null;
      }
      const sub = subRows[0] as Record<string, unknown>;
      const studentId = String(sub.student_id);
      const taskId = String(sub.task_id);

      const [taskRes, userRes, chatRes, analysisRes] = await Promise.all([
        client
          .from('tasks')
          .select(`
            id, name, is_group_task, due_date, course_id,
            course:courses!inner(id, name, teacher_id)
          `)
          .eq('id', taskId)
          .maybeSingle(),
        client.from('users').select('id, name').eq('id', studentId).maybeSingle(),
        client
          .from('submission_chats')
          .select('id, submission_id, chat_url, platform, is_gem, approved_gem_id, extraction_error, extracted_text')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: true }),
        client
          .from('analysis')
          .select('id, submission_id, score, flagged, justification, breakdown, evaluated_at')
          .eq('submission_id', submissionId)
          .order('evaluated_at', { ascending: false })
          .limit(1),
      ]);

      if (taskRes.error) throw new Error(taskRes.error.message);
      if (!taskRes.data) {
        writeStoredDetail(submissionId, null);
        return null;
      }
      if (chatRes.error) throw new Error(chatRes.error.message);
      if (analysisRes.error) throw new Error(analysisRes.error.message);

      const t = taskRes.data as Record<string, unknown>;
      const courseRow = (t as { course: Record<string, unknown> }).course;
      const userName = (userRes.data as { name: string } | null)?.name ?? 'Estudiante';
      const chatRows = chatRes.data;
      const analysisRows = analysisRes.data;

      const chats: ChatView[] = (chatRows ?? []).map((row) => mapChat(row as Record<string, unknown>));
      const analysis: Analysis | null =
        analysisRows && analysisRows.length > 0 ? mapAnalysis(analysisRows[0] as Record<string, unknown>) : null;

      const result: SubmissionDetail = {
        submission: {
          id: String(sub.id),
          task_id: taskId,
          version: Number(sub.version ?? 1),
          submitted_at: String(sub.submitted_at),
          student: { id: studentId, name: userName },
          chats,
        },
        analysis,
        task: {
          id: String(t.id),
          name: String(t.name),
          is_group_task: Boolean(t.is_group_task),
          course_id: String(t.course_id ?? courseRow.id),
          due_at: (t.due_date as string | undefined) ?? undefined,
        },
        course: {
          id: String(courseRow.id),
          name: String(courseRow.name),
          teacher_id: String(courseRow.teacher_id),
        },
      };

      writeStoredDetail(submissionId, result);
      return result;
    } finally {
      inflightDetails.delete(submissionId);
    }
  })();

  inflightDetails.set(submissionId, promise);
  return promise;
}

export async function getTaskBundle(client: Client, taskId: string): Promise<TaskBundle | null> {
  const cached = readStoredBundle(taskId);
  if (cached !== undefined) return cached;

  const existing = inflightBundles.get(taskId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data: taskRow, error: taskErr } = await client
        .from('tasks')
        .select(`
          id, course_id, name, is_group_task, ai_evaluation_mode, status, group_grading_mode, max_group_size, created_at, due_date, allow_resubmission,
          course:courses!inner(id, name, join_code, enrollment_mode, teacher_id, description)
        `)
        .eq('id', taskId)
        .maybeSingle();
      if (taskErr) throw new Error(taskErr.message);
      if (!taskRow) {
        writeStoredBundle(taskId, null);
        return null;
      }

      const t = taskRow as Record<string, unknown>;
      const courseRow = (t as { course: Record<string, unknown> }).course;

      const { data: subRows, error: subErr } = await client
        .from('submissions')
        .select('id, task_id, student_id, version, submitted_at')
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false });
      if (subErr) throw new Error(subErr.message);

      const subList = (subRows ?? []) as Array<Record<string, unknown>>;
      const subIds = subList.map((s) => s.id as string);
      const studentIds = [...new Set(subList.map((s) => s.student_id as string))];

      let chatsBySub: Record<string, ChatView[]> = {};
      let usersById: Record<string, { id: string; name: string }> = {};

      if (subIds.length > 0) {
        const [chatRes, userRes] = await Promise.all([
          client
            .from('submission_chats')
            .select('id, submission_id, chat_url, platform, is_gem, approved_gem_id, extraction_error, extracted_text')
            .in('submission_id', subIds)
            .order('created_at', { ascending: true }),
          client.from('users').select('id, name').in('id', studentIds),
        ]);
        if (chatRes.error) throw new Error(chatRes.error.message);
        for (const row of (chatRes.data ?? []) as Array<Record<string, unknown>>) {
          const sid = String(row.submission_id);
          (chatsBySub[sid] ??= []).push(mapChat(row));
        }
        for (const u of (userRes.data ?? []) as Array<{ id: string; name: string }>) {
          usersById[u.id] = { id: String(u.id), name: String(u.name) };
        }
      }

      const analysesBySubmission: Record<string, Analysis> = {};
      if (subIds.length > 0) {
        const aRes = await client
          .from('analysis')
          .select('id, submission_id, score, flagged, justification, breakdown, evaluated_at')
          .in('submission_id', subIds)
          .order('evaluated_at', { ascending: false });
        if (aRes.error) throw new Error(aRes.error.message);
        for (const row of (aRes.data ?? []) as Array<Record<string, unknown>>) {
          const sid = String(row.submission_id);
          if (!analysesBySubmission[sid]) analysesBySubmission[sid] = mapAnalysis(row);
        }
      }

      const submissions: SubmissionView[] = subList.map((s) => {
        const sid = String(s.id);
        const subStudentId = String(s.student_id);
        const known = usersById[subStudentId];
        return {
          id: sid,
          task_id: taskId,
          version: Number(s.version ?? 1),
          submitted_at: String(s.submitted_at),
          student: { id: subStudentId, name: known?.name ?? 'Estudiante' },
          chats: chatsBySub[sid] ?? [],
        };
      });

      const result: TaskBundle = {
        course: { ...mapCourse(courseRow as never, 'teacher'), teacher_id: (courseRow as { teacher_id: string }).teacher_id },
        task: { ...(t as unknown as Task), due_at: (t.due_date as string | undefined) ?? undefined },
        submissions,
        analysesBySubmission,
      };

      writeStoredBundle(taskId, result);
      return result;
    } finally {
      inflightBundles.delete(taskId);
    }
  })();

  inflightBundles.set(taskId, promise);
  return promise;
}

export async function submitChats(
  client: Client,
  taskId: string,
  uId: string,
  urls: string[],
): Promise<{ id: string }> {
  const { data: sub, error: subErr } = await client
    .from('submissions')
    .insert({ task_id: taskId, student_id: uId })
    .select('id')
    .single();
  if (subErr) throw new Error(subErr.message);

  if (urls.length > 0) {
    const rows = urls.map((url) => ({
      submission_id: sub.id,
      student_id: uId,
      chat_url: url,
      platform: 'gemini',
    }));
    const { error: chatErr } = await client.from('submission_chats').insert(rows);
    if (chatErr) throw new Error(`La entrega se creó pero falló al guardar los chats: ${chatErr.message}`);
  }
  invalidateTaskBundleCache(taskId);
  return { id: sub.id };
}

export async function evaluateSubmission(client: Client, submissionId: string, taskId?: string): Promise<void> {
  if (!taskId) {
    const { data } = await client.from('submissions').select('task_id').eq('id', submissionId).maybeSingle();
    if (data?.task_id) invalidateTaskBundleCache(data.task_id as string);
  } else {
    invalidateTaskBundleCache(taskId);
  }
  const { error } = await client.functions.invoke('evaluate-submission', {
    body: { submission_id: submissionId },
  });
  if (!error) return;
  const ctx = (error as unknown as { context?: Response }).context;
  if (ctx) {
    try {
      const payload = (await ctx.json()) as { error?: string };
      if (payload?.error) throw new Error(payload.error);
    } catch {
      /* ignore */
    }
  }
  throw new Error(error.message);
}

export async function getMySubmissionsByTasks(
  client: Client,
  taskIds: string[],
  userId: string,
): Promise<Record<string, string>> {
  if (taskIds.length === 0) return {};
  const { data, error } = await client
    .from('submissions')
    .select('id, task_id')
    .in('task_id', taskIds)
    .eq('student_id', userId)
    .order('submitted_at', { ascending: false });
  if (error) throw new Error(error.message);
  const result: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ id: string; task_id: string }>) {
    if (!result[row.task_id]) result[row.task_id] = row.id;
  }
  return result;
}

export async function deleteSubmission(client: Client, submissionId: string): Promise<void> {
  const { error } = await client.from('submissions').delete().eq('id', submissionId);
  if (error) throw new Error(error.message);
  invalidateSubmissionDetailCache(submissionId);
}
