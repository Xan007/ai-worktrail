import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Quote } from 'lucide-react';
import type { Analysis, Criterion } from '@/lib/mockdata';

interface ScoreBlockProps {
  analysis: Analysis;
  studentName?: string;
  storageKey?: string;
}

function ratingTone(rating: number): { color: string; bg: string; barBg: string } {
  if (rating <= 33) return { color: '#B3372F', bg: '#FBEDEB', barBg: 'bg-[#B3372F]' };
  if (rating <= 66) return { color: '#B45309', bg: '#FBF3E7', barBg: 'bg-[#B45309]' };
  return { color: '#1F7A4D', bg: '#E8F4EE', barBg: 'bg-[#1F7A4D]' };
}

function CriterionAccordion({ criterion }: { criterion: Criterion }) {
  const [open, setOpen] = useState(false);
  const tone = ratingTone(criterion.rating);
  const earned = Math.round((criterion.rating * criterion.weight) / 100);

  return (
    <div className="border-b border-[#EEF1F6] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-[#F8FAFD] sm:flex-row sm:items-center ${
          open ? 'bg-[#FAFBFC]' : 'bg-white'
        }`}
      >
        <div className="flex flex-1 items-center justify-between min-w-0 gap-3">
          <span className="truncate text-sm font-semibold text-[#1A2332]">
            {criterion.name}
          </span>
          <span className="font-mono text-xs text-[#8B95A5] shrink-0">
            Peso: {criterion.weight}%
          </span>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Barra de progreso horizontal del criterio */}
          <div className="h-2 w-32 overflow-hidden rounded-full bg-[#E5EAF1] shrink-0">
            <div
              className={`h-full ${tone.barBg} transition-[width] duration-300`}
              style={{ width: `${criterion.rating}%` }}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              style={{ color: tone.color }}
              className="font-mono text-xs font-bold min-w-[42px] text-right"
            >
              {earned}/{criterion.weight}
            </span>
            {open ? <ChevronUp size={16} className="text-[#8B95A5]" /> : <ChevronDown size={16} className="text-[#8B95A5]" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#EEF1F6] bg-[#FAFBFC] px-5 py-4 space-y-3">
          <p className="text-xs italic text-[#4A5568]">
            {criterion.band.description}
          </p>
          <p className="text-sm text-[#1A2332] leading-relaxed">
            {criterion.explanation}
          </p>
          {criterion.evidence.length > 0 && (
            <div className="space-y-2 pt-1">
              {criterion.evidence.map((ev) => (
                <div
                  key={`ev-${ev.chat}-${ev.message}-${ev.quote.slice(0, 30)}`}
                  className="flex items-start gap-2.5 rounded-lg border border-[#EEF1F6] bg-white p-3 shadow-2xs"
                >
                  <Quote size={14} className="text-[#8B95A5] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="inline-block rounded border border-[#D9E0EA] bg-[#F6F8FB] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8B95A5]">
                      Chat {ev.chat} · M{ev.message}
                    </span>
                    <p className="text-xs text-[#1A2332] leading-relaxed">"{ev.quote}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ScoreBlock({ analysis }: ScoreBlockProps) {
  return (
    <div className="space-y-6">
      {/* 3. Resumen de evaluación con borde de acento a la izquierda */}
      <div className="rounded-xl border border-[#D9E0EA] border-l-4 border-l-[#1E5AA8] bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E5AA8] mb-1">
          Resumen de evaluación
        </h3>
        <p className="text-sm text-[#1A2332] leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {/* 4. Desglose por criterio */}
      <div className="overflow-hidden rounded-xl border border-[#D9E0EA] bg-white shadow-xs">
        <div className="border-b border-[#EEF1F6] bg-[#F8FAFD] px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B95A5]">
            Desglose por criterio
          </h3>
        </div>
        <div>
          {analysis.criteria.map((criterion) => (
            <CriterionAccordion key={criterion.key} criterion={criterion} />
          ))}
        </div>
      </div>

      {/* 5. Fortalezas y Para mejorar con íconos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Fortalezas */}
        <div className="rounded-xl border border-[#D9E0EA] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#1F7A4D]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F7A4D]">
              Fortalezas
            </h4>
          </div>
          <ul className="space-y-2">
            {analysis.strengths.map((s) => (
              <li key={`strength-${s.slice(0, 40)}`} className="flex items-start gap-2 text-xs text-[#1A2332] leading-relaxed">
                <CheckCircle2 size={14} className="text-[#1F7A4D] shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Para mejorar */}
        <div className="rounded-xl border border-[#D9E0EA] bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-[#B45309]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
              Para mejorar
            </h4>
          </div>
          <ul className="space-y-2">
            {analysis.improvements.map((s) => (
              <li key={`improvement-${s.slice(0, 40)}`} className="flex items-start gap-2 text-xs text-[#1A2332] leading-relaxed">
                <Lightbulb size={14} className="text-[#B45309] shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}