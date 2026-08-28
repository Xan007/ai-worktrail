interface ClerkSession {
  getToken: () => Promise<string | null>
}

interface ClerkInstance {
  session?: ClerkSession
}

declare global {
  interface Window {
    Clerk?: ClerkInstance
  }
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_URL: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}
