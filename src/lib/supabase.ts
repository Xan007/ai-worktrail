import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Proveedor de token de sesión. El nuevo frontend debe conectar aquí su
 * mecanismo de auth (hoy: Clerk) devolviendo el JWT del usuario en cada request.
 */
export type TokenGetter = () => Promise<string | null>

/**
 * Cliente Supabase conectado al backend. Única pieza conservada del frontend
 * anterior: todas las llamadas a la base de datos y a las Edge Functions pasan
 * por acá, con el JWT en el header Authorization para que aplique RLS.
 */
export function createBackendClient(getToken: TokenGetter | null) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    async accessToken() {
      return getToken ? getToken() : null
    },
  })
}
