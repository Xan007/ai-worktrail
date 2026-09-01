import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Quote,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

const LIVE_STREAM_SAMPLES = [
  {
    student: 'Valeria Gómez',
    task: 'Algoritmos y Estructuras',
    platform: 'Claude 3.5',
    logo: '/logos/claude.svg',
    score: 95,
    tag: 'Pensamiento crítico activo',
    tagColor: 'text-[#1F7A4D] bg-[#E8F4EE]',
    barColor: 'bg-[#1F7A4D]',
    promptQuote: 'No me des el código aún. Explícame cómo evitar la recursión infinita en este caso...',
    reason: 'Usa la IA como tutor conceptual sin delegar la autoría del código.',
  },
  {
    student: 'Santiago Ramos',
    task: 'Arquitectura de Software',
    platform: 'Gemini 1.5 Pro',
    logo: '/logos/gemini.svg',
    score: 84,
    tag: 'Indagación y contraste',
    tagColor: 'text-[#1F7A4D] bg-[#E8F4EE]',
    barColor: 'bg-[#1F7A4D]',
    promptQuote: 'Compara estos dos patrones de diseño para microservicios y dime pros/contras...',
    reason: 'Valida alternativas de arquitectura y toma la decisión final.',
  },
  {
    student: 'Andrés Morales',
    task: 'Bases de Datos',
    platform: 'ChatGPT 4o',
    logo: '/logos/chatgpt.svg',
    score: 35,
    tag: 'Delegación directa',
    tagColor: 'text-[#B3372F] bg-[#FBEDEB]',
    barColor: 'bg-[#B3372F]',
    promptQuote: 'Hazme todo el script SQL con los inserts y tablas ya listo para entregar.',
    reason: 'Cero preguntas de validación. Copia íntegra de la respuesta.',
  },
];

const PLATFORMS = [
  { name: 'ChatGPT', logo: '/logos/chatgpt.svg' },
  { name: 'Claude', logo: '/logos/claude.svg' },
  { name: 'Gemini', logo: '/logos/gemini.svg' },
];

const THREE_STEPS = [
  {
    num: '01',
    title: 'Entrega por enlace',
    desc: 'Los estudiantes pegan el enlace de su chat con ChatGPT, Claude o Gemini.',
  },
  {
    num: '02',
    title: 'Extracción del proceso',
    desc: 'El sistema procesa toda la secuencia cronológica de preguntas y respuestas.',
  },
  {
    num: '03',
    title: 'Calificación con evidencia',
    desc: 'Genera la nota sobre 100 con la justificación y citas de cada mensaje clave.',
  },
];

