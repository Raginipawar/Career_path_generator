from pydantic import BaseModel, Field, ConfigDict
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
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(default="", alias="userId")
    full_name: str = Field(alias="fullName")
    age: int
    gender: str
    location_city: str = Field(alias="locationCity")
    location_state: str = Field(alias="locationState")
    highest_degree: str = Field(alias="highestDegree")
    field_of_study: str = Field(alias="fieldOfStudy")
    institution_tier: str = Field(alias="institutionTier")
    current_role: str = Field(alias="currentRole")
    current_industry: str = Field(alias="currentIndustry")
    years_of_experience: float = Field(alias="yearsOfExperience")
    employment_status: str = Field(alias="employmentStatus")
    current_salary_lpa: float = Field(alias="currentSalaryLpa")
    technical_skills: list[str] = Field(alias="technicalSkills")
    soft_skills: list[str] = Field(alias="softSkills")
    certifications: list[str]
    interest_domains: list[str] = Field(alias="interestDomains")
    career_goal: str = Field(alias="careerGoal")
    preferred_work_style: str = Field(alias="preferredWorkStyle")
    willing_to_relocate: bool = Field(alias="willingToRelocate")
    target_timeline_years: int = Field(alias="targetTimelineYears")
    life_stage: str = Field(alias="lifeStage")
    burnout_level: int = Field(alias="burnoutLevel")
    stress_tolerance: int = Field(alias="stressTolerance")
    has_dependents: bool = Field(alias="hasDependents")
    recent_life_event: str = Field(alias="recentLifeEvent")
    work_life_priority: str = Field(alias="workLifePriority")
    leadership_score: float = Field(alias="leadershipScore")
    alignment_category: str = Field(alias="alignmentCategory")

# ──────────────────────────────────────────────
# RAG Request / Response (contract with backend)
# ──────────────────────────────────────────────

class RagGenerateRequest(BaseModel):
    profile: UserProfile
    top_k: int = Field(default=5, ge=1, le=20)
    probability_min: int = Field(default=5,  ge=5,  le=95)   # deterministic lower bound
    probability_max: int = Field(default=88, ge=5,  le=95)   # deterministic upper bound


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
    graph_nodes: int = 0
    graph_edges: int = 0
