import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Analysis } from '@/lib/mockdata';

interface ScoreBlockProps {
  analysis: Analysis;
  studentName?: string;
  storageKey?: string;
}

function ratingTone(rating: number): { label: string; color: string; bg: string } {
  if (rating <= 40) return { label: 'Bajo', color: '#B3372F', bg: '#FBEDEB' };
  if (rating <= 70) return { label: 'Regular', color: '#B45309', bg: '#FBF3E7' };
  return { label: 'Excelente', color: '#1F7A4D', bg: '#E8F4EE' };
}

export function ScoreBlock({ analysis }: ScoreBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const criteria = analysis.criteria;
  const current = criteria[currentIndex] ?? criteria[0];
  const currentTone = ratingTone(current.rating);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : criteria.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < criteria.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-[#1F7A4D]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F7A4D]">
              Fortalezas
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-[#0F172A]">
            {analysis.strengths.map((s, i) => (
              <li key={`str-${i}`} className="flex items-start gap-2 leading-relaxed">
                <span className="text-[#1F7A4D] font-bold select-none">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-[#B45309]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
              Puntos a mejorar
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-[#0F172A]">
            {analysis.improvements.map((s, i) => (
              <li key={`imp-${i}`} className="flex items-start gap-2 leading-relaxed">
                <span className="text-[#B45309] font-bold select-none">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EEF1F6] bg-[#FAFBFC] px-4 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-hide">
            {criteria.map((c, i) => {
              const isActive = i === currentIndex;
              const tone = ratingTone(c.rating);
              const isWarning = c.rating <= 40;
              const isMedium = c.rating > 40 && c.rating <= 70;

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#0F172A] shadow-2xs border border-[#CBD5E1]'
                      : isWarning
                      ? 'bg-[#FBEDEB]/60 text-[#B3372F] hover:bg-[#FBEDEB]'
                      : isMedium
                      ? 'bg-[#FBF3E7]/60 text-[#B45309] hover:bg-[#FBF3E7]'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EEF1F6]'
                  }`}
                >
                  <span
                    className={`size-2 rounded-full shrink-0 ${
                      isWarning ? 'animate-pulse' : ''
                    }`}
                    style={{ background: tone.color }}
                  />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0 pl-2">
            <button
              type="button"
              onClick={handlePrev}
              className="flex size-7 items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F0F3F8] hover:text-[#0F172A] shadow-2xs transition-colors"
              aria-label="Anterior criterio"
              title="Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex size-7 items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F0F3F8] hover:text-[#0F172A] shadow-2xs transition-colors"
              aria-label="Siguiente criterio"
              title="Siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">
                {current.name}
              </h4>
              <span className="text-[11px] text-[#94A3B8] font-mono">
                Peso en la tarea: {current.weight}%
              </span>
            </div>

            <span
              style={{ background: currentTone.bg, color: currentTone.color }}
              className="font-mono text-xs font-bold px-2.5 py-1 rounded-md"
            >
              {currentTone.label} · {current.rating}/100
            </span>
          </div>

          <div className="space-y-1.5">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Justificación
            </h5>
            <p className="text-xs text-[#334155] leading-relaxed">
              {current.explanation}
            </p>
          </div>

          {current.evidence.length > 0 && (
            <div className="border-t border-[#EEF1F6] pt-3 space-y-2">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Citas en la conversación
              </h5>
              <div className="flex flex-wrap gap-2">
                {current.evidence.map((ev, i) => (
                  <button
                    key={`ev-${currentIndex}-${i}`}
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('awt:focus-prompt', {
                          detail: { chat: ev.chat, message: ev.message },
                        }),
                      );
                    }}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFC] px-3 py-1.5 text-left text-xs transition-colors hover:border-[#0077CC] hover:bg-[#F0F8FF]"
                    title="Clic para enfocar este prompt en el chat"
                  >
                    <span className="italic max-w-[260px] sm:max-w-[380px] truncate text-[#0F172A]">
                      "{ev.quote}"
                    </span>
                    <span className="font-semibold text-[#0077CC] text-[10px] shrink-0">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}