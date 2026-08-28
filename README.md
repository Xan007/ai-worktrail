# AI WorkTrail

Sistema de auditoría y análisis automatizado de uso de IA en entregas académicas. Evalúa el nivel de uso crítico de herramientas como Gemini, ChatGPT y Claude con evidencia citada y calificación automática basada en la rúbrica Brooks.

---

## Requisitos

- Node.js >= 18.x
- npm >= 9.x

---

## Instalación y desarrollo

```bash
npm install
cp .env.example .env.local
# Completar las variables en .env.local
npm run dev
```

La app se abre en `http://localhost:5173`.

---

## Variables de entorno

Ver `.env.example` para la lista completa. Resumen:

| Variable | Descripción |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Key pública de Clerk (auth) |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key de Supabase |
| `CLERK_SECRET_KEY` | Secret key de Clerk (solo backend) |
| `SUPABASE_ACCESS_TOKEN` | Access token de Supabase (solo backend) |

> **Importante:** Nunca comités secretos en variables `VITE_` — se exponen en el bundle del navegador. Las secret keys (`CLERK_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`) se usan solo en Edge Functions o backend.

---

## Build para producción

```bash
npm run build
npm run preview
```

---

## Scripts disponibles

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | Verifica tipos de TypeScript |
| `npm run lint` | Lint con ESLint |
| `npm run format` | Formatea código con Prettier |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualiza el build |