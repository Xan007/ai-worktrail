-- 00014: structured evaluation breakdown + persisted chat extraction
ALTER TABLE public.analysis
  ADD COLUMN IF NOT EXISTS breakdown JSONB;

ALTER TABLE public.submission_chats
  ADD COLUMN IF NOT EXISTS extracted_text TEXT;

COMMENT ON COLUMN public.analysis.breakdown IS 'Structured score justification: profile, weighted criteria with message-level evidence, strengths, improvements, summary. Total is computed server-side from criteria ratings.';
COMMENT ON COLUMN public.submission_chats.extracted_text IS 'Raw text extracted from the chat URL by the evaluation function (primarily student prompts). Powers the teacher-only prompt viewer with [CN-MK] block markers.';
