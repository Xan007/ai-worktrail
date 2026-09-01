import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Quote,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

const COMPARISON_CASES = [
  {
    id: 'deep-thinking',
    tabName: 'Uso con pensamiento crítico',
    badge: 'Excelente',
    badgeColor: 'text-[#1F7A4D]',
    badgeBg: 'bg-[#E8F4EE]',
    score: 92,
    scoreColor: '#1F7A4D',
    platform: 'Claude 3.5 Sonnet',
    logo: '/logos/claude.svg',
    studentPrompt: 'Tengo este cuello de botella en la base de datos (adjunto query). No me des el código optimizado aún, dime qué índices debería considerar y por qué.',
    justification: 'El estudiante lideró la resolución del problema y utilizó la IA como un tutor socrático para validar conceptos antes de implementar.',
    strengths: [
      'Autoría intelectual clara del planteamiento.',
      'Cuestionamiento activo de las alternativas de indexación.',
    ],
  },
  {
    id: 'copy-paste',
    tabName: 'Delegación sin cuestionamiento',
    badge: 'Bajo',
    badgeColor: 'text-[#B3372F]',
    badgeBg: 'bg-[#FBEDEB]',
    score: 30,
    scoreColor: '#B3372F',
    platform: 'ChatGPT 4o',
    logo: '/logos/chatgpt.svg',
    studentPrompt: 'Resuélveme este taller completo con la introducción, desarrollo y conclusión para copiar y pegar.',
    justification: 'No existe autoría ni proceso reflexivo. El estudiante delegó el 100% de la carga cognitiva a la herramienta.',
    strengths: [
      'Identificó el enunciado correcto del taller.',
    ],
    improvements: [
      'Sin pensamiento crítico ni validación de fuentes.',
      'Nula agencia en la producción de la solución.',
    ],
  },
];

const EVALUATION_PILLARS = [
  {
    title: 'Autoría del trabajo',
    weight: '30%',
    summary: 'Identifica si la solución fue concebida por el estudiante o si solo copió la respuesta generada.',
  },
  {
    title: 'Compromiso crítico',
    weight: '25%',
    summary: 'Mide cómo cuestiona, contrasta y profundiza en las respuestas de la IA en lugar de aceptarlas a ciegas.',
  },
  {
    title: 'IA como tutor',
    weight: '20%',
    summary: 'Premia el uso para aclarar dudas y aprender frente al uso para saltarse el esfuerzo mental.',
  },
  {
    title: 'Integración y voz propia',
    weight: '15%',
    summary: 'Verifica que las ideas de la IA se hayan adaptado y sintetizado con el criterio del estudiante.',
  },
  {
    title: 'Conciencia del proceso',
    weight: '10%',
    summary: 'Evalúa la coherencia y evolución del hilo conversacional desde el planteamiento inicial.',
  },
];

