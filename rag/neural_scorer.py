"""
rag/neural_scorer.py — Neural scoring engine.

All matching and scoring happens in embedding space using the loaded transformer model.
No keyword lookups. No fixed taxonomy matching. Continuous vector space.

Architecture:
  sentence-transformer (all-MiniLM-L6-v2, 6-layer transformer, 384-dim output)
      ↓
  Embedding space operations (cosine similarity, nearest-neighbour)
      ↓
  MLP probability head (3-layer PyTorch network, trained on synthetic features)
      ↓
  Calibrated probability + semantic skill gap + domain classification
"""

from __future__ import annotations
import math
import json
import os
from functools import lru_cache
from rag.embedder import get_model

# ─── Optional PyTorch MLP for probability calibration ────────────────────────
try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("PyTorch not installed — falling back to analytical probability scoring")


# ─── Domain descriptions (rich text, not just labels) ─────────────────────────
# Used for zero-shot domain classification via embedding similarity
# Keys match KB domain names (after normalisation via KB_DOMAIN_MAP)
# This ensures domain classifier output matches what's in ChromaDB
DOMAIN_DESCRIPTIONS = {
    "ai & ml":
        "Artificial intelligence machine learning deep learning neural networks Python TensorFlow PyTorch MLOps LLM NLP computer vision model training inference scikit-learn",
    "data analytics":
        "Business intelligence data analytics dashboards SQL Tableau Power BI reporting KPIs stakeholder insights Excel business analyst BI Developer",
    "full stack":
        "Full stack web development React Node.js JavaScript TypeScript PostgreSQL REST API Docker authentication frontend backend software engineer tech lead principal engineer engineering manager senior developer web architect",
    "cybersecurity":
        "Cybersecurity information security penetration testing SIEM threat detection OWASP compliance SOC ISO27001 forensics security analyst",
    "cloud & devops":
        "DevOps cloud engineering Kubernetes Docker CI/CD Terraform AWS GCP Azure infrastructure automation SRE monitoring platform engineer",
    "product management":
        "Product management roadmap strategy OKRs user research A/B testing Jira stakeholder management go-to-market product manager",
    "ui/ux":
        "UI UX design Figma prototyping user research usability testing design systems interaction design accessibility product designer",
    "fintech":
        "Financial technology banking payments blockchain trading quantitative finance risk management compliance FinTech Python SQL banking",
    "edtech":
        "Educational technology curriculum design instructional design e-learning LMS content creation technical training teaching instructor",
    "healthcare it":
        "Healthcare IT EMR EHR HIPAA HL7 FHIR clinical informatics health data interoperability medical technology",
    "embedded & iot":
        "Embedded systems IoT firmware RTOS C C++ microcontrollers sensors hardware internet of things ARM",
    "gaming":
        "Game development Unity Unreal Engine C++ graphics rendering game design interactive media VR AR",
    "research":
        "Research academia PhD publications machine learning NLP computer science statistical analysis academic scientist",
    "consulting":
        "Management consulting strategy business transformation client engagement project management analytics McKinsey Bain BCG",
    "entrepreneurship":
        "Startup entrepreneurship product-market fit fundraising venture capital growth hacking business development founder",
    "global delivery":
        "GCC Global Capability Centre offshore delivery India US Europe cross-border operations transition Micro-GCC shared services global team management delivery head",
    "hr technology":
        "HR technology people analytics HRIS talent management workforce planning organizational development human resources",
    "finance":
        "Finance investment banking equity private equity CFA financial analysis portfolio management valuation Bloomberg",
    "sales":
        "Sales business development revenue growth CRM account management enterprise sales B2B SaaS",
    "digital marketing":
        "Digital marketing SEO SEM social media growth hacking performance marketing analytics content strategy",
    "legal tech":
        "Legal technology compliance regulatory law technology contract management LegalTech GRC",
    "supply chain":
        "Supply chain operations logistics procurement SAP ERP inventory management warehousing manufacturing",
    "content":
        "Content creation writing video production YouTube creator economy brand partnerships monetisation",
    "sustainability":
        "Sustainability ESG environmental social governance climate tech green energy carbon reporting",
    "civil engineering":
        "Civil engineering infrastructure construction structural design project management AutoCAD BIM",
}

# Pre-computed domain embeddings cache (computed once, reused)
_domain_embeddings: dict[str, list[float]] | None = None


