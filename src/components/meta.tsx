import type { ReactNode } from 'react';
import { Feather, Globe, MessageCircle, Sparkles } from 'lucide-react';
import { submissionStatus } from '@/lib/submission-status';

export type Platform = 'gemini' | 'chatgpt' | 'claude' | 'other' | string;

interface PlatformMeta {
  label: string;
  logo: string;
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  gemini: { label: 'Gemini', logo: '/logos/gemini.svg' },
  chatgpt: { label: 'ChatGPT', logo: '/logos/chatgpt.svg' },
  claude: { label: 'Claude', logo: '/logos/claude.svg' },
  other: { label: 'Otro', logo: '' },
};

export function PlatformChip({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.other;
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-[#E2E8F0] bg-white p-1 shadow-2xs"
      title={meta.label}
    >
      {meta.logo ? (
        <img src={meta.logo} alt={meta.label} className="size-3.5 object-contain" />
      ) : (
        <Globe size={13} className="text-[#64748B]" />
      )}
    </span>
  );
}

// Estados de entrega delegados a @/lib/submission-status (evita export no-componente en archivo de componentes)

export function StatusChip({ analysis }: { analysis: { score: number | null; flagged: boolean } | null | undefined }) {
  if (!analysis || analysis.score == null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#FAFBFC] px-2 py-0.5 text-[11px] font-medium text-[#64748B]">
        <span className="size-1.5 rounded-full bg-[#94A3B8]" />
        Sin evaluar
      </span>
    );
  }

  const isLow = analysis.score < 60 || analysis.flagged;
  const isMid = analysis.score >= 60 && analysis.score < 80;

  const color = isLow ? '#B3372F' : isMid ? '#B45309' : '#1F7A4D';
  const bg = isLow ? '#FBEDEB' : isMid ? '#FBF3E7' : '#E8F4EE';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
      style={{ background: bg, color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {Math.round(analysis.score)}/100
      {analysis.flagged && <span className="ml-0.5 text-[10px] font-sans font-semibold">⚠️</span>}
    </span>
  );
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

const BADGE_TONES: Record<BadgeTone, { color: string; bg: string }> = {
  neutral: { color: '#334155', bg: '#F0F3F8' },
  success: { color: '#1F7A4D', bg: '#E8F4EE' },
  warning: { color: '#B45309', bg: '#FBF3E7' },
  danger: { color: '#B3372F', bg: '#FBEDEB' },
};

function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const t = BADGE_TONES[tone];
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold" style={{ background: t.bg, color: t.color }}>
      {children}
    </span>
  );
}