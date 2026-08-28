import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '@/lib/mockdata';
import { invalidateTaskBundleCache } from './cache';
import type { CreateTaskInput } from './types';

type Client = SupabaseClient;

export async function listTasks(client: Client, courseId: string): Promise<Task[]> {
  const { data, error } = await client
    .from('tasks')
    .select('id, course_id, name, is_group_task, ai_evaluation_mode, status, group_grading_mode, max_group_size, created_at, due_date, allow_resubmission')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...(row as unknown as Task),
    due_at: (row.due_date as string) ?? undefined,
  }));
}

export async function createTask(client: Client, input: CreateTaskInput): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    course_id: input.course_id,
    name: input.name,
    is_group_task: input.is_group_task,
    group_grading_mode: input.is_group_task ? input.group_grading_mode : 'shared',
    ai_evaluation_mode: input.ai_evaluation_mode,
    allow_resubmission: input.allow_resubmission ?? true,
  };
  if (input.is_group_task && input.max_group_size) payload.max_group_size = input.max_group_size;
  if (input.due_date) payload.due_date = input.due_date;
  const { data, error } = await client.from('tasks').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function updateTaskAllowResubmission(
  client: Client,
  taskId: string,
  allow: boolean,
): Promise<void> {
  const { error } = await client
    .from('tasks')
    .update({ allow_resubmission: allow })
    .eq('id', taskId);
  if (error) throw new Error(error.message);
  invalidateTaskBundleCache(taskId);
}

export async function updateTask(
  client: Client,
  taskId: string,
  input: Partial<CreateTaskInput & { name: string }>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.is_group_task !== undefined) payload.is_group_task = input.is_group_task;
  if (input.ai_evaluation_mode !== undefined) payload.ai_evaluation_mode = input.ai_evaluation_mode;
  if (input.allow_resubmission !== undefined) payload.allow_resubmission = input.allow_resubmission;
  if (input.due_date !== undefined) payload.due_date = input.due_date || null;
  if (input.is_group_task !== undefined) {
    if (input.is_group_task) {
      payload.group_grading_mode = input.group_grading_mode ?? 'shared';
      if (input.max_group_size !== undefined) payload.max_group_size = input.max_group_size;
    } else {
      payload.group_grading_mode = 'shared';
      payload.max_group_size = null;
    }
  } else {
    if (input.group_grading_mode !== undefined) payload.group_grading_mode = input.group_grading_mode;
    if (input.max_group_size !== undefined) payload.max_group_size = input.max_group_size;
  }
  if (Object.keys(payload).length === 0) return;
  const { error } = await client.from('tasks').update(payload).eq('id', taskId);
  if (error) throw new Error(error.message);
  invalidateTaskBundleCache(taskId);
}

export async function deleteTask(client: Client, taskId: string): Promise<void> {
  const { error } = await client.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
  invalidateTaskBundleCache(taskId);
}