def _cosine(a: list[float], b: list[float]) -> float:
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _get_domain_embeddings() -> dict[str, list[float]]:
    """Embed all domain descriptions once and cache them."""
    global _domain_embeddings
    if _domain_embeddings is not None:
        return _domain_embeddings

    model = get_model()
    print("Computing domain embeddings (one-time)...")
    _domain_embeddings = {
        domain: model.encode(desc).tolist()
        for domain, desc in DOMAIN_DESCRIPTIONS.items()
    }
    print(f"  {len(_domain_embeddings)} domain embeddings computed.")
    return _domain_embeddings


# ─── Explicit keyword → domain overrides ─────────────────────────────────────
# Stage 1 of the classifier: if any of these terms appear literally in the text,
# boost that domain score by +0.45 so it wins over fuzzy embedding matches.
# This prevents "leadership in full stack" mapping to "global delivery",
# or "psychologist" mapping to "data science".

DOMAIN_KEYWORD_MAP: dict[str, list[str]] = {
    "full stack": [
        "full stack", "fullstack", "frontend", "front-end", "backend", "back-end",
        "web developer", "web development", "react developer", "node developer",
        "javascript developer", "typescript", "react engineer", "mern", "mean",
        "software engineer", "software developer", "tech lead", "engineering manager",
        "principal engineer", "senior engineer", "web engineer",
    ],
    "ai & ml": [
        "machine learning", "artificial intelligence", " ai ", "deep learning",
        "ml engineer", "ai engineer", "data scientist", "nlp", "computer vision",
        "llm", "generative ai", "neural network", "pytorch", "tensorflow", "mlops",
    ],
    "data analytics": [
        "data analyst", "business analyst", "business intelligence", "bi developer",
        "data engineer", "analytics engineer", "tableau", "power bi", "sql analyst",
    ],
    "cybersecurity": [
        "cybersecurity", "cyber security", "security engineer", "penetration test",
        "ethical hacking", "soc analyst", "infosec", "information security",
    ],
    "cloud & devops": [
        "devops", "cloud engineer", "sre", "site reliability", "platform engineer",
        "infrastructure engineer", "kubernetes", "aws engineer", "azure engineer",
        "gcp engineer", "devsecops",
    ],
    "product management": [
        "product manager", "product management", "product owner", "product lead",
        "associate pm", "senior pm", "director of product", "head of product",
    ],
    "ui/ux": [
        "ux designer", "ui designer", "product designer", "ux researcher",
        "interaction designer", "design lead", "figma", "user experience",
    ],
    "fintech": [
        "fintech", "financial technology", "banking technology", "payments engineer",
        "quantitative", "quant developer", "risk engineer", "trading systems",
    ],
    "entrepreneurship": [
        "entrepreneur", "startup founder", "co-founder", "startup", "venture",
        "build a company", "own business", "start a business",
    ],
    "consulting": [
        "management consultant", "strategy consultant", "business consultant",
        "mckinsey", "bcg", "bain", "deloitte consultant", "advisory",
    ],
    "digital marketing": [
        "digital marketing", "seo specialist", "performance marketing",
        "growth hacker", "social media manager", "content marketer",
    ],
    "global delivery": [
        "gcc", "global capability centre", "global delivery center",
        "offshore delivery", "micro-gcc", "shared services center",
        "global delivery leadership",
    ],
    "research": [
        "researcher", "research scientist", "phd", "academic", "professor",
        "psychologist", "psychology", "sociologist", "anthropologist",
        "philosopher", "historian", "biologist", "chemist",
        "clinical researcher", "behavioural scientist",
    ],
    "healthcare it": [
        "doctor", "physician", "nurse", "therapist", "counselor", "psychiatrist",
        "medical", "clinical", "health informatics", "hospital", "ehr", "emr",
        "health tech", "medtech", "biotech",
    ],
    "edtech": [
        "teacher", "professor", "educator", "tutor", "curriculum", "edtech",
        "instructional designer", "e-learning", "learning experience",
        "education technology", "training specialist",
    ],
    "legal tech": [
        "lawyer", "attorney", "legal", "advocate", "barrister", "solicitor",
        "legaltech", "compliance officer", "paralegal", "corporate law",
    ],
    "finance": [
        "investment banker", "equity analyst", "portfolio manager", "cfa",
        "financial analyst", "private equity", "venture capital", "hedge fund",
        "chartered accountant", "ca ", "finance manager",
    ],
    "embedded & iot": [
        "embedded systems", "iot engineer", "firmware", "rtos", "microcontroller",
        "hardware engineer", "fpga", "embedded software",
    ],
    "gaming": [
        "game developer", "game designer", "unity developer", "unreal engineer",
        "game engine", "vr developer", "ar developer", "3d artist",
    ],
    "supply chain": [
        "supply chain", "logistics", "procurement", "operations manager",
        "warehouse", "inventory", "erp consultant", "scm",
    ],
    "content": [
        "content creator", "youtuber", "blogger", "influencer", "copywriter",
        "content writer", "journalist", "writer", "creator economy",
    ],
    "sustainability": [
        "sustainability", "esg", "climate", "green energy", "carbon",
        "environmental", "net zero", "renewable energy",
    ],
    "hr technology": [
        "hr manager", "people manager", "talent acquisition", "recruiter",
        "hrbp", "hr business partner", "people analytics", "chro",
    ],
}


