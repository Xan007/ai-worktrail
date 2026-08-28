-- 00025: foto de perfil para listados de miembros
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- permitir que RLS ya existente (users_select_self_or_related) exponga avatar_url sin cambio
COMMENT ON COLUMN public.users.avatar_url IS 'URL de foto de Clerk u otro proveedor';

NOTIFY pgrst, 'reload schema';
