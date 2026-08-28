CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TABLE (
  jwt_claims TEXT,
  claim_sub TEXT,
  helper_uid TEXT,
  auth_jwt_jsonb JSONB
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    current_setting('request.jwt.claims', TRUE),
    current_setting('request.jwt.claim.sub', TRUE),
    public.fn_requesting_user_id(),
    auth.jwt()
$$;

REVOKE EXECUTE ON FUNCTION public.debug_auth_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.debug_auth_context() TO authenticated;
