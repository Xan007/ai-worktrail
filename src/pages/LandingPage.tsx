import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  FileCheck,
  GraduationCap,
  Lightbulb,
  MessageSquareCode,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

const STEPS = [
  {
    num: '01',
    title: 'Entrega de enlaces',
    desc: 'Los estudiantes comparten los enlaces de sus conversaciones con IA directamente en la plataforma. No hay capturas, no hay copia y pega.',
    icon: MessageSquareCode,
  },
  {
    num: '02',
    title: 'Evaluación con evidencia',
    desc: 'El sistema lee los chats y evalúa cinco criterios académicos, citando mensajes específicos como respaldo de cada puntuación.',
    icon: FileCheck,
  },
  {
    num: '03',
    title: 'Perfil y recomendaciones',
    desc: 'Cada entrega obtiene un perfil de uso de IA, un score de 0–100 y recomendaciones concretas para mejorar la agencia intelectual.',
    icon: Lightbulb,
  },
];

const CRITERIA = [
  { criterion: 'Autoría del trabajo', description: 'Quién produjo el contenido intelectual central', weight: '30%', percent: 30 },
  { criterion: 'Compromiso crítico', description: 'Cuánto cuestiona, contrasta y profundiza el estudiante', weight: '25%', percent: 25 },
  { criterion: 'IA como tutor', description: 'Si usa la IA para aprender o solo para obtener respuestas', weight: '20%', percent: 20 },
  { criterion: 'Integración y originalidad', description: 'Cómo integra los aportes de la IA con voz propia', weight: '15%', percent: 15 },
  { criterion: 'Conciencia del proceso', description: 'Reflexión sobre su propio proceso de uso de IA', weight: '10%', percent: 10 },
];

const MOCK_HERO_SUBMISSIONS = [
  { name: 'María Fernanda Ruiz', task: 'Process Landscape Model', score: 84, barColor: 'bg-[#1F7A4D]', scoreColor: 'text-[#1F7A4D]', badgeBg: 'bg-[#E8F4EE]', status: 'Maratonista mental' },
  { name: 'Carlos Eduardo Méndez', task: 'Value Stream Mapping', score: 62, barColor: 'bg-[#B45309]', scoreColor: 'text-[#B45309]', badgeBg: 'bg-[#FBF3E7]', status: 'Optimizador reacio' },
  { name: 'Alejandro Torres', task: 'Análisis AS-IS', score: 30, barColor: 'bg-[#B3372F]', scoreColor: 'text-[#B3372F]', badgeBg: 'bg-[#FBEDEB]', status: 'Pasajero productivo' },
];

