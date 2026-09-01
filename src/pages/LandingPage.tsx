import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Layers,
  Link2,
  MessageSquare,
  Quote,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

const SAMPLE_DEMO_TABS = [
  {
    id: 'gemini',
    name: 'Gemini',
    logo: '/logos/gemini.svg',
    prompt: '¿Cómo puedo estructurar la arquitectura de microservicios para este problema?',
    response: 'Te sugiero separar el servicio de pedidos del de pagos usando eventos con RabbitMQ...',
    score: 88,
    profile: 'Conductor Crítico',
    profileColor: '#1F7A4D',
    profileBg: '#E8F4EE',
    strength: 'Planteó la solución conceptual previa y usó la IA para contrastar decisiones de desacoplamiento.',
    recommendation: 'Profundizar en la justificación de tolerancia a fallos.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    logo: '/logos/chatgpt.svg',
    prompt: 'Hazme todo el código completo del ejercicio sin errores y que compile a la primera.',
    response: 'Claro, aquí tienes el código completo de la tarea...',
    score: 32,
    profile: 'Pasajero Productivo',
    profileColor: '#B3372F',
    profileBg: '#FBEDEB',
    strength: 'Verificó la sintaxis del lenguaje generado.',
    recommendation: 'Falta autoría intelectual y cuestionamiento de las respuestas obtenidas.',
  },
  {
    id: 'claude',
    name: 'Claude',
    logo: '/logos/claude.svg',
    prompt: 'Explícame por qué este algoritmo O(n²) fallaría con 100k registros y qué alternativas tengo.',
    response: 'El problema radica en la complejidad cuadrática en el bucle anidado...',
    score: 94,
    profile: 'Maratonista Mental',
    profileColor: '#1F7A4D',
    profileBg: '#E8F4EE',
    strength: 'Usó la IA como tutor socrático para entender la causa raíz del rendimiento.',
    recommendation: 'Excelente nivel de indagación y pensamiento crítico.',
  },
];

const VALUE_PILLARS = [
  {
    icon: Link2,
    title: 'Entrega por enlace directo',
    description: 'Los estudiantes pegan el enlace público de su conversación. Sin capturas alterables ni textos copiados.',
  },
  {
    icon: Sparkles,
    title: 'Análisis pedagógico instantáneo',
    description: 'El modelo evalúa autoría, pensamiento crítico y uso tutorial en segundos mediante rúbricas objetivas.',
  },
  {
    icon: Quote,
    title: 'Evidencia verificable mensaje a mensaje',
    description: 'Cada conclusión viene respaldada por las citas exactas de los mensajes enviados a la IA.',
  },
];

