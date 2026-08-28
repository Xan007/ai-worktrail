import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/clerk-react"
import { shadcn } from "@clerk/themes"
import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AppProviders } from "@/hooks/useBackend"
import { RoleModeProvider } from "@/hooks/useRoleMode"

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Falta VITE_CLERK_PUBLISHABLE_KEY en las variables de entorno")
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={{ theme: shadcn }}
    >
      <ThemeProvider>
        <RoleModeProvider>
          <AppProviders>
            <App />
          </AppProviders>
        </RoleModeProvider>
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
)

