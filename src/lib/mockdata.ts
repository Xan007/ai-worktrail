export type EnrollmentMode = 'open' | 'requires_approval' | 'whitelist';
export type AIEvaluationMode = 'on_submit' | 'on_demand';
export type TaskStatus = 'open' | 'closed';
export type GemStatus = 'verified' | 'unverified' | null;
export type GroupGradingMode = 'shared' | 'individual';
export type Profile = 'productive_passenger' | 'reluctant_optimizer' | 'mental_marathoner';

export interface Course {
  id: string;
  name: string;
  join_code: string;
  enrollment_mode: EnrollmentMode;
  role: 'teacher' | 'student';
  description?: string;
  enrollment_status?: 'pending' | 'approved' | 'rejected';
  pending_enrollments_count?: number;
  is_enrollment_locked?: boolean;
}

export interface Task {
  id: string;
  course_id: string;
  name: string;
  is_group_task: boolean;
  ai_evaluation_mode: AIEvaluationMode;
  status: TaskStatus;
  group_grading_mode?: GroupGradingMode;
  max_group_size?: number;
  created_at: string;
  due_at?: string;
  allow_resubmission?: boolean;
}

export interface Chat {
  id: string;
  url: string;
  platform: 'gemini' | 'chatgpt' | 'claude' | 'other';
  gem_status: GemStatus;
  extraction_error: string | null;
  prompts?: string[];
}

export interface Submission {
  id: string;
  task_id: string;
  version: number;
  submitted_at: string;
  student: { id: string; name: string };
  chats: Chat[];
}

export interface CriterionBand {
  level: number;
  label: string;
  description: string;
}

export interface Evidence {
  chat: number;
  message: number;
  quote: string;
}

export interface Criterion {
  key: string;
  name: string;
  weight: number;
  rating: number;
  band: CriterionBand;
  explanation: string;
  evidence: Evidence[];
}

export interface Analysis {
  id: string;
  submission_id: string;
  score: number;
  flagged: boolean;
  profile: Profile;
  summary: string;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
}

// =================== MOCKUP DATA ===================

const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    name: 'Gestión de Procesos — 2026-I',
    join_code: 'A3F8C2',
    enrollment_mode: 'open',
    role: 'teacher',
  },
  {
    id: 'c2',
    name: 'Innovación y Diseño — 2026-I',
    join_code: 'BX9T4K',
    enrollment_mode: 'requires_approval',
    role: 'teacher',
  },
  {
    id: 'c3',
    name: 'Metodología de la Investigación',
    join_code: 'MR2J7P',
    enrollment_mode: 'whitelist',
    role: 'student',
  },
];

const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    course_id: 'c1',
    name: 'Process Landscape Model',
    is_group_task: false,
    ai_evaluation_mode: 'on_demand',
    status: 'open',
    created_at: '2026-08-20T10:00:00Z',
    due_at: '2026-08-31T23:59:00Z',
  },
  {
    id: 't2',
    course_id: 'c1',
    name: 'Value Stream Mapping',
    is_group_task: true,
    ai_evaluation_mode: 'on_submit',
    status: 'open',
    group_grading_mode: 'shared',
    max_group_size: 4,
    created_at: '2026-08-15T09:00:00Z',
    due_at: '2026-09-05T18:00:00Z',
  },
  {
    id: 't3',
    course_id: 'c1',
    name: 'Análisis de Procesos AS-IS',
    is_group_task: false,
    ai_evaluation_mode: 'on_demand',
    status: 'closed',
    created_at: '2026-08-01T08:00:00Z',
    due_at: '2026-08-15T23:59:00Z',
  },
  {
    id: 't4',
    course_id: 'c2',
    name: 'Design Thinking Workshop',
    is_group_task: true,
    ai_evaluation_mode: 'on_submit',
    status: 'open',
    group_grading_mode: 'individual',
    max_group_size: 3,
    created_at: '2026-08-22T11:00:00Z',
    due_at: '2026-09-10T12:00:00Z',
  },
];

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    task_id: 't1',
    version: 2,
    submitted_at: '2026-08-24T18:39:00Z',
    student: { id: 'u1', name: 'María Fernanda Ruiz' },
    chats: [
      {
        id: 'ch1',
        url: 'https://share.gemini.google/fYqkYQtLtT0p',
        platform: 'gemini',
        gem_status: null,
        extraction_error: null,
        prompts: [
          'Esto es lo que tenemos hasta ahora. ¿Qué aspectos del modelo necesitan más detalle?',
          'Perfecto. ¿Puedes explicar por qué el subproceso de aprobación genera el mayor tiempo de ciclo?',
          'Entendido. ¿Cuáles serían las tres mejoras de mayor impacto según la literatura de BPM?',
        ],
      },
      {
        id: 'ch2',
        url: 'https://gemini.google.com/share/d/abc123xyz',
        platform: 'gemini',
        gem_status: 'unverified',
        extraction_error: 'El enlace no es públicamente accesible. Asegúrate de que el chat esté compartido como "cualquier persona con el enlace".',
        prompts: [],
      },
    ],
  },
  {
    id: 's2',
    task_id: 't1',
    version: 1,
    submitted_at: '2026-08-23T14:15:00Z',
    student: { id: 'u1', name: 'María Fernanda Ruiz' },
    chats: [
      {
        id: 'ch3',
        url: 'https://share.gemini.google/mK9pR2sXtV',
        platform: 'gemini',
        gem_status: 'verified',
        extraction_error: null,
        prompts: [
          'Ayúdame a entender el modelo BPMN para este proceso.',
          '¿Cómo puedo mejorar la eficiencia del flujo?',
        ],
      },
    ],
  },
  {
    id: 's3',
    task_id: 't1',
    version: 1,
    submitted_at: '2026-08-24T20:10:00Z',
    student: { id: 'u2', name: 'Carlos Eduardo Méndez' },
    chats: [
      {
        id: 'ch4',
        url: 'https://share.gemini.google/qZ5wE8nBcY',
        platform: 'gemini',
        gem_status: null,
        extraction_error: null,
        prompts: [
          'Hazme el modelo completo de proceso para mi empresa.',
          'Ahora escribe la descripción de cada subproceso.',
          'Dame las conclusiones del análisis.',
        ],
      },
    ],
  },
];