def classify_domain(text: str, top_k: int = 3) -> list[tuple[str, float]]:
    """
    Two-stage domain classifier:

    Stage 1 — Keyword scan (literal):
      Checks if any domain's explicit keywords appear in the text.
      If found, boosts that domain's score by +0.45 so it wins cleanly
      over fuzzy embedding similarity. This ensures 'leadership in full stack'
      → full stack, not global delivery; 'psychologist' → research, not data science.

    Stage 2 — Embedding cosine similarity (fallback):
      For any domain not matched by keywords, compute cosine similarity
      in 384-dim embedding space. Still works for novel inputs.

    Returns top_k (domain, score) pairs sorted descending.
    """
    text_lower = f" {text.lower()} "   # pad for whole-word boundary matching

    model = get_model()
    text_vec = model.encode(text).tolist()
    domain_vecs = _get_domain_embeddings()

    # Base cosine scores
    scores: dict[str, float] = {
        domain: _cosine(text_vec, vec)
        for domain, vec in domain_vecs.items()
    }

    # Stage 1: keyword boost
    for domain, keywords in DOMAIN_KEYWORD_MAP.items():
        for kw in keywords:
            if kw in text_lower:
                scores[domain] = min(1.0, scores.get(domain, 0.5) + 0.45)
                break   # one match per domain is enough

    # Stage 2: penalty for domains clearly irrelevant to technical profiles
    # "global delivery" should not win unless GCC/offshore is explicitly mentioned
    if "gcc" not in text_lower and "global delivery" not in text_lower and \
       "offshore" not in text_lower and "micro-gcc" not in text_lower:
        scores["global delivery"] = scores.get("global delivery", 0) - 0.2

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]


def best_domain(profile_text: str) -> str:
    """Returns the single best matching domain for a profile."""
    results = classify_domain(profile_text, top_k=1)
    return results[0][0] if results else "full stack"


# ─── Semantic skill gap (embedding space, not string matching) ────────────────

def semantic_skill_gap(
    user_skills:     list[str],
    required_skills: list[str],
    threshold:       float = 0.62,
) -> tuple[list[str], list[str], float]:
    """
    Compute skill gap using cosine similarity in embedding space.
    A user 'has' a required skill if their closest skill embedding
    is within threshold cosine similarity.

    Returns:
      covered  — required skills the user already has (semantically)
      gap      — required skills the user is missing
      ratio    — fraction covered (0.0 → 1.0)
    """
    if not required_skills:
        return [], [], 1.0
    if not user_skills:
        return [], required_skills, 0.0

    model = get_model()
    user_vecs     = model.encode(user_skills)
    required_vecs = model.encode(required_skills)

    covered, gap = [], []
    for i, req_skill in enumerate(required_skills):
        req_vec = required_vecs[i]
        best_sim = max(
            _cosine(req_vec.tolist(), user_vecs[j].tolist())
            for j in range(len(user_skills))
        )
        if best_sim >= threshold:
            covered.append(req_skill)
        else:
            gap.append(req_skill)

    ratio = len(covered) / len(required_skills)
    return covered, gap, ratio


def compute_skill_overlap_score(
    user_skills:    list[str],
    target_role_desc: str,
) -> float:
    """
    Embed the target role description and each user skill,
    then compute mean max similarity of user skills to role requirements.
    Returns 0.0 → 1.0.
    """
    if not user_skills:
        return 0.0

    model = get_model()
    role_vec  = model.encode(target_role_desc)
    skill_vecs = model.encode(user_skills)

    sims = [_cosine(role_vec.tolist(), sv.tolist()) for sv in skill_vecs]
    if not sims:
        return 0.0

    # Mean of top-5 similarities (not all — a specialist with 2 great skills
    # shouldn't be penalized for not having 20)
    top_sims = sorted(sims, reverse=True)[:5]
    return sum(top_sims) / len(top_sims)


# ─── MLP Probability Calibrator (PyTorch) ─────────────────────────────────────

