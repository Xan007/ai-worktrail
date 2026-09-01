import { useEffect, useState } from 'react';
import { ExternalLink, Link2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { ScoreBlock } from '@/components/ScoreBlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Analysis } from '@/lib/mockdata';
import { useBackendClient } from '@/hooks/useBackend';
import { CRITERIA_META, detectPlatform } from '@/lib/data';

interface LinkResultPayload {
  url: string;
  ok: boolean;
  score?: number;
  flagged?: boolean;
  profile?: Analysis['profile'];
  breakdown?: {
    profile: Analysis['profile'];
    summary: string;
    criteria: Array<{
      key: string;
      rating: number;
      band: Analysis['criteria'][number]['band'];
      explanation: string;
      evidence: Analysis['criteria'][number]['evidence'];
    }>;
    strengths: string[];
    improvements: string[];
  };
  error?: string;
}

interface LinksResponse {
  results: LinkResultPayload[];
  overall: LinkResultPayload | null;
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: string }> = {
  gemini: { label: 'Gemini', icon: '/logos/gemini.svg' },
  chatgpt: { label: 'ChatGPT', icon: '/logos/chatgpt.svg' },
  claude: { label: 'Claude', icon: '/logos/claude.svg' },
  other: { label: 'Otro', icon: '' },
};

const FALLBACK_BAND = { level: 1, label: '—', description: '' } as Analysis['criteria'][number]['band'];

function toAnalysis(item: LinkResultPayload, idSuffix: string): Analysis {
  const b = item.breakdown;
  return {
    id: `eval-${idSuffix}`,
    submission_id: item.url,
    score: item.score ?? 0,
    flagged: Boolean(item.flagged),
    profile: item.profile ?? 'productive_passenger',
    summary: b?.summary ?? '',
    criteria: Object.entries(CRITERIA_META).map(([key, meta]) => {
      const found = b?.criteria?.find((c) => c.key === key);
      return {
        key,
        name: meta.name,
        weight: meta.weight,
        rating: found?.rating ?? 0,
        band: found?.band ?? FALLBACK_BAND,
        explanation: found?.explanation ?? '',
        evidence: found?.evidence ?? [],
      };
    }),
    strengths: b?.strengths ?? [],
    improvements: b?.improvements ?? [],
  };
}

interface ChatUrlItem {
  id: string;
  value: string;
}

export function EvaluatePage() {
  const client = useBackendClient();
  const [chats, setChats] = useState<ChatUrlItem[]>([
    { id: '1', value: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Array<{ url: string; error: string }>>([]);
  const [results, setResults] = useState<{ combined?: Analysis; individual: Analysis[] } | null>(null);

  useEffect(() => {
    document.title = 'Evaluador de pruebas — AI WorkTrail';
  }, []);

  const handleUpdateChat = (id: string, val: string) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, value: val } : c)));
  };

  const handleRemoveChat = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddChat = () => {
    if (chats.length >= 8) return;
    setChats((prev) => [...prev, { id: String(Date.now()), value: '' }]);
  };

  const validChats = chats
    .map((c) => c.value.trim())
    .filter((v) => /^https?:\/\//i.test(v));

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validChats.length === 0) {
      setError('Ingresa al menos un enlace de chat válido (http/https).');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setFailedUrls([]);

    try {
      const { data, error: invokeError } = await client.functions.invoke<LinksResponse>(
        'evaluate-links',
        { body: { urls: validChats } },
      );
      if (invokeError) {
        setError(invokeError.message);
        return;
      }
      const payload = data as LinksResponse;
      const failedUrlsList: Array<{ url: string; error: string }> = [];
      const individual: Analysis[] = [];
      let indIdx = 0;
      for (const r of payload.results ?? []) {
        if (!r.ok) {
          failedUrlsList.push({ url: r.url, error: r.error ?? 'Error desconocido' });
        } else if (r.breakdown) {
          individual.push(toAnalysis(r, `ind-${indIdx++}`));
        }
      }
      setFailedUrls(failedUrlsList);
      const combined =
        payload.overall && payload.overall.ok && payload.overall.breakdown
          ? toAnalysis(payload.overall, 'combined')
          : undefined;
      setResults({ combined, individual });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-fade mx-auto max-w-[1040px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Evaluador de pruebas</h1>
        <p className="mt-1 text-xs text-[#64748B]">
          Ingresa enlaces de chats para calificar cada uno individualmente y de forma combinada sin guardar en base de datos.
        </p>
      </div>

      <form onSubmit={handleEvaluate} className="mb-8 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs font-semibold text-[#0F172A]">Enlaces de chats de IA</Label>
            <span className="text-[11px] text-[#64748B]">{validChats.length} enlace(s) válido(s)</span>
          </div>

          <div className="space-y-3">
            {chats.map((chat, index) => {
              const platform = detectPlatform(chat.value);
              const config = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.other;
              return (
                <div key={chat.id} className="flex items-center gap-2">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#E2E8F0] bg-[#FAFBFC]"
                    title={config.label}
                  >
                    {config.icon ? (
                      <img src={config.icon} alt={config.label} className="size-4 object-contain" />
                    ) : (
                      <Link2 size={15} className="text-[#64748B]" />
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Input
                      value={chat.value}
                      onChange={(event) => handleUpdateChat(chat.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          if (chat.value.trim().length > 0) {
                            handleAddChat();
                          }
                        }
                      }}
                      placeholder="https://chatgpt.com/share/... https://claude.ai/share/... o https://gemini.google.com/share/..."
                      className="h-10 font-mono text-xs"
                    />
                  </div>
                  {chats.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar enlace ${index + 1}`}
                      onClick={() => handleRemoveChat(chat.id)}
                      className="text-[#64748B] hover:text-[#B3372F] hover:bg-[#FBEDEB]"
                    >
                      <Trash2 size={15} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {chats.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5 text-xs text-[#0077CC] hover:text-[#0066B3]"
              onClick={handleAddChat}
            >
              <Plus size={14} /> Añadir otro chat
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-[#EEF1F6]">
          <Button type="submit" disabled={loading || validChats.length === 0} className="gap-2 text-xs font-semibold">
            {loading ? 'Evaluando chats…' : 'Evaluar enlaces'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mb-6 rounded-md border-l-4 border-[#B3372F] bg-[#FBEDEB] p-4 text-xs text-[#0F172A]">
          {error}
        </div>
      )}

      {failedUrls.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-[#0F172A]">Enlaces no procesados</h2>
          {failedUrls.map((f, fi) => (
            <div key={fi} className="rounded-md border-l-4 border-[#B45309] bg-[#FBF3E7] p-3 text-xs">
              <span className="font-mono font-medium text-[#B45309]">{f.url}</span>
              <div className="mt-1 text-[#0F172A]">{f.error}</div>
            </div>
          ))}
        </div>
      )}

      {results && (
        <div className="space-y-8">
          {results.combined && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#0077CC]" />
                  <h2 className="text-sm font-bold text-[#0F172A]">Evaluación consolidada</h2>
                </div>
                <span className="rounded bg-[#E0F2FE] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0077CC]">
                  {validChats.length} chats
                </span>
              </div>
              <ScoreBlock analysis={results.combined} storageKey="evaluate-combined" />
            </section>
          )}

          {results.individual.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[#0F172A] border-b border-[#EEF1F6] pb-2">
                Evaluaciones individuales
              </h2>
              <div className="space-y-6">
                {results.individual.map((a, i) => (
                  <div key={a.id} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-[#64748B]">
                        Chat {i + 1}
                      </span>
                      <a
                        href={a.submission_id}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-[#0077CC] hover:underline"
                      >
                        <span className="truncate max-w-[280px]">{a.submission_id}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <ScoreBlock analysis={a} storageKey={`evaluate-individual-${i}`} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="rounded-xl border border-dashed border-[#E2E8F0] p-10 text-center bg-white/50">
          <p className="text-xs font-semibold text-[#334155]">Ingresa enlaces arriba y presiona "Evaluar enlaces"</p>
          <p className="mt-1 text-[11px] text-[#64748B]">Los resultados detallados se presentarán aquí con el desglose de criterios.</p>
        </div>
      )}
    </main>
  );
}
