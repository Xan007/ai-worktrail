-- Evaluation queue for async processing
-- Worker polls this table, extracts chats, evaluates, and updates analysis

CREATE TABLE public.evaluation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'extracting', 'evaluating', 'completed', 'failed')),
  priority INT NOT NULL DEFAULT 0, -- Higher = processed first
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_error TEXT,
  extraction_method TEXT, -- 'jina' or 'playwright'
  extracted_chats JSONB, -- Store extracted text per chat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  worker_id TEXT, -- Which worker picked this up
  UNIQUE (submission_id) -- One job per submission
);

-- Index for worker polling: get pending jobs ordered by priority
CREATE INDEX idx_evaluation_queue_pending 
  ON public.evaluation_queue (priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- Index for status lookups
CREATE INDEX idx_evaluation_queue_status 
  ON public.evaluation_queue (status);

-- Index for submission lookups
CREATE INDEX idx_evaluation_queue_submission 
  ON public.evaluation_queue (submission_id);

-- Enable RLS
ALTER TABLE public.evaluation_queue ENABLE ROW LEVEL SECURITY;

-- Teachers can see queue status for their courses
CREATE POLICY "Teachers can view evaluation queue" ON public.evaluation_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN tasks t ON t.id = s.task_id
      JOIN courses c ON c.id = t.course_id
      WHERE s.id = evaluation_queue.submission_id
      AND    c.teacher_id = (select public.fn_requesting_user_id())
    )
  );

-- Service role can manage all queue operations
CREATE POLICY "Service role can manage evaluation queue" ON public.evaluation_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Add extraction_error to analysis table if not exists
DO $$ BEGIN
  ALTER TABLE public.analysis ADD COLUMN extraction_method TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add breakdown column if not exists (for structured evaluation data)
DO $$ BEGIN
  ALTER TABLE public.analysis ADD COLUMN breakdown JSONB;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
