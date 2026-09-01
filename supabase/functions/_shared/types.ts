export type Platform = 'gemini' | 'claude' | 'chatgpt' | 'other'

export interface SubmissionChat {
  id: string
  submission_id: string
  student_id: string
  chat_url: string
  platform: Platform
  is_gem: boolean
  approved_gem_id: string | null
  gem_instructions_pasted: string | null
}

export interface ApprovedGem {
  id: string
  course_id: string
  name: string
  gem_url: string
}

export type Profile = 'productive_passenger' | 'reluctant_optimizer' | 'mental_marathoner'

export interface EvidenceRef {
  chat: number
  message: number
  quote: string
}

export interface CriterionResult {
  key: string
  rating: number
  band: { level: number; label: string; description: string }
  explanation: string
  evidence: EvidenceRef[]
}

export interface EvaluationBreakdown {
  profile: Profile
  criteria: CriterionResult[]
  strengths: string[]
  improvements: string[]
  summary: string
}

export interface CriterionConfig {
  key: string
  weight: number
}

export interface CriteriaBand {
  max: number
  description: string
}
