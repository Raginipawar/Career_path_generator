# AI & INTEGRATION COMPONENT DESIGN DOCUMENT

**Project Title:** Career Path Generator — AI-Powered Career Transition Platform
**Team Members:** Nikhil Shah, Ragini Pawar, Shakti Singh, Sanat Jain, Sachi Dhoka
**Technology Stack:** Python / FastAPI (RAG Service), Node.js / Express (Backend), Next.js / React (Frontend), PostgreSQL, ChromaDB, Groq LLaMA 3.3-70b, PyTorch MLP, NetworkX

---

## 1. AI Component Description

### 1.1 Purpose of AI in the System

The AI layer is the core intelligence of the Career Path Generator, enabling:

- **Roadmap Generation:** Retrieve contextually relevant career intelligence from ChromaDB and synthesise a personalised, multi-step career transition plan using Groq LLaMA 3.3-70b
- **Success Probability Scoring:** A PyTorch MLP neural network trained on 14 profile features produces a calibrated probability (0–85%) for each transition
- **Ethical Audit:** The PASSIONIT-PRUTL framework scores every roadmap across 14 ethical dimensions — from algorithmic bias to environmental sustainability
- **Resume Intelligence:** Groq VLM parses uploaded resumes (PDF/image) and extracts structured profile fields
- **Career Suggestions:** RAG-powered 3-path suggestion engine before full generation
- **AI Chat:** Context-aware career advisor using roadmap + profile as memory

The system ensures explainable, accountable, and ethically reviewed AI recommendations.

### 1.2 AI Techniques Used

| Technique | Component | Purpose |
|---|---|---|
| Retrieval-Augmented Generation (RAG) | ChromaDB + LLaMA 3.3-70b | Ground roadmap in real career documents |
| Sentence Embeddings | all-MiniLM-L6-v2 (384-dim) | Vectorise career documents for retrieval |
| Multi-Layer Perceptron (MLP) | PyTorch | Success probability scoring (14 → 64 → 32 → 1) |
| Large Language Model | Groq LLaMA 3.3-70b | Roadmap generation, chat, resume parsing |
| Graph Traversal | NetworkX | Career knowledge graph path-finding |
| Ethical Framework | PASSIONIT-PRUTL | 14-dimension audit scoring per roadmap |
| Feature Normalisation | Scikit-learn StandardScaler | Pre-processing 14 numeric features for MLP |

---

## 2. AI Processing Flow

### 2.1 AI Objective

Automatically analyse a 30-field user profile, retrieve domain-relevant career intelligence, and generate a personalised multi-step roadmap with success probability and ethical audit — fully in under 30 seconds.

### 2.2 Steps in Processing

```
Step 1: Profile Input
        30 fields received: skills, experience, goals, life context, burnout, leadership

Step 2: Feature Engineering
        Build 14-dim feature vector for neural scorer
        Extract skill lists and career goal text for RAG query

Step 3: ChromaDB Retrieval
        Encode [career_goal + domains] → 384-dim MiniLM embedding
        Query ChromaDB top-k=8 most similar career documents
        Documents contain: role descriptions, salary data, skill maps, Indian market data

Step 4: Neural Scoring (PyTorch MLP)
        Input: 14 normalised features
        Forward: 14 → 64 (ReLU) → 32 (ReLU) → 1 (Sigmoid)
        Scale output to calibrated range → success_probability

Step 5: LLM Roadmap Generation (Groq LLaMA 3.3-70b)
        System prompt: PASSIONIT-PRUTL rules + Indian market constraints + dropout rules
        User message: profile summary + RAG context documents + probability bounds
        Output: strict JSON → nodes, edges, emotional_forecast, alternative_paths

Step 6: PASSIONIT-PRUTL Ethical Audit
        14 dimensions scored independently
        Each: score(0-10), risk_level, explanation, recommendation
        Aggregated audit_scores array appended to response

Step 7: Storage & Response
        Full response stored in PostgreSQL (roadmaps.roadmapData JSON)
        Cached in Upstash Redis with TTL=86400s (profileId as key)
        Returned to Express backend → forwarded to frontend
```

### 2.3 Challenges Addressed