export function LandingPage() {
  const [activeDemo, setActiveDemo] = useState(SAMPLE_DEMO_TABS[0]);

  useEffect(() => {
    document.title = 'AI WorkTrail — Evaluación pedagógica del uso de IA';
  }, []);

  return (
    <div className="w-full flex flex-col min-h-screen bg-white">
      {/* 1. HERO SECTION */}
      <section className="relative w-full overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFD] via-white to-white">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Copy */}
            <div className="space-y-6 lg:col-span-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0077CC]/20 bg-[#E0F2FE]/60 px-3 py-1 text-xs font-semibold text-[#0077CC]">
                <Sparkles size={13} className="text-[#0077CC]" />
                <span>Evaluación de IA para Educación Superior</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-[52px] leading-[1.12]">
                Evalúa cómo <span className="text-[#0077CC]">piensan</span> con la IA, no solo qué entregan.
              </h1>

              <p className="text-base text-[#475569] sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                La primera plataforma universitaria que analiza el proceso conversacional con ChatGPT, Claude y Gemini para calificar pensamiento crítico y autoría real.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/onboarding"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#0077CC] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0066B3] hover:shadow-md active:scale-95"
                >
                  Comenzar como docente
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/dev/evaluate"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#0F172A] transition-all hover:border-[#0077CC] hover:text-[#0077CC] shadow-2xs"
                >
                  Probar evaluador libre
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  <span>Sin capturas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  <span>Sin detectores falsos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  <span>100% con evidencia</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Simulator Demo */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-xl transition-all">
                {/* Platform Selector Bar */}
                <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-2.5 bg-[#FAFBFC] rounded-t-xl">
                  <div className="flex items-center gap-1.5">
                    {SAMPLE_DEMO_TABS.map((tab) => {
                      const isSelected = activeDemo.id === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDemo(tab)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-white text-[#0F172A] shadow-2xs border border-[#E2E8F0]'
                              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EEF1F6]'
                          }`}
                        >
                          <img src={tab.logo} alt={tab.name} className="size-3.5 object-contain" />
                          <span>{tab.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-[11px] font-mono font-bold text-[#64748B]">
                    Simulación interactiva
                  </span>
                </div>

                {/* Demo Card Body */}
                <div className="p-5 space-y-4">
                  {/* Prompt Fragment */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                      Prompt del estudiante analizado
                    </span>
                    <div className="rounded-lg border border-[#EEF1F6] bg-[#F8FAFD] p-3 text-xs text-[#0F172A] font-mono leading-relaxed">
                      "{activeDemo.prompt}"
                    </div>
                  </div>

                  {/* Diagnosis Row */}
                  <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Perfil detectado
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          style={{ background: activeDemo.profileBg, color: activeDemo.profileColor }}
                          className="font-bold text-xs px-2 py-0.5 rounded-md"
                        >
                          {activeDemo.profile}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                        Calificación
                      </span>
                      <span
                        style={{ color: activeDemo.profileColor }}
                        className="font-mono text-xl font-bold leading-none"
                      >
                        {activeDemo.score}
                        <span className="text-xs text-[#94A3B8]">/100</span>
                      </span>
                    </div>
                  </div>

                  {/* Feedback summary */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-[#1F7A4D]">
                      <span className="font-bold shrink-0">•</span>
                      <span className="text-[#334155]">{activeDemo.strength}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[#B45309]">
                      <span className="font-bold shrink-0">•</span>
                      <span className="text-[#334155]">{activeDemo.recommendation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PILLARS / HOW IT WORKS */}
      <section className="w-full py-20 border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-14">
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
              Cero suposiciones. Evaluación basada en evidencia real.
            </h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Diseñado para responder con precisión la pregunta que todo docente se hace hoy: ¿Cómo utilizó el estudiante la IA para llegar a este resultado?
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {VALUE_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="group rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] p-8 transition-all duration-300 hover:border-[#0077CC]/40 hover:bg-white hover:shadow-md"
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0077CC] transition-transform group-hover:scale-110">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A] mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. FOR DOCENTS & INSTITUTIONS */}
      <section className="w-full py-20 bg-[#FAFBFC] border-b border-[#E2E8F0]">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Docentes */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 sm:p-10 shadow-2xs space-y-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0077CC]">
                <GraduationCap size={22} />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A]">
                Para Docentes Universitarios
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Ahorra horas de corrección con retroalimentación automática y justificada. Transforma la entrega de tareas en una oportunidad formativa de pensamiento crítico.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#334155]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#1F7A4D]" />
                  <span>Rúbrica de 5 dimensiones calibrada</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#1F7A4D]" />
                  <span>Calificación masiva en 1 clic</span>
                </li>
              </ul>
            </div>

            {/* Instituciones */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 sm:p-10 shadow-2xs space-y-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0077CC]">
                <Building2 size={22} />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A]">
                Para Instituciones Educativas
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Establece políticas institucionales de IA basadas en evidencia transparente. Integra analíticas de integridad académica y nivel de adopción por carrera.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#334155]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#1F7A4D]" />
                  <span>Compatibilidad con ChatGPT, Claude y Gemini</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#1F7A4D]" />
                  <span>Privacidad y cumplimiento académico</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FINAL CTA BANNER */}
      <section className="w-full py-20 bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-6">
          <div className="rounded-3xl border border-[#0077CC]/20 bg-gradient-to-r from-[#E0F2FE] via-[#F0F8FF] to-[#E0F2FE] p-10 sm:p-16 text-center space-y-6 shadow-sm">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-[#0077CC] shadow-2xs">
              <Bot size={24} />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
                Comienza a evaluar con evidencia hoy mismo
              </h2>
              <p className="text-xs sm:text-sm text-[#475569]">
                Crea tu primer curso en segundos y recibe entregas verificadas con IA.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0077CC] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0066B3] hover:shadow-md active:scale-95"
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

