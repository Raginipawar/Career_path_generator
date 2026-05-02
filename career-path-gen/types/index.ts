// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ─── Profile (28 fields — matches backend Zod schema exactly) ────────────────
export interface UserProfile {
  // Personal
  fullName: string;
  age: number;
  gender: string;
  locationCity: string;
  locationState: string;

  // Education
  highestDegree: string;
  fieldOfStudy: string;
  institutionTier: 'Tier 1' | 'Tier 2' | 'Tier 3';

  // Career
  currentRole: string;
  currentIndustry: string;
  yearsOfExperience: number;
  employmentStatus: 'Employed Full-Time' | 'Employed Part-Time' | 'Self-Employed' | 'Unemployed' | 'Student' | 'Career Break';
  currentSalaryLpa: number;

  // Skills
  technicalSkills: string[];
  softSkills: string[];
  certifications: string[];

  // Goals
  interestDomains: string[];
  careerGoal: string;
  preferredWorkStyle: 'Remote' | 'Hybrid' | 'On-site';
  willingToRelocate: boolean;
  targetTimelineYears: number;

  // Life context
  lifeStage: 'Early Career' | 'Mid Career' | 'Late Career' | 'Career Break' | 'Re-entering Workforce';
  burnoutLevel: number;      // 1-10
  stressTolerance: number;   // 1-10
  hasDependents: boolean;
  recentLifeEvent: string;
  workLifePriority: 'Career Growth' | 'Work-Life Balance' | 'Financial Stability' | 'Personal Fulfilment';

  // Assessment
  leadershipScore: number;   // 0-10
  alignmentCategory: 'Low' | 'Moderate' | 'High';
}

// ─── RAG Response types (matches Sachi's models.py exactly) ──────────────────
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
  framework: string;  // "PASSIONIT" or "PRUTL"
  score: number;      // 1-10
  risk_level: 'Low' | 'Medium' | 'High';
  explanation: string;
  recommendation: string;
  flagged_biases: string[];
}

export interface RoadmapResponse {
  roadmapId: string;
  roadmap_nodes: RoadmapNode[];
  roadmap_edges: RoadmapEdge[];
  current_role: string;
  target_role: string;
  success_probability: number;   // 0-100
  total_transition_months: number;
  explanation: string;
  emotional_forecast: EmotionalForecast[];
  alternative_paths: AlternativePath[];
  audit_scores: AuditScore[];
  fromCache: boolean;
}
