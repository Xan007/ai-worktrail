-- 00015: persist per-chat extraction errors so students see why a prompt panel is empty
ALTER TABLE public.submission_chats
  ADD COLUMN IF NOT EXISTS extraction_error TEXT;

COMMENT ON COLUMN public.submission_chats.extraction_error IS 'Set by the evaluation function when the chat URL could not be read (deleted share, private share requiring sign-in, rendering failure). NULL when extraction succeeded.';