export function LandingPage() {
  const [selectedCase, setSelectedCase] = useState(COMPARISON_CASES[0]);

  useEffect(() => {
    document.title = 'AI WorkTrail — Evaluación del uso de IA en tareas universitarias';
  }, []);

  return (
    <div className="relative w-full flex flex-col min-h-screen bg-white selection:bg-[#0077CC]/15 selection:text-[#0077CC]">
      {/* Background Gradient Mesh */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(0,119,204,0.12),rgba(255,255,255,0))] -z-10" />

      {/* 1. HERO SECTION */}
      <section className="relative w-full pt-14 pb-16 lg:pt-20 lg:pb-24">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Columna Izquierda: Mensaje y Propuesta de Valor */}
            <div className="space-y-6 lg:col-span-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-1 text-xs font-semibold text-[#0F172A] shadow-2xs">
                <span className="flex size-2 rounded-full bg-[#0077CC]" />
                <span>Para Docentes Universitarios</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-[50px] leading-[1.12]">
                Sabes qué entregaron. <br />
                <span className="text-[#0077CC]">Descubre cómo pensaron.</span>
              </h1>

              <p className="text-base text-[#475569] sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                Pega el enlace de la conversación con ChatGPT, Claude o Gemini. AI WorkTrail analiza el hilo completo y genera una <strong>calificación justificada con citas exactas</strong> de cada mensaje.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/onboarding"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#0077CC] px-6 py-3.5 text-sm font-semibold text-white shadow-2xs transition-all hover:bg-[#0066B3] hover:shadow-md active:scale-95"
                >
                  Crear cuenta docente
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/dev/evaluate"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-semibold text-[#0F172A] transition-all hover:border-[#0077CC] hover:text-[#0077CC] shadow-2xs"
                >
                  Probar con un enlace
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  <span>Sin detectores de texto falsos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  <span>Explicación transparente</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de Comparación Interactiva en Vivo */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-[#CBD5E1]/80 bg-white p-5 shadow-lg space-y-4">
                <div className="flex flex-col gap-2 border-b border-[#F1F5F9] pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Caso de estudio interactivo
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPARISON_CASES.map((c) => {
                      const isActive = selectedCase.id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCase(c)}
                          className={`rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-[#0F172A] text-white shadow-xs'
                              : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                          }`}
                        >
                          {c.tabName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tarjeta de Calificación y Explicación */}
                <div className="rounded-xl border border-[#EEF1F6] bg-[#FAFBFC] p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={selectedCase.logo} alt={selectedCase.platform} className="size-4 object-contain" />
                      <span className="text-xs font-semibold text-[#0F172A]">{selectedCase.platform}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${selectedCase.badgeBg} ${selectedCase.badgeColor}`}>
                        {selectedCase.badge}
                      </span>
                      <span
                        style={{ color: selectedCase.scoreColor }}
                        className="font-mono text-xl font-extrabold leading-none"
                      >
                        {selectedCase.score}
                        <span className="text-xs font-normal text-[#94A3B8]">/100</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                      Lo que escribió el estudiante:
                    </span>
                    <p className="rounded-lg border border-[#E2E8F0] bg-white p-2.5 text-xs text-[#0F172A] italic leading-relaxed">
                      "{selectedCase.studentPrompt}"
                    </p>
                  </div>

                  <div className="space-y-1 border-t border-[#EEF1F6] pt-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      ¿Por qué esta calificación?
                    </span>
                    <p className="text-xs text-[#334155] leading-relaxed">
                      {selectedCase.justification}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CÓMO SE CALIFICA — Las 5 dimensiones objetivas */}
      <section className="w-full py-20 border-t border-b border-[#E2E8F0] bg-[#FAFBFC]">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-14">
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
              Criterios pedagógicos transparentes
            </h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              En lugar de una "caja negra", cada entrega se evalúa sobre 5 dimensiones ponderadas con evidencia directa de los mensajes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVALUATION_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs transition-all hover:border-[#CBD5E1] hover:shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A]">{pillar.title}</h3>
                  <span className="font-mono text-xs font-bold text-[#0077CC] bg-[#E0F2FE] px-2 py-0.5 rounded">
                    {pillar.weight}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {pillar.summary}
                </p>
              </div>
            ))}

            <div className="flex flex-col justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-white/60 p-6 text-center space-y-2">
              <span className="text-xs font-bold text-[#0F172A]">100% de la nota fundamentada</span>
              <p className="text-xs text-[#64748B]">
                Cada punto asignado incluye la justificación y el enlace directo al mensaje que lo demuestra.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. EXPERIENCIA DOCENTE */}
      <section className="w-full py-20 bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="rounded-3xl border border-[#0077CC]/20 bg-gradient-to-br from-[#F0F8FF] via-white to-[#E0F2FE]/40 p-8 sm:p-14 shadow-sm">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-8 text-center lg:text-left">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-[#0077CC] text-white shadow-2xs">
                  <GraduationCap size={20} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
                  Ahorra horas evaluando tareas con IA
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed max-w-xl">
                  Crea tu curso, comparte el código con tus estudiantes y revisa entregas individuales o grupales en una sola vista centralizada.
                </p>
              </div>

              <div className="flex justify-center lg:justify-end lg:col-span-4">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0077CC] px-6 py-3.5 text-sm font-semibold text-white shadow-2xs transition-all hover:bg-[#0066B3] hover:shadow-md active:scale-95"
                >
                  Comenzar ahora gratis
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Edge-to-Edge */}
      <Footer />
    </div>
  );
}

