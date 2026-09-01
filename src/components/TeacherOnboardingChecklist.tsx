import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';

interface TeacherOnboardingChecklistProps {
  loading?: boolean;
  currentStep: 'course' | 'invite' | 'task' | null;
  completedCount: number;
  onDismiss: () => void;
}

const STEP_LABELS = {
  course: 'Crear curso',
  invite: 'Invitar estudiantes',
  task: 'Crear tarea',
} as const;

const STEP_HINTS = {
  course: 'Define nombre y modo de inscripción',
  invite: 'Comparte el código de clase',
  task: 'Define qué deben entregar',
} as const;

export function TeacherOnboardingChecklist({
  loading = false,
  currentStep,
  completedCount,
  onDismiss,
}: TeacherOnboardingChecklistProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) return null;
  if (!currentStep) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Collapsed pill */}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 shadow-md transition-all hover:shadow-lg"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-[#0077CC] text-[10px] font-bold text-white">
            {completedCount + 1}
          </span>
          <span className="text-xs font-medium text-[#334155]">Primeros pasos</span>
          <ChevronUp size={12} className="text-[#94A3B8]" />
        </button>
      )}

      {/* Expanded card */}
      {expanded && (
        <div className="w-[240px] rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-lg">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#0077CC] text-[10px] font-bold text-white">
                {completedCount + 1}
              </span>
              <span className="text-xs font-bold text-[#0F172A]">Primeros pasos</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-[#94A3B8] transition-colors hover:text-[#64748B]"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Progress */}
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              className="h-full rounded-full bg-[#0077CC] transition-all duration-300"
              style={{ width: `${(completedCount / 3) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {(['course', 'invite', 'task'] as const).map((step, i) => {
              const done = i < completedCount;
              const isCurrent = step === currentStep;
              return (
                <div
                  key={step}
                  className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 ${
                    isCurrent ? 'bg-[#F0F7FF]' : ''
                  }`}
                >
                  {done ? (
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#1F7A4D]">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </span>
                  ) : (
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${
                        isCurrent ? 'bg-[#0077CC]' : 'bg-[#E2E8F0]'
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <span
                      className={`block text-[11px] ${
                        done
                          ? 'text-[#94A3B8] line-through'
                          : isCurrent
                            ? 'font-semibold text-[#0F172A]'
                            : 'text-[#94A3B8]'
                      }`}
                    >
                      {STEP_LABELS[step]}
                    </span>
                    {isCurrent && (
                      <span className="block text-[10px] text-[#64748B]">
                        {STEP_HINTS[step]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2.5 w-full rounded-md py-1 text-center text-[10px] text-[#CBD5E1] transition-colors hover:bg-[#F8FAFC] hover:text-[#94A3B8]"
          >
            Ocultar
          </button>
        </div>
      )}
    </div>
  );
}
