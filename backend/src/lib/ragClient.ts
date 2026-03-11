// src/lib/ragClient.ts
// Matches Sachi's (Person 3) exact models.py contract

const RAG_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:8000';
const TIMEOUT_MS = parseInt(process.env.RAG_TIMEOUT_MS ?? '30000', 10);

// ─── Request Types (matching Sachi's UserProfile model) ───────────────────────

export interface RagProfile {
  user_id: string;
  full_name: string;
  age: number;
  gender: string;
  location_city: string;
  location_state: string;
  highest_degree: string;
  field_of_study: string;
  institution_tier: string;
  current_role: string;
  current_industry: string;
  years_of_experience: number;
  employment_status: string;
  current_salary_lpa: number;
  technical_skills: string[];
  soft_skills: string[];
  certifications: string[];
  interest_domains: string[];
  career_goal: string;
  preferred_work_style: string;
  willing_to_relocate: boolean;
  target_timeline_years: number;
  life_stage: string;
  burnout_level: number;
  stress_tolerance: number;
  has_dependents: boolean;
  recent_life_event: string;
  work_life_priority: string;
  leadership_score: number;
  alignment_category: string;
}

// ─── Response Types (matching Sachi's RagGenerateResponse model) ──────────────

export interface RoadmapNode {
  node_id: string;
  role_title: string;
  node_order: number;
  timeline_months: number;
  required_skills: string[];
  skill_gap: string[];
  salary_estimate_lpa: number;
  risk_level: 'Low' | 'Medium' | 'High';
  description: string;
}

export interface RoadmapEdge {
  source: string;
  target: string;
  label: string;
}

export interface AlternativePath {
  path_name: string;
  roles: string[];
  total_months: number;
  success_probability: number;
}

export interface EmotionalForecast {
  phase: string;
  timeline: string;
  stress_level: string;
  description: string;
}

export interface AuditScore {
  dimension: string;
  framework: string;
  score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  explanation: string;
  recommendation: string;
  flagged_biases: string[];
}

export interface RagResponse {
  roadmap_nodes: RoadmapNode[];
  roadmap_edges: RoadmapEdge[];
  current_role: string;
  target_role: string;
  success_probability: number;
  total_transition_months: number;
  explanation: string;
  emotional_forecast: EmotionalForecast[];
  alternative_paths: AlternativePath[];
  audit_scores: AuditScore[];
  retrieved_doc_ids: string[];
  model_used: string;
  cached: boolean;
}

// ─── Main caller ──────────────────────────────────────────────────────────────

// Add to ragClient.ts
function prismaToRagProfile(p: any): RagProfile {
  return {
    user_id: p.userId ?? p.id,
    full_name: p.fullName,
    age: p.age,
    gender: p.gender,
    location_city: p.locationCity,
    location_state: p.locationState,
    highest_degree: p.highestDegree,
    field_of_study: p.fieldOfStudy,
    institution_tier: p.institutionTier,
    current_role: p.currentRole,
    current_industry: p.currentIndustry,
    years_of_experience: p.yearsOfExperience,
    employment_status: p.employmentStatus,
    current_salary_lpa: p.currentSalaryLpa,
    technical_skills: p.technicalSkills,
    soft_skills: p.softSkills,
    certifications: p.certifications,
    interest_domains: p.interestDomains,
    career_goal: p.careerGoal,
    preferred_work_style: p.preferredWorkStyle,
    willing_to_relocate: p.willingToRelocate,
    target_timeline_years: p.targetTimelineYears,
    life_stage: p.lifeStage,
    burnout_level: p.burnoutLevel,
    stress_tolerance: p.stressTolerance,
    has_dependents: p.hasDependents,
    recent_life_event: p.recentLifeEvent,
    work_life_priority: p.workLifePriority,
    leadership_score: p.leadershipScore,
    alignment_category: p.alignmentCategory,
  };
}

export async function callRagGenerate(ragProfile: RagProfile): Promise<RagResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${RAG_URL}/rag/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: ragProfile,
        top_k: 5,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RAG service responded with status ${response.status}`);
    }

    const data = (await response.json()) as RagResponse;
    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('RAG service timed out after 30 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkRagHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RAG_URL}/rag/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