| Challenge | Solution |
|---|---|
| Hallucinated salary/role data | RAG grounds LLM in 500+ real career documents |
| Overconfident probability outputs | Neural scorer bounded 5–85%; calibration rules injected in prompt |
| Generic non-India-specific advice | ChromaDB documents curated for Indian job market |
| Dropout candidates unserved | Prompt rules: force vocational/GCC paths, exclude degree-gated roles |
| LLM returns non-JSON | Strict JSON-only system prompt; Pydantic schema validation on response |
| HuggingFace Space cold sleep | Backend pings RAG `/health` every 4 minutes |
| Large skill gap noise | Top-5 skill gaps shown; full list stored for node detail view |

---

## 3. AI Decision Engine Logic

### 3.1 Decision Inputs

| Category | Fields |
|---|---|
| Education | `highestDegree`, `fieldOfStudy`, `institutionTier` |
| Career State | `currentRole`, `currentIndustry`, `yearsOfExperience`, `currentSalaryLpa` |
| Skills | `technicalSkills[]`, `softSkills[]`, `certifications[]` |
| Goals | `careerGoal`, `interestDomains[]`, `targetTimelineYears` |
| Life Context | `burnoutLevel`, `stressTolerance`, `hasDependents`, `lifeStage`, `recentLifeEvent` |
| Preferences | `preferredWorkStyle`, `willingToRelocate`, `workLifePriority` |
| Assessment | `leadershipScore`, `alignmentCategory` |

### 3.2 Neural Scorer — 14 MLP Features

| # | Feature | Computation |
|---|---|---|
| 1 | Skill overlap | Jaccard(currentSkills, targetRoleSkills from KB) |
| 2 | Domain distance | Graph hop count in NetworkX career graph |
| 3 | Experience delta | target_required_exp − yearsOfExperience |
| 4 | Education tier | Tier1=3, Tier2=2, Tier3=1, Dropout=0 |
| 5 | Burnout level | burnoutLevel / 10 (normalised) |
| 6 | Stress tolerance | stressTolerance / 10 |
| 7 | Leadership score | leadershipScore / 10 |
| 8 | Has dependents | Binary 0/1 |
| 9 | Willing to relocate | Binary 0/1 |
| 10 | Target timeline | targetTimelineYears (raw) |
| 11 | Salary bracket | log10(currentSalaryLpa + 1) |
| 12 | Domain match | InterestDomains ∩ TargetDomain / len(InterestDomains) |
| 13 | Life stage | Early=0, Mid=1, Late=2, Break=3 |
| 14 | Certification bonus | min(len(certifications), 3) |

### 3.3 Prompt-Level Calibration Rules

```
Same domain, adjacent role (Dev → Senior Dev):        75–90% → capped at 85%
Cross-functional related (Dev → PM):                   55–70%
Major pivot with transferable skills (MBA → PM):       45–60%
Major pivot few skills (MBA → ML Engineer):            25–45%
Empty technical skills + technical target:             subtract 15%
Years experience < 2 + senior target:                 subtract 10%
Burnout level >= 8:                                    subtract 10%
School Dropout + technical target:                     30–55%
College Dropout + skills-based target:                 45–70%
Never exceed 85% for any transition
```

### 3.4 Explainability Features

- `description` per node: explains WHY that role is the right next step
- `explanation` (roadmap-level): 3–4 sentences referencing user's specific background
- `emotional_forecast`: phase-by-phase stress prediction with named phases
- `audit_scores`: each of 14 PRUTL dimensions has human-readable explanation + recommendation
- `skill_gap` per node: exactly which skills are missing vs already held
- Monthly plan auto-derived: Foundation (Month 1–N/3) → Application → Consolidation

---

## 4. Integration Component Design

### 4.1 Integration Overview

```
Frontend (Next.js)
    │  POST profile → GET roadmap
    ▼
Express Backend (:6017)
    ├── Auth: JWT issue/verify
    ├── Profile: Prisma → PostgreSQL
    ├── Cache: Upstash Redis check
    └── RAG Proxy: POST → FastAPI RAG Service (:8000)
            ├── ChromaDB retrieval (all-MiniLM-L6-v2)
            ├── PyTorch MLP scoring
            ├── Groq LLaMA 3.3-70b generation
            └── PASSIONIT-PRUTL audit
    ├── Store result: PostgreSQL + Redis
    └── Return JSON to frontend
```

