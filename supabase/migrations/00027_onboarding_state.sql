-- 00027: onboarding state a nivel DB (persiste entre navegadores/dispositivos)
-- Reemplaza localStorage awt_* para checklist y highlights

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_has_invited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_has_created_task BOOLEAN NOT NULL DEFAULT FALSE;

-- Permitir que cada usuario actualice su propio estado de onboarding
DROP POLICY IF EXISTS users_update_own_onboarding ON public.users;
CREATE POLICY users_update_own_onboarding ON public.users
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Asegurar que el SELECT ya permite ver su propia fila (existe policy previa users_select_own)
-- Si no, crearla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_select_own'
  ) THEN
    CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid()::text = id);
  END IF;
END $$;
