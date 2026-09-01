const SYSTEM_NOISE_RE =
  /^(Title:|URL Source:|Markdown Content:|Images:|Links\/Buttons:|Warning:|This page does not seem to contain|Responses below were generated|Las respuestas que aparecen a continuación|Google apps|Sign in\s*$|Report\s+http|Copy public link|Gemini may display inaccurate|Show code|Show thinking|Show more|(Mostrar|Ver) c(ó|o)digo|\[(About Gemini|FAQ|Google Privacy Policy|Google Terms of Service|Sign in|https?:))/i;

function cleanTurnText(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (SYSTEM_NOISE_RE.test(trimmed)) return false;
      if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) return false;
      if (/^-\s*!\[[^\]]*\]/i.test(trimmed)) return false;
      if (/^-\s*\[Learn more/i.test(trimmed)) return false;
      return true;
    })
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .trim();
}

export function splitIntoMessages(rawText: string): string[] {
  const isGemini = /#{1,6}\s*(?:You said|Has dicho)\b/i.test(rawText);

  if (isGemini) {
    const lines = rawText.split('\n');
    const turns: string[] = [];
    let currentLines: string[] = [];
    let inTurn = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^#{1,6}\s*(?:You said|Has dicho)\b/i.test(trimmed)) {
        if (inTurn && currentLines.length > 0) {
          const cleaned = cleanTurnText(currentLines.join('\n'));
          if (cleaned) turns.push(cleaned);
        }
        inTurn = true;
        currentLines = [];
        continue;
      }
      if (inTurn) {
        currentLines.push(line);
      }
    }
    if (inTurn && currentLines.length > 0) {
      const cleaned = cleanTurnText(currentLines.join('\n'));
      if (cleaned) turns.push(cleaned);
    }
    if (turns.length > 0) return turns;
  }

  const lines = rawText.split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (SYSTEM_NOISE_RE.test(trimmed)) return false;
    if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) return false;
    if (/^-\s*!\[[^\]]*\]/i.test(trimmed)) return false;
    if (/^-\s*\[Learn more/i.test(trimmed)) return false;
    return true;
  });

  const blocks = filtered
    .join('\n')
    .trim()
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !SYSTEM_NOISE_RE.test(b));

  return blocks;
}