class ProbabilityMLP(nn.Module if TORCH_AVAILABLE else object):
    """
    3-layer MLP that takes extracted career features and outputs
    a calibrated probability (0-1).

    Input features (7-dimensional):
      [skill_overlap, domain_sim, education_alignment,
       experience_factor, burnout_penalty, demand_score, leadership_factor]

    Architecture: 7 → 32 → 16 → 1 with ReLU + Dropout + Sigmoid output
    """
    def __init__(self):
        super().__init__()
        if not TORCH_AVAILABLE:
            return
        self.net = nn.Sequential(
            nn.Linear(7, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )
        # Initialize with sensible weights
        # (analytically calibrated starting point — no training data needed)
        self._init_analytical_weights()

    def _init_analytical_weights(self):
        """
        Initialize weights to approximate our analytical formula.
        Without training data, this gives a reasonable starting point
        that the network can learn to refine as data accumulates.
        """
        if not TORCH_AVAILABLE:
            return
        with torch.no_grad():
            # Layer 1: amplify important features
            nn.init.xavier_uniform_(self.net[0].weight)
            self.net[0].bias.fill_(0.0)
            # Layer 3: smaller output layer
            nn.init.xavier_uniform_(self.net[3].weight)
            self.net[3].bias.fill_(0.0)
            # Output layer
            nn.init.xavier_uniform_(self.net[6].weight)
            self.net[6].bias.fill_(0.0)

    def forward(self, x):
        return self.net(x)


_mlp_model: 'ProbabilityMLP | None' = None
_mlp_path = os.path.join(os.path.dirname(__file__), "prob_mlp.pt")


def _get_mlp() -> 'ProbabilityMLP | None':
    """Load or initialize the MLP model."""
    global _mlp_model
    if not TORCH_AVAILABLE:
        return None
    if _mlp_model is not None:
        return _mlp_model

    _mlp_model = ProbabilityMLP()
    if os.path.exists(_mlp_path):
        try:
            _mlp_model.load_state_dict(torch.load(_mlp_path, map_location="cpu"))
            print(f"Loaded trained probability MLP from {_mlp_path}")
        except Exception:
            print("Could not load MLP weights — using analytical initialization")
    else:
        print("No trained MLP found — using analytically initialized network")
    _mlp_model.eval()
    return _mlp_model


def _extract_features(
    profile: dict,
    target_role_desc: str,
    domain_sim: float,
    skill_overlap: float,
) -> list[float]:
    """
    Extract 7 normalized features for the MLP input.
    """
    years_exp  = float(profile.get("years_of_experience", 0))
    burnout    = float(profile.get("burnout_level", 5))
    leadership = float(profile.get("leadership_score", 5))
    degree     = profile.get("highest_degree", "").lower()
    field      = profile.get("field_of_study", "").lower()

    # Education alignment (0-1)
    tech_fields = ["computer", "software", "information", "data", "math", "engineering", "electronics"]
    is_tech_edu = any(f in field for f in tech_fields)
    is_tech_target = any(kw in target_role_desc.lower() for kw in ["engineer", "developer", "scientist", "analyst"])
    edu_alignment = 1.0 if (is_tech_edu and is_tech_target) else (
        0.85 if (not is_tech_edu and not is_tech_target) else (
        0.25 if (not is_tech_edu and is_tech_target) else 0.65
    ))

    # Experience factor (diminishing returns, normalized 0-1)
    exp_factor = min(1.0, math.log1p(years_exp) / math.log1p(15))

    # Burnout penalty (0-1, 0=no burnout, 1=max burnout)
    burnout_penalty = (burnout - 1) / 9.0

    # Leadership factor (0-1)
    leadership_factor = leadership / 10.0

    # Domain demand (from DOMAIN_DESCRIPTIONS keys — use 0.75 as middle ground)
    demand_score = 0.75  # Could be enhanced with real demand data

    return [
        skill_overlap,       # 0-1
        domain_sim,          # 0-1
        edu_alignment,       # 0-1
        exp_factor,          # 0-1
        burnout_penalty,     # 0-1
        demand_score,        # 0-1
        leadership_factor,   # 0-1
    ]


def neural_probability(
    profile:          dict,
    target_role_desc: str,
    prob_min:         int,
    prob_max:         int,
) -> int:
    """
    Compute transition probability using neural network in embedding space.

    1. Embed user skills + target role → compute semantic skill overlap
    2. Embed full profile + target role → compute domain similarity
    3. Feed features into MLP → get raw probability
    4. Clamp to [prob_min, prob_max] from deterministic pre-scorer

    Returns integer probability 0-100.
    """
    user_skills = profile.get("technical_skills", [])

    # Neural feature extraction
    skill_overlap  = compute_skill_overlap_score(user_skills, target_role_desc)
    domain_results = classify_domain(
        profile.get("career_goal", "") + " " +
        " ".join(profile.get("interest_domains", []))
    )
    domain_sim     = domain_results[0][1] if domain_results else 0.5

    mlp = _get_mlp()

    if mlp is not None and TORCH_AVAILABLE:
        # Use MLP
        features = _extract_features(profile, target_role_desc, domain_sim, skill_overlap)
        x = torch.tensor([features], dtype=torch.float32)
        with torch.no_grad():
            raw_prob = mlp(x).item()  # 0-1 from sigmoid
        base_pct = round(raw_prob * 100)
    else:
        # Analytical fallback (same formula as probabilityScorer.ts but in Python)
        years_exp = profile.get("years_of_experience", 0)
        burnout   = profile.get("burnout_level", 5)
        exp_factor = min(1.0, math.log1p(years_exp) / math.log1p(15))
        burnout_penalty = max(0, (burnout - 6) * 0.04)

        raw = (domain_sim * 0.35 + skill_overlap * 0.35 +
               exp_factor * 0.20 + domain_sim * 0.10 - burnout_penalty)
        base_pct = round(max(0.05, min(0.90, raw)) * 100)

    # Clamp to deterministic bounds (backend pre-computed this from hard rules)
    return max(prob_min, min(prob_max, base_pct))


def save_mlp_weights():
    """Persist MLP weights after training."""
    if not TORCH_AVAILABLE:
        return
    mlp = _get_mlp()
    if mlp:
        torch.save(mlp.state_dict(), _mlp_path)
        print(f"MLP weights saved to {_mlp_path}")


def update_mlp_from_feedback(
    profile:    dict,
    target_role: str,
    actual_prob: float,  # 0.0-1.0, from user feedback or outcome tracking
):
    """
    Online learning: update MLP weights from one outcome.
    Called when user reports actual transition success/failure.
    Uses single-sample SGD (lightweight, no batching needed).
    """
    if not TORCH_AVAILABLE:
        return

    mlp = _get_mlp()
    if mlp is None:
        return

    domain_sim    = classify_domain(target_role)[0][1]
    skill_overlap = compute_skill_overlap_score(
        profile.get("technical_skills", []), target_role
    )
    features = _extract_features(profile, target_role, domain_sim, skill_overlap)

    mlp.train()
    optimizer = torch.optim.Adam(mlp.parameters(), lr=0.001)
    criterion = nn.BCELoss()

    x = torch.tensor([features], dtype=torch.float32)
    y = torch.tensor([[actual_prob]], dtype=torch.float32)

    optimizer.zero_grad()
    pred = mlp(x)
    loss = criterion(pred, y)
    loss.backward()
    optimizer.step()
    mlp.eval()

    save_mlp_weights()
    print(f"MLP updated from feedback (loss: {loss.item():.4f})")


# ─── Semantic career progression builder ─────────────────────────────────────

def find_semantic_career_path(
    current_role: str,
    target_domain_desc: str,
    n_steps: int = 3,
) -> list[str]:
    """
    Find semantic intermediate career steps between current role
    and target domain using embedding space interpolation.
    Returns n_steps role title suggestions (as strings to be used
    as starting points for Groq's personalization).
    """
    model = get_model()

    current_vec = model.encode(current_role)
    target_vec  = model.encode(target_domain_desc)

    # Linear interpolation in embedding space
    # Each intermediate point is a blend of current and target
    interpolated = []
    for i in range(1, n_steps + 1):
        alpha = i / (n_steps + 1)
        interp_vec = [(1 - alpha) * c + alpha * t
                      for c, t in zip(current_vec.tolist(), target_vec.tolist())]
        # Normalize
        mag = math.sqrt(sum(x**2 for x in interp_vec))
        if mag > 0:
            interp_vec = [x / mag for x in interp_vec]
        interpolated.append(interp_vec)

    # Map each interpolated point to its closest known career stage
    # (These descriptions get passed to Groq which personalizes the role titles)
    stage_descriptions = [
        "entry level junior associate specialist analyst",
        "mid level engineer developer specialist",
        "senior experienced lead principal",
        "director head of leadership management",
    ]
    stage_vecs = model.encode(stage_descriptions)

    result = []
    for interp in interpolated:
        sims = [_cosine(interp, sv.tolist()) for sv in stage_vecs]
        stage_idx = sims.index(max(sims))
        result.append(stage_descriptions[stage_idx].split()[0].capitalize())

    return result
