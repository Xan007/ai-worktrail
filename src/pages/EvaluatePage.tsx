import { useEffect, useState } from 'react';
import { ScoreBlock } from '@/components/ScoreBlock';
import type { Analysis } from '@/lib/mockdata';
import { useBackendClient } from '@/hooks/useBackend';
import { CRITERIA_META } from '@/lib/data';

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

export function EvaluatePage() {
  const client = useBackendClient();
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Array<{ url: string; error: string }>>([]);
  const [results, setResults] = useState<{ combined?: Analysis; individual: Analysis[] } | null>(null);

  useEffect(() => {
    document.title = 'Evaluador de pruebas — AI WorkTrail';
  }, []);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = urls
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter((v) => /^https?:\/\//i.test(v))
      .slice(0, 8);
    if (list.length === 0) {
      setError('Pega al menos una URL válida (http/https).');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setFailedUrls([]);

    try {
      const { data, error: invokeError } = await client.functions.invoke<LinksResponse>(
        'evaluate-links',
        { body: { urls: list } },
      );
      if (invokeError) {
        setError(invokeError.message);
        return;
      }
    const payload = data as LinksResponse;
    const failedUrlsList: Array<{ url: string; error: string }> = []
    const individual: Analysis[] = []
    let indIdx = 0
    for (const r of payload.results ?? []) {
      if (!r.ok) {
        failedUrlsList.push({ url: r.url, error: r.error ?? 'Error desconocido' })
      } else if (r.breakdown) {
        individual.push(toAnalysis(r, `ind-${indIdx++}`))
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
    <main className="page-fade" style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Evaluador de pruebas
        </h1>
        <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
          Pega URLs para calificar cada chat por separado y todos combinados. No se guarda nada.
        </p>
      </div>

      {/* Input */}
      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: 20,
          marginBottom: 32,
          background: '#FAFBFC',
        }}
      >
        <form onSubmit={handleEvaluate}>
          <label htmlFor="chat-urls" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>
            URLs de chats (hasta 8, una por línea)
          </label>
          <textarea
            id="chat-urls"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={'https://share.gemini.google/...\nhttps://gemini.google.com/share/d/...'}
            style={{
              width: '100%',
              minHeight: 100,
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 13,
              fontFamily: 'IBM Plex Mono, monospace',
              color: '#0F172A',
              background: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#0077CC'; e.currentTarget.style.boxShadow = '0 0 0 3px #E0F2FE'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              disabled={loading || !urls.trim()}
              style={{
                height: 38,
                background: loading ? '#64748B' : '#0077CC',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                fontWeight: 600,
                fontSize: 14,
                padding: '0 18px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 150ms ease-out',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#0066B3'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#0077CC'; }}
            >
              {loading ? 'Evaluando...' : 'Evaluar'}
            </button>
            {loading && (
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Procesando chats...
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Results */}
      {error && (
        <div style={{ marginBottom: 24, padding: '10px 14px', background: '#FBEDEB', borderLeft: '3px solid #B3372F', borderRadius: 4, fontSize: 13, color: '#0F172A' }}>
          {error}
        </div>
      )}

      {failedUrls.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>URLs no procesadas</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {failedUrls.map((f, fi) => (
              <div key={fi} style={{ padding: '10px 14px', background: '#FBF3E7', borderLeft: '3px solid #B45309', borderRadius: 4, fontSize: 13 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#B45309' }}>{f.url}</span>
                <div style={{ marginTop: 4, color: '#0F172A' }}>{f.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div>
          {/* Combined */}
          {results.combined && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>Combinado</h2>
                <span
                  style={{
                    background: '#E0F2FE',
                    color: '#0077CC',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid #93C5FD',
                  }}
                >
                  Análisis conjunto
                </span>
              </div>
              <div style={{ border: '2px solid #0077CC', borderRadius: 8, padding: 0 }}>
                <ScoreBlock
                  analysis={results.combined}
                  storageKey="evaluate-combined"
                />
              </div>
            </div>
          )}

          {/* Individual */}
          {results.individual.length > 0 && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>
                Chats individuales
              </h2>
              {results.individual.map((a, i) => (
                <ScoreBlock
                  key={a.id}
                  analysis={a}
                  storageKey={`evaluate-individual-${i}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div
          style={{
            border: '1px dashed #E2E8F0',
            borderRadius: 8,
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: '#334155', fontWeight: 500, margin: 0 }}>
            Pega URLs arriba y presiona "Evaluar"
          </p>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Los resultados aparecerán aquí sin guardarse.
          </p>
        </div>
      )}
    </main>
  );
}
