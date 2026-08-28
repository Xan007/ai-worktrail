-- 00028: revierte onboarding DB-level, vuelve a localStorage + checklist únicamente
-- Borra columnas añadidas en 00027 y su policy

DROP POLICY IF EXISTS users_update_own_onboarding ON public.users;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS onboarding_dismissed,
  DROP COLUMN IF EXISTS onboarding_has_invited,
  DROP COLUMN IF EXISTS onboarding_has_created_task;