export function LandingPage() {
  useEffect(() => {
    document.title = 'AI WorkTrail — Evalúa cómo piensan con la IA';
  }, []);

  return (
    <main className="page-fade bg-[#FAFBFC] min-h-screen flex flex-col justify-between">
      {/* 1. HERO - Layout de dos columnas */}
        <section className="relative overflow-hidden border-b border-[#D9E0EA] bg-white px-6 py-12 lg:py-20">
          <div className="mx-auto grid max-w-[1140px] items-center gap-12 lg:grid-cols-12">
            {/* Columna Izquierda: Mensaje y CTAs */}
            <div className="space-y-6 lg:col-span-7">
              {/* Título principal */}
              <h1 className="text-3xl font-bold tracking-tight text-[#1A2332] sm:text-4xl lg:text-5xl leading-[1.15]">
                Evalúa cómo piensan con la IA, no solo qué entregan.
              </h1>

              {/* Subtítulo */}
              <p className="text-base text-[#4A5568] sm:text-lg leading-relaxed">
                Una plataforma para docentes universitarios que evalúa el uso real de la inteligencia artificial en el trabajo académico, con evidencia verificable y criterios claros.
              </p>

              {/* Botones CTA */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 rounded-md bg-[#1E5AA8] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#174A8C] shadow-xs"
                >
                  Comenzar ahora
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center gap-2 rounded-md border border-[#D9E0EA] bg-white px-5 py-3 text-sm font-semibold text-[#1A2332] transition-colors hover:border-[#1E5AA8] hover:text-[#1E5AA8]"
                >
                  Ver cómo funciona
                </a>
              </div>

              {/* Bullets de confianza */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-4 border-t border-[#EEF1F6] text-xs font-medium text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  Sin capturas de pantalla
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  Sin copiar y pegar
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1F7A4D]" />
                  100% basado en evidencia
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta con lista en vivo de "Entregas recientes" */}
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-xl border border-[#D9E0EA] bg-white shadow-md transition-shadow hover:shadow-lg">
                {/* Header simulado de app */}
                <div className="flex items-center justify-between border-b border-[#D9E0EA] bg-[#F8FAFD] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[#1E5AA8]" />
                    <span className="text-xs font-bold tracking-tight text-[#1A2332]">Entregas Recientes · Evaluación IA</span>
                  </div>
                  <span className="rounded bg-[#EAF1F9] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#1E5AA8]">
                    VISTA PREVIA
                  </span>
                </div>

                {/* Lista de Entregas de Estudiantes */}
                <div className="p-4 space-y-3">
                  {MOCK_HERO_SUBMISSIONS.map((sub) => (
                    <div
                      key={sub.name}
                      className="flex flex-col gap-2 rounded-lg border border-[#EEF1F6] bg-[#FAFBFC] p-3.5 transition-colors hover:bg-white hover:border-[#D9E0EA]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-bold text-[#1A2332]">
                            {sub.name}
                          </span>
                          <span className="block truncate text-[11px] text-[#64748B]">
                            {sub.task}
                          </span>
                        </div>
                        <span className={`font-mono text-xs font-bold ${sub.scoreColor} ${sub.badgeBg} px-2 py-0.5 rounded shrink-0`}>
                          {sub.score}/100
                        </span>
                      </div>

                      {/* Barra de progreso coloreada */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EAF1]">
                        <div
                          className={`h-full ${sub.barColor} transition-[width] duration-500`}
                          style={{ width: `${sub.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#EEF1F6] bg-[#F8FAFD] px-4 py-2.5 text-center">
                  <span className="text-[11px] text-[#8B95A5]">Análisis automático de chats de Gemini, ChatGPT y Claude</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* 2. CÓMO FUNCIONA — 3 tarjetas horizontales responsive */}
      <section id="como-funciona" className="bg-white px-6 py-16 lg:py-20 border-b border-[#D9E0EA]">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-12 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-[#1A2332] sm:text-3xl">
              Cómo funciona
            </h2>
            <p className="mt-2 text-sm text-[#4A5568] sm:text-base">
              Tres pasos sencillos desde la entrega hasta la evaluación cuantitativa con evidencia.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={step.num}
                  className="flex flex-col justify-between rounded-xl border border-[#D9E0EA] bg-[#FAFBFC] p-6 transition-colors hover:border-[#1E5AA8]/40 hover:bg-white hover:shadow-xs"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-[#EAF1F9] text-[#1E5AA8]">
                        <IconComponent size={20} />
                      </div>
                      <span className="font-mono text-xl font-extrabold text-[#1E5AA8]/30">
                        {step.num}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#1A2332] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#4A5568] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. QUÉ EVALÚA — Lista con barras horizontales proporcionales */}
      <section className="px-6 py-16 lg:py-20 bg-[#FAFBFC] border-b border-[#D9E0EA]">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-10 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-[#1A2332] sm:text-3xl">
              Qué evalúa
            </h2>
            <p className="mt-2 text-sm text-[#4A5568] sm:text-base">
              Cinco criterios académicos ponderados con rúbrica rigurosa y citas directas de la conversación.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#D9E0EA] bg-white p-6 shadow-xs space-y-5">
            {CRITERIA.map((c) => (
              <div key={c.criterion} className="space-y-2 border-b border-[#EEF1F6] pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A2332]">{c.criterion}</h3>
                    <p className="text-xs text-[#64748B]">{c.description}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1E5AA8] shrink-0 self-start sm:self-auto">
                    {c.weight}
                  </span>
                </div>

                {/* Barra horizontal de peso comparativo */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F0F3F8]">
                  <div
                    className="h-full bg-[#1E5AA8] transition-[width] duration-300"
                    style={{ width: `${c.percent * 3}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PARA QUIÉN — Dos tarjetas con ícono */}
      <section className="bg-white px-6 py-16 lg:py-20 border-b border-[#D9E0EA]">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-12 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-[#1A2332] sm:text-3xl">
              Para quién es AI WorkTrail
            </h2>
            <p className="mt-2 text-sm text-[#4A5568] sm:text-base">
              Diseñado para elevar los estándares pedagógicos en la educación superior.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Docentes */}
            <div className="rounded-xl border border-[#D9E0EA] bg-[#FAFBFC] p-7 transition-colors hover:bg-white hover:shadow-xs">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#EAF1F9] text-[#1E5AA8]">
                <GraduationCap size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#1A2332] mb-2">
                Docentes universitarios
              </h3>
              <p className="text-sm text-[#4A5568] leading-relaxed">
                Evalúa en minutos el uso real de la IA en cada entrega, con criterios transparentes y evidencia por mensaje. Detecta quién delegó el trabajo y quién lo usó como herramienta de aprendizaje, sin depender de la intuición.
              </p>
            </div>

            {/* Instituciones */}
            <div className="rounded-xl border border-[#D9E0EA] bg-[#FAFBFC] p-7 transition-colors hover:bg-white hover:shadow-xs">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#EAF1F9] text-[#1E5AA8]">
                <Building2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#1A2332] mb-2">
                Instituciones educativas
              </h3>
              <p className="text-sm text-[#4A5568] leading-relaxed">
                Obtén datos agregados del patrón de uso de IA en tus cursos. Diseña políticas de IA con base en evidencia, no en suposiciones. Aplica criterios académicos consistentes en toda la institución.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA FINAL — Fondo de acento suave */}
      <section className="bg-[#FAFBFC] px-6 py-16">
        <div className="mx-auto max-w-[900px] text-center">
          <div className="rounded-2xl border border-[#1E5AA8]/20 bg-[#EAF1F9] p-8 sm:p-12 shadow-xs">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white text-[#1E5AA8] shadow-xs">
              <Sparkles size={22} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1A2332] sm:text-3xl mb-3">
              Evalúa el uso de IA con evidencia, no con sospecha
            </h2>
            <p className="mx-auto max-w-lg text-sm text-[#4A5568] sm:text-base mb-8">
              Crea tu primer curso en segundos e invita a tus estudiantes a entregar sus conversaciones de IA.
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 rounded-md bg-[#1E5AA8] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#174A8C] shadow-xs"
            >
              Comenzar ahora
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