const MOCK_ANALYSES: Analysis[] = [
  {
    id: 'a1',
    submission_id: 's1',
    score: 84,
    flagged: false,
    profile: 'mental_marathoner',
    summary:
      'La estudiante estructuró su propio modelo antes de consultar a la IA, utilizando la herramienta para validar decisiones ya tomadas y profundizar en aspectos técnicos específicos. Las preguntas muestran comprensión previa del dominio y búsqueda de razonamiento, no de respuestas directas.',
    criteria: [
      {
        key: 'ownership',
        name: 'Autoría del trabajo',
        weight: 30,
        rating: 85,
        band: { level: 5, label: '81–100', description: 'Produjo su propio trabajo; la IA solo verificó o refinó.' },
        explanation: 'Aportó material propio y pidió crítica explícita, demostrando que el trabajo intelectual principal fue suyo.',
        evidence: [{ chat: 1, message: 1, quote: 'Esto es lo que tenemos hasta ahora. ¿Qué aspectos del modelo necesitan más detalle?' }],
      },
      {
        key: 'critical_engagement',
        name: 'Compromiso crítico',
        weight: 25,
        rating: 82,
        band: { level: 5, label: '81–100', description: 'Cuestiona, contrasta y profundiza activamente.' },
        explanation: 'Siguió el hilo argumentativo y pidió justificación de criterios técnicos en múltiples turnos.',
        evidence: [{ chat: 1, message: 2, quote: '¿Puedes explicar por qué el subproceso de aprobación genera el mayor tiempo de ciclo?' }],
      },
      {
        key: 'ai_as_tutor',
        name: 'IA como tutor',
        weight: 20,
        rating: 88,
        band: { level: 5, label: '81–100', description: 'Usa la IA para aprender y razonar, no solo para obtener respuestas.' },
        explanation: 'Las preguntas apuntan a entender mecanismos causales y principios teóricos.',
        evidence: [{ chat: 1, message: 3, quote: '¿Cuáles serían las tres mejoras de mayor impacto según la literatura de BPM?' }],
      },
      {
        key: 'integration_originality',
        name: 'Integración y originalidad',
        weight: 15,
        rating: 80,
        band: { level: 4, label: '61–80', description: 'Integra aportes de la IA con voz y perspectiva propias.' },
        explanation: 'El entregable final muestra síntesis propia, aunque algunos fragmentos reflejan fraseología del modelo.',
        evidence: [],
      },
      {
        key: 'process_awareness',
        name: 'Conciencia del proceso',
        weight: 10,
        rating: 75,
        band: { level: 4, label: '61–80', description: 'Reflexiona sobre su propio proceso de uso de IA.' },
        explanation: 'Demostró consistencia en el enfoque a lo largo del trabajo, aunque sin reflexión explícita sobre el proceso.',
        evidence: [],
      },
    ],
    strengths: [
      'Conserva la agencia del trabajo intelectual; la IA actúa como herramienta de refinamiento, no de producción.',
      'Preguntas orientadas a causalidad y justificación, no a respuestas directas.',
      'Evidencia de conocimiento previo del dominio en la formulación de cada prompt.',
    ],
    improvements: [
      'Profundizar el diálogo pidiendo justificación de los criterios de cada sugerencia.',
      'Agregar reflexión explícita sobre qué aprendió del intercambio con la IA.',
      'Contrastar las recomendaciones de la IA con al menos una fuente académica.',
    ],
  },
  {
    id: 'a2',
    submission_id: 's3',
    score: 30,
    flagged: true,
    profile: 'productive_passenger',
    summary:
      'El estudiante delegó la producción del trabajo a la IA con mínima participación intelectual propia. Las instrucciones fueron directas y orientadas a obtener el entregable completo, sin evidencia de comprensión previa o reflexión crítica sobre el proceso.',
    criteria: [
      {
        key: 'ownership',
        name: 'Autoría del trabajo',
        weight: 30,
        rating: 20,
        band: { level: 1, label: '0–20', description: 'El trabajo fue generado por la IA con mínima participación.' },
        explanation: 'La instrucción "Hazme el modelo completo" indica delegación total de la producción.',
        evidence: [{ chat: 1, message: 1, quote: 'Hazme el modelo completo de proceso para mi empresa.' }],
      },
      {
        key: 'critical_engagement',
        name: 'Compromiso crítico',
        weight: 25,
        rating: 25,
        band: { level: 2, label: '21–40', description: 'Acepta respuestas sin cuestionar ni profundizar.' },
        explanation: 'No hubo seguimiento crítico, solo solicitudes adicionales de producción.',
        evidence: [{ chat: 1, message: 2, quote: 'Ahora escribe la descripción de cada subproceso.' }],
      },
      {
        key: 'ai_as_tutor',
        name: 'IA como tutor',
        weight: 20,
        rating: 15,
        band: { level: 1, label: '0–20', description: 'Usa la IA exclusivamente como generador de contenido.' },
        explanation: 'Las solicitudes son de producción directa, no de aprendizaje o razonamiento.',
        evidence: [{ chat: 1, message: 3, quote: 'Dame las conclusiones del análisis.' }],
      },
      {
        key: 'integration_originality',
        name: 'Integración y originalidad',
        weight: 15,
        rating: 40,
        band: { level: 2, label: '21–40', description: 'Poco o ningún aporte original; replica lo generado por la IA.' },
        explanation: 'El entregable es prácticamente una transcripción de las respuestas del modelo.',
        evidence: [],
      },
      {
        key: 'process_awareness',
        name: 'Conciencia del proceso',
        weight: 10,
        rating: 30,
        band: { level: 2, label: '21–40', description: 'Sin evidencia de reflexión sobre el proceso de uso de IA.' },
        explanation: 'No hay metacognición ni ajuste de estrategia a lo largo del intercambio.',
        evidence: [],
      },
    ],
    strengths: [
      'Formuló instrucciones con contexto básico del dominio.',
    ],
    improvements: [
      'Desarrollar el trabajo intelectual antes de consultar a la IA.',
      'Cambiar instrucciones de producción ("hazme") por preguntas de razonamiento.',
      'Aportar perspectiva propia antes de pedir evaluación o completado.',
      'Contrastar y cuestionar las respuestas en lugar de aceptarlas directamente.',
    ],
  },
];