### 4.2 API Contract

| Backend → RAG | Request Body | Response |
|---|---|---|
| `POST /generate` | `{profile_dict, prob_min, prob_max}` | Full roadmap JSON |
| `POST /suggest` | `{profile_dict}` | Array of 3 path suggestions |
| `POST /audit` | `{profile_dict, roadmap}` | 14-dimension audit_scores |
| `POST /chat` | `{message, profile_id, roadmap_id}` | AI reply text |
| `GET /health` | — | `{status: "ok", services: {db, redis, rag}}` |

### 4.3 Error Handling

| Scenario | Behaviour |
|---|---|
| RAG timeout > 30s | 503 returned; user shown friendly retry message |
| LLM returns non-JSON | Retry once; log error; return structured 500 |
| ChromaDB 0 results | Continue with empty context; LLM generates from profile alone |
| Neural scorer exception | Fall back to prompt-only probability bounds |
| Redis unavailable | Bypass cache silently; query RAG directly |
| HuggingFace Space sleeping | Keep-alive ping every 4 min; first request may take 30–60s |

### 4.4 Security

- RAG service URL (`RAG_SERVICE_URL`) stored in backend `.env` only — not accessible from frontend
- Only serialised profile data passed to RAG — no raw passwords or JWT tokens
- Pydantic schema validates RAG response before storing to DB
- HTTPS enforced on all inter-service calls in production

---

## 5. PASSIONIT-PRUTL Ethical Audit Framework

### 5.1 14 Audit Dimensions

| # | Dimension | Framework | What It Audits |
|---|---|---|---|
| 1 | Passion Alignment | PASSIONIT-P | Career goal vs stated interests match |
| 2 | Authenticity | PASSIONIT-A | Roadmap reflects actual skills, not wishful |
| 3 | Social Impact | PASSIONIT-S | Role contributes positively to society |
| 4 | Sustainability | PASSIONIT-S | Long-term career viability |
| 5 | Innovation Exposure | PASSIONIT-I | Path includes emerging tech/practices |
| 6 | Network Leverage | PASSIONIT-N | Community and professional growth |
| 7 | Income Trajectory | PASSIONIT-I | Fair, realistic salary progression |
| 8 | Tenacity Factor | PASSIONIT-T | Accounts for setbacks and resilience |
| 9 | Purpose Alignment | PRUTL-P | Values and meaning in work |
| 10 | Respect for People | PRUTL-R | Ethical treatment in recommended roles |
| 11 | Uniqueness of Path | PRUTL-U | Leverages candidate's distinctive strengths |
| 12 | Trust & Honesty | PRUTL-T | Recommendation is honest, not manipulative |
| 13 | Love / Wellbeing | PRUTL-L | Work-life balance and emotional health |
| 14 | Algorithmic Fairness | GCC-ESG | No bias against gender, dropout status, or tier |

---

## 6. AI Quality & Validation

| Quality Metric | Target | Validation |
|---|---|---|
| JSON schema compliance | 100% | Pydantic model on every generation |
| Neural scorer range | 5 ≤ P ≤ 85 | Unit test with edge profiles |
| Roadmap node count | 3–5 | Assertion in `generator.py` |
| PRUTL dimensions | All 14 present | `len(audit_scores) == 14` assertion |
| RAG retrieval relevance | Top-8 domain-matched | Manual spot-check of retrieved docs |
| LLM latency (p95) | < 25 seconds | Measured at Groq API level |
| Cache hit rate | > 60% on demo | Upstash dashboard metric |

---

## 7. Conclusion

The AI & Integration Component delivers personalised, grounded, and ethically audited career roadmaps. Key strengths:

- **RAG grounding** prevents hallucination with 500+ real career documents
- **Neural scoring** provides calibrated probability beyond simple rules
- **PASSIONIT-PRUTL audit** makes ethical accountability a built-in feature
- **Seamless REST integration** between all three services with fallback handling
- **Inclusive design** — dropout-specific rules ensure the AI serves non-traditional candidates
