-- 00029: Fix users.id type mismatch and add profile RPC
--
-- Root cause: the users.id column was created as UUID (e.g. via the
-- Supabase dashboard) while Clerk user IDs are TEXT strings like
-- "user_3IY2EhAAYAALeOfnZrqEDWcLJtY".  PostgREST rejects these
-- because it tries to cast the filter value to UUID.
--
-- Step 1: Ensure the column is TEXT.  We use a DO block so it is
--         idempotent — if the column is already TEXT nothing happens.

DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'users'
     AND column_name = 'id';

  IF col_type = 'uuid' THEN
    -- Drop foreign keys that reference users(id) so the TYPE change succeeds
    -- (you cannot change a PK type while FKs depend on it).
    ALTER TABLE public.courses
      DROP CONSTRAINT IF EXISTS courses_teacher_id_fkey;
    ALTER TABLE public.course_enrollments
      DROP CONSTRAINT IF EXISTS course_enrollments_user_id_fkey;
    ALTER TABLE public.submissions
      DROP CONSTRAINT IF EXISTS submissions_student_id_fkey;
    ALTER TABLE public.submission_chats
      DROP CONSTRAINT IF EXISTS submission_chats_student_id_fkey;
    ALTER TABLE public.analysis
      DROP CONSTRAINT IF EXISTS analysis_student_id_fkey;

    ALTER TABLE public.users
      ALTER COLUMN id TYPE TEXT USING id::text;

    -- Re-create the foreign keys
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_teacher_id_fkey
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE public.course_enrollments
      ADD CONSTRAINT course_enrollments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE public.submissions
      ADD CONSTRAINT submissions_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE public.submission_chats
      ADD CONSTRAINT submission_chats_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE public.analysis
      ADD CONSTRAINT analysis_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: RPC to fetch the current user's profile using the JWT 'sub' claim.
-- This avoids any PostgREST type-casting on the client side.

CREATE OR REPLACE FUNCTION public.fn_get_current_user_profile()
RETURNS TABLE (
  id TEXT,
  role TEXT,
  name TEXT,
  email TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT u.id, u.role, u.name, u.email, u.avatar_url
  FROM public.users u
  WHERE u.id = public.fn_requesting_user_id()
  LIMIT 1;
$$;

-- Step 3: RPC to fetch multiple users by ID list (used by submissions / courses)
-- Bypasses PostgREST UUID casting on the `id` column.

CREATE OR REPLACE FUNCTION public.fn_get_users_by_ids(p_ids TEXT[])
RETURNS TABLE (
  id TEXT,
  name TEXT,
  email TEXT,
  role TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT u.id, u.name, u.email, u.role, u.avatar_url
  FROM public.users u
  WHERE u.id = ANY(p_ids);
$$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.fn_get_users_by_ids(TEXT[]) TO authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.fn_get_current_user_profile() TO authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 4: RPC to upsert the current user's profile.
-- Uses fn_requesting_user_id() so the INSERT/UPDATE always targets the
-- correct row regardless of column type, and RLS (users_insert_self /
-- users_update_self) still applies.

CREATE OR REPLACE FUNCTION public.fn_upsert_current_user_profile(
  p_email TEXT,
  p_name TEXT,
  p_provider TEXT,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT;
BEGIN
  v_uid := public.fn_requesting_user_id();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.users (id, email, name, provider, role)
  VALUES (v_uid, p_email, p_name, p_provider, p_role)
  ON CONFLICT (id) DO UPDATE SET
    email  = EXCLUDED.email,
    name   = EXCLUDED.name,
    provider = EXCLUDED.provider,
    role   = EXCLUDED.role;
END;
$$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.fn_upsert_current_user_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Fix RLS policies that use auth.uid()::text instead of
-- fn_requesting_user_id().  With Clerk + Supabase, the JWT 'sub' claim
-- (Clerk user ID) does NOT match auth.uid() (Supabase auth UUID).
-- All user-scoped policies must use fn_requesting_user_id().

DROP POLICY IF EXISTS users_update_own_onboarding ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;

NOTIFY pgrst, 'reload schema';