export function getProfileLabel(profile: Profile): string {
  const map: Record<Profile, string> = {
    productive_passenger: 'Pasajero productivo',
    reluctant_optimizer: 'Optimizador reacio',
    mental_marathoner: 'Maratonista mental',
  };
  return map[profile];
}

function getScoreColor(score: number): string {
  if (score < 40) return '#B3372F';
  if (score < 70) return '#B45309';
  return '#1F7A4D';
}

function getScoreBg(score: number): string {
  if (score < 40) return '#FBEDEB';
  if (score < 70) return '#FBF3E7';
  return '#E8F4EE';
}

export function getProfileColor(profile: Profile): string {
  const map: Record<Profile, string> = {
    productive_passenger: '#A63D33',
    reluctant_optimizer: '#9C6B1F',
    mental_marathoner: '#1F7A4D',
  };
  return map[profile];
}

export function getProfileBg(profile: Profile): string {
  const map: Record<Profile, string> = {
    productive_passenger: '#FBEDEB',
    reluctant_optimizer: '#FBF3E7',
    mental_marathoner: '#E8F4EE',
  };
  return map[profile];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getEnrollmentLabel(mode: EnrollmentMode): string {
  const map: Record<EnrollmentMode, string> = {
    open: 'Abierto',
    requires_approval: 'Requiere aprobación',
    whitelist: 'Lista blanca',
  };
  return map[mode];
}

function getAIModeLabel(mode: AIEvaluationMode): string {
  const map: Record<AIEvaluationMode, string> = {
    on_submit: 'Al entregar',
    on_demand: 'A demanda',
  };
  return map[mode];
}