export function LandingPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    document.title = 'AI WorkTrail — Evaluación de IA basada en evidencia';
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LIVE_STREAM_SAMPLES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentItem = LIVE_STREAM_SAMPLES[activeIndex];

  return (
    <div className="relative w-full flex flex-col min-h-screen bg-[#FAFBFC] overflow-x-hidden selection:bg-[#0077CC]/15 selection:text-[#0077CC]">
      {/* Fondo con brillo ambiental interactivo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(0,119,204,0.12),rgba(255,255,255,0))] -z-10" />

      {/* 1. HERO VIVO & CONCISO */}
      <section className="relative w-full pt-14 pb-16 lg:pt-20 lg:pb-24">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Mensaje Principal */}
            <div className="space-y-6 lg:col-span-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0077CC]/20 bg-white px-4 py-1.5 text-xs font-semibold text-[#0077CC] shadow-2xs">
                <Sparkles size={14} className="text-[#0077CC]" />
                <span>Evaluación de IA para Educación Superior</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-[54px] leading-[1.12]">
                Evalúa cómo <span className="text-[#0077CC]">usan la IA</span>, no solo qué entregan.
              </h1>

              <p className="text-base text-[#475569] sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                Pega el enlace de la conversación. Obtén la nota y la justificación exacta basada en cada mensaje que el estudiante envió a la IA.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
                <Link
                  to="/onboarding"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0077CC] px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#0066B3] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Comenzar como docente
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/dev/evaluate"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-6 py-3.5 text-sm font-semibold text-[#0F172A] transition-all hover:border-[#0077CC] hover:text-[#0077CC] shadow-2xs hover:scale-[1.02]"
                >
                  Probar evaluador
                </Link>
              </div>

              {/* Compatibilidad */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-sm text-[#64748B]">
                <span className="font-medium">Compatible con:</span>
                <div className="flex items-center gap-2">
                  {PLATFORMS.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] shadow-2xs"
                    >
                      <img src={p.logo} alt={p.name} className="size-4 object-contain" />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulación de Entrega Evaluada */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl border border-[#CBD5E1]/90 bg-white p-6 shadow-xl transition-all">
                {/* Selector */}
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    {LIVE_STREAM_SAMPLES.map((s, idx) => (
                      <button
                        key={s.student}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          activeIndex === idx ? 'w-10 bg-[#0077CC]' : 'w-2.5 bg-[#E2E8F0] hover:bg-[#CBD5E1]'
                        }`}
                        title={s.student}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#64748B]">
                    Vista de entrega evaluada
                  </span>
                </div>

                {/* Tarjeta de Calificación */}
                <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFC] p-5 space-y-4 transition-all duration-300">
                  {/* Encabezado del alumno y plataforma */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-[#E2E8F0] shadow-2xs">
                        <img src={currentItem.logo} alt={currentItem.platform} className="size-5 object-contain" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[#0F172A]">{currentItem.student}</h2>
                        <span className="text-xs text-[#64748B]">{currentItem.task}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${currentItem.tagColor}`}>
                        {currentItem.tag}
                      </span>
                      <span
                        style={{
                          color:
                            currentItem.score >= 80
                              ? '#1F7A4D'
                              : currentItem.score >= 60
                              ? '#B45309'
                              : '#B3372F',
                        }}
                        className="font-mono text-2xl font-black leading-none"
                      >
                        {currentItem.score}
                        <span className="text-xs font-normal text-[#94A3B8]">/100</span>
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                    <div
                      className={`h-full ${currentItem.barColor} transition-all duration-700 ease-out`}
                      style={{ width: `${currentItem.score}%` }}
                    />
                  </div>

                  {/* Cita del prompt */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      Prompt analizado:
                    </span>
                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5 text-xs text-[#0F172A] font-mono leading-relaxed shadow-2xs">
                      "{currentItem.promptQuote}"
                    </div>
                  </div>

                  {/* Razón */}
                  <div className="space-y-1 border-t border-[#EEF1F6] pt-3 text-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Justificación pedagógica:
                    </span>
                    <p className="text-xs text-[#334155] leading-relaxed">{currentItem.reason}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CÓMO FUNCIONA — 3 PASOS SIMPLES */}
      <section className="w-full py-20 border-t border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="max-w-xl mx-auto text-center mb-14 space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
              Tres pasos. Cero complicaciones.
            </h2>
            <p className="text-sm text-[#64748B]">
              Sin instalar plugins, sin extensiones y sin configurar prompts complicados.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {THREE_STEPS.map((step) => (
              <div
                key={step.num}
                className="group relative rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] p-8 transition-all hover:bg-white hover:border-[#0077CC]/40 hover:shadow-md space-y-3"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#0077CC] font-mono text-sm font-bold text-white shadow-2xs group-hover:scale-105 transition-transform">
                  {step.num}
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">{step.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CTA DIRECTO */}
      <section className="w-full py-20 bg-[#FAFBFC]">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="rounded-3xl border border-[#0077CC]/20 bg-gradient-to-r from-[#E0F2FE] via-white to-[#E0F2FE] p-10 sm:p-14 text-center space-y-6 shadow-xs">
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
              Comienza a evaluar en tu curso hoy
            </h2>
            <p className="text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
              Únete a docentes universitarios que ya evalúan con evidencia real y transparente.
            </p>
            <div>
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0077CC] px-8 py-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#0066B3] hover:scale-[1.02] active:scale-[0.98]"
              >
                Crear cuenta docente
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Edge-to-Edge */}
      <Footer />
    </div>
  );
}

