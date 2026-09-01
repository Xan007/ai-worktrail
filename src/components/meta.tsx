import type { ReactNode } from 'react';
import { Feather, Globe, MessageCircle, Sparkles } from 'lucide-react';
import { submissionStatus } from '@/lib/submission-status';

export type Platform = 'gemini' | 'chatgpt' | 'claude' | 'other' | string;

interface PlatformMeta {
  label: string;
  color: string;
  bg: string;
  icon: ReactNode;
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  gemini: { label: 'Gemini', color: '#6B4FB3', bg: '#F1EDFA', icon: <Sparkles size={13} /> },
  chatgpt: { label: 'ChatGPT', color: '#0E7A5F', bg: '#E6F5F0', icon: <MessageCircle size={13} /> },
  claude: { label: 'Claude', color: '#B4552D', bg: '#FBEEE9', icon: <Feather size={13} /> },
  other: { label: 'Otro', color: '#334155', bg: '#EEF1F6', icon: <Globe size={13} /> },
};

export function PlatformChip({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.other;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

// Estados de entrega delegados a @/lib/submission-status (evita export no-componente en archivo de componentes)

export function StatusChip({ analysis }: { analysis: { score: number | null; flagged: boolean } | null | undefined }) {
  const { meta, state } = submissionStatus(analysis);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium"
      style={{ background: meta.bg, color: meta.color }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: meta.strip }} />
      {state === 'pending' ? 'Sin evaluar' : meta.label}
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