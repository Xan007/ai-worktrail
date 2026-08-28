import type { Analysis, Course, Criterion, EnrollmentMode, Profile, Task } from '@/lib/mockdata';

export interface ChatView {
  id: string;
  url: string;
  platform: 'gemini' | 'chatgpt' | 'claude' | 'other';
  gem_status: 'verified' | 'unverified' | null;
  extraction_error: string | null;
  prompts: string[];
}

export interface SubmissionView {
  id: string;
  task_id: string;
  version: number;
  submitted_at: string;
  student: { id: string; name: string };
  chats: ChatView[];
}

export interface TaskBundle {
  course: Course & { teacher_id: string };
  task: Task;
  submissions: SubmissionView[];
  analysesBySubmission: Record<string, Analysis>;
}

export interface SubmissionDetail {
  submission: {
    id: string;
    task_id: string;
    version: number;
    submitted_at: string;
    student: { id: string; name: string };
    chats: ChatView[];
  };
  analysis: Analysis | null;
  task: {
    id: string;
    name: string;
    is_group_task: boolean;
    course_id: string;
    due_at?: string;
  };
  course: {
    id: string;
    name: string;
    teacher_id: string;
  };
}

export interface CoursePreviewInfo {
  course_id: string;
  name: string;
  enrollment_mode: EnrollmentMode;
  is_enrollment_locked: boolean;
  due_date?: string;
}

export interface CreateTaskInput {
  course_id: string;
  name: string;
  is_group_task: boolean;
  group_grading_mode: 'shared' | 'individual';
  ai_evaluation_mode: 'on_submit' | 'on_demand';
  max_group_size?: number;
  due_date?: string;
  allow_resubmission?: boolean;
}

export interface EnrollmentView {
  enrollment_id: string;
  status: 'pending' | 'approved' | 'rejected';
  user: { id: string; name: string; email: string; userRole: string; avatar_url?: string | null };
}
