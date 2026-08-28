// Corte de turnos del estudiante a partir del texto extraído por la Edge Function.
// Espejo client-side de la lógica en supabase/functions/_shared/evaluation-core.ts,
// para numerar los prompts con los mismos marcadores [CN-MK] que cita el desglose.

const TURN_SPLIT_RE = /(?:^|\n)[^\S\n]*(?:You said|Has dicho):?[^\S\n]*(?:\n|$)/i;

const BOILERPLATE_LINE_RE =
  /^(Title:|URL Source:|Markdown Content:|Copy public link|Gemini may display inaccurate|Show code|Show thinking|Show more|(Mostrar|Ver) c(ó|o)digo|Responses below were generated|Las respuestas que aparecen a continuación|Google apps|Sign in\s*$|Report\s+http|\[(About Gemini|FAQ|Google Privacy Policy|Google Terms of Service|Sign in|https?:))/i;

function cleanExtraction(rawText: string): string {
  return rawText
    .split('\n')
    .filter((line) => !BOILERPLATE_LINE_RE.test(line.trim()))
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '[adjunto]');
}

export function splitIntoMessages(rawText: string): string[] {
  const cleaned = cleanExtraction(rawText);

  // Corta en cada línea que sea exactamente el marcador de turno,
  // tolerando prefijos de heading markdown (##### You said).
  const markerRe = /^\s*(?:#{1,6}\s*)?(?:You said|Has dicho)\b:?/i;
  const turns: string[] = [];
  let current: string[] = [];
  let started = false;

  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trimEnd();
    if (markerRe.test(line)) {
      if (started) {
        const t = current.join('\n').trim();
        if (t) turns.push(t);
      }
      started = true;
      const rest = line.replace(markerRe, '').trim();
      current = rest ? [rest] : [];
      continue;
    }
    if (started) current.push(line);
  }
  if (started) {
    const t = current.join('\n').trim();
    if (t) turns.push(t);
  }

  if (turns.length > 0) return turns;

  return cleaned
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}
