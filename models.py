from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class LifeStage(str, Enum):
    EARLY_CAREER = "Early Career"
    MID_CAREER = "Mid Career"
    LATE_CAREER = "Late Career"
    CAREER_BREAK = "Career Break"
    RE_ENTERING = "Re-entering Workforce"


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


# ──────────────────────────────────────────────
# Profile (incoming from Nikhil's backend)
# ──────────────────────────────────────────────

class UserProfile(BaseModel):
    user_id: str
    full_name: str
    age: int
    gender: str
    location_city: str
    location_state: str
    highest_degree: str
    field_of_study: str
    institution_tier: str
    current_role: str
    current_industry: str
    years_of_experience: float
    employment_status: str
    current_salary_lpa: float
    technical_skills: list[str]
    soft_skills: list[str]
    certifications: list[str]
    interest_domains: list[str]
    career_goal: str
    preferred_work_style: str
    willing_to_relocate: bool
    target_timeline_years: int
    life_stage: str
    burnout_level: int
    stress_tolerance: int
    has_dependents: bool
    recent_life_event: str
    work_life_priority: str
    leadership_score: float
    alignment_category: str


# ──────────────────────────────────────────────
# RAG Request / Response (contract with backend)
# ──────────────────────────────────────────────

class RagGenerateRequest(BaseModel):
    profile: UserProfile
    top_k: int = Field(default=5, ge=1, le=20)


class RoadmapNode(BaseModel):
    node_id: str
    role_title: str
    node_order: int
    timeline_months: int
    required_skills: list[str]
    skill_gap: list[str]
    salary_estimate_lpa: float
    risk_level: RiskLevel
    description: str


class RoadmapEdge(BaseModel):
    source: str
    target: str
    label: str = ""


class AlternativePath(BaseModel):
    path_name: str
    roles: list[str]
    total_months: int
    success_probability: float


class EmotionalForecast(BaseModel):
    phase: str
    timeline: str
    stress_level: str
    description: str


class AuditScore(BaseModel):
    dimension: str
    framework: str  # "PASSIONIT" or "PRUTL"
    score: int = Field(ge=1, le=10)
    risk_level: RiskLevel
    explanation: str
    recommendation: str
    flagged_biases: list[str] = []


class RagGenerateResponse(BaseModel):
    roadmap_nodes: list[RoadmapNode]
    roadmap_edges: list[RoadmapEdge]
    current_role: str
    target_role: str
    success_probability: float
    total_transition_months: int
    explanation: str
    emotional_forecast: list[EmotionalForecast]
    alternative_paths: list[AlternativePath]
    audit_scores: list[AuditScore]
    retrieved_doc_ids: list[str]
    model_used: str
    cached: bool = False


# ──────────────────────────────────────────────
# Embed endpoint
# ──────────────────────────────────────────────

class DocumentMetadata(BaseModel):
    source: str
    domain: str
    doc_type: str
    role_title: str = ""
    experience_level: str = ""
    region: str = "India"


class DocumentInput(BaseModel):
    doc_id: str
    text: str
    metadata: DocumentMetadata


class EmbedRequest(BaseModel):
    documents: list[DocumentInput]


class EmbedResponse(BaseModel):
    embedded: int
    collection_total: int


# ──────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    chromadb: str
    groq: str
    redis: str
    embedding_model: str
    doc_count: int
