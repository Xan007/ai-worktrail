CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  enrollment_mode TEXT NOT NULL DEFAULT 'open'
    CHECK (enrollment_mode IN ('open', 'approval', 'whitelist')),
  allowed_email_domain TEXT,
  pre_enrolled_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enrollment_locked BOOLEAN NOT NULL DEFAULT FALSE,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.group_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_size INT NOT NULL CHECK (max_size >= 2),
  UNIQUE (course_id, name)
);

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.group_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  members TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, name)
);

CREATE TABLE public.approved_gems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gem_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  is_group_task BOOLEAN NOT NULL DEFAULT FALSE,
  group_category_id UUID REFERENCES public.group_categories(id) ON DELETE SET NULL,
  max_group_size INT CHECK (max_group_size >= 2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  ai_evaluation_mode TEXT NOT NULL DEFAULT 'on_demand'
    CHECK (ai_evaluation_mode IN ('on_submit', 'on_demand')),
  group_grading_mode TEXT NOT NULL DEFAULT 'shared'
    CHECK (group_grading_mode IN ('shared', 'individual')),
  created_by TEXT NOT NULL DEFAULT 'teacher' CHECK (created_by IN ('teacher', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1,
  pending_task_name TEXT
);

CREATE TABLE public.submission_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chat_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'gemini'
    CHECK (platform IN ('gemini', 'claude', 'chatgpt', 'other')),
  is_gem BOOLEAN NOT NULL DEFAULT FALSE,
  approved_gem_id UUID REFERENCES public.approved_gems(id) ON DELETE SET NULL,
  gem_instructions_pasted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) CHECK (score BETWEEN 0 AND 100),
  justification TEXT,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_gems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_courses_teacher ON public.courses (teacher_id);
CREATE INDEX idx_group_categories_course ON public.group_categories (course_id);
CREATE INDEX idx_groups_course ON public.groups (course_id);
CREATE INDEX idx_groups_category ON public.groups (category_id);
CREATE INDEX idx_approved_gems_course ON public.approved_gems (course_id);
CREATE INDEX idx_course_enrollments_user ON public.course_enrollments (user_id);
CREATE INDEX idx_tasks_course ON public.tasks (course_id);
CREATE INDEX idx_submissions_task ON public.submissions (task_id);
CREATE INDEX idx_submissions_student ON public.submissions (student_id);
CREATE INDEX idx_submissions_group ON public.submissions (group_id);
CREATE INDEX idx_submission_chats_submission ON public.submission_chats (submission_id);
CREATE INDEX idx_submission_chats_student ON public.submission_chats (student_id);
CREATE INDEX idx_analysis_submission ON public.analysis (submission_id);
CREATE INDEX idx_analysis_student ON public.analysis (student_id);
