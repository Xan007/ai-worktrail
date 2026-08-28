DROP TRIGGER IF EXISTS trg_debug_capture ON public.submissions;
DROP FUNCTION IF EXISTS public.debug_capture();
DROP FUNCTION IF EXISTS public.debug_policy_pieces(UUID, TEXT);
DROP FUNCTION IF EXISTS public.debug_auth_context();
DROP TABLE IF EXISTS public.debug_log;

NOTIFY pgrst, 'reload schema';
