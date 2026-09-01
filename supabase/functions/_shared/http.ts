import { CRITERIA_BANDS } from './constants.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function decodeJwtPayload(jwt: string): { sub?: string } | null {
  try {
    const part = jwt.split('.')[1]
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function bandFor(criterionKey: string, rating: number): { level: number; label: string; description: string } {
  const bands = CRITERIA_BANDS[criterionKey] ?? []
  const index = bands.findIndex((b) => rating <= b.max)
  const level = index === -1 ? bands.length : index + 1
  const min = level === 1 ? 0 : bands[level - 2].max + 1
  const max = index === -1 ? 100 : bands[index].max
  return {
    level,
    label: `${min}–${max}`,
    description: bands[index === -1 ? bands.length - 1 : index]?.description ?? '',
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
