# Career Path Generator

An intelligent, RAG-powered career roadmapping system that goes beyond generic advice understanding your profile, life stage, and market demand to generate personalized, ethically-audited career transition roadmaps using Groq LLaMA 3 and ChromaDB.

---

## Table of Contents

| Section | Reference |
|---------|-----------|
| [What This Project Delivers](#what-this-project-delivers) | Capabilities and output overview |
| [System Architecture](#system-architecture) | Full pipeline breakdown |
| [Project Modules](#project-modules) | Five-module system breakdown |
| &emsp;[Module 1 — User Profile Engine](#module-1--user-profile-engine) | Profile input and scoring |
| &emsp;[Module 2 — RAG Pipeline](#module-2--rag-pipeline) | Retrieval-Augmented Generation |
| &emsp;[Module 3 — LLM Roadmap Generator](#module-3--llm-roadmap-generator) | Groq LLaMA 3 generation |
| &emsp;[Module 4 — Ethical Audit](#module-4--ethical-audit) | PASSIONIT / PRUTL framework |
| &emsp;[Module 5 — Data Pipeline](#module-5--data-pipeline) | Knowledge base and scraping |
| [How the Modules Work Together](#how-the-modules-work-together) | Combined pipeline flow |
| [Tech Stack](#tech-stack) | Technologies and tools used |
| [Team](#team) | Roles and responsibilities |
| [Data Layer](#data-layer) | Knowledge base statistics |
| [API Contracts](#api-contracts) | Endpoint definitions |
| [Deployment](#deployment) | Infrastructure overview |
| [Future Scope](#future-scope) | Planned enhancements |

---

## What This Project Delivers

Career Path Generator is a **five-module AI pipeline** that takes any user profile and delivers:

- **Personalized Career Roadmaps** — A 3-year milestone-based transition plan grounded in real market data, not hallucinated advice.
- **RAG-Powered Recommendations** — Retrieves the most relevant career documents from a 500+ document knowledge base before generating any output. Every recommendation is grounded.
- **Life-Stage Awareness** — A new parent, a burned-out engineer, and a recent graduate get fundamentally different recommendations for the same target role. The system understands context.
- **Ethical AI Audit** — Every roadmap is evaluated against PASSIONIT (Purpose, Accountability, Safety, Sustainability, Inclusivity, Objectivity, Non-bias, Integrity, Transparency) and PRUTL (Privacy, Reliability, Usability, Trustworthiness, Legality) frameworks.
- **Bias Detection** — The system flags if recommendations are influenced by institution tier, geography, or gender — and explains why.
- **India-Calibrated Data** — Salary benchmarks in LPA, city-level demand scores, GCC-specific paths, and Indian market trends throughout.

---

## System Architecture

```
User (Browser)
       ↓
Next.js 15 (Frontend + SSR)
       ↓
Node.js + Express (Backend API)
       ↓              ↓               ↓
 Supabase DB      Redis Cache      FastAPI (Python)
 (PostgreSQL)    (LLM caching)          ↓
                               sentence-transformers
                                        ↓
                                   ChromaDB
                                 (vector search)
                                        ↓
                              Groq LLaMA 3 (LLM)
                                        ↓
                            Career Roadmap + Ethical Audit
```

---

## Project Modules

### Module 1 — User Profile Engine

**What it does:**
Collects and structures the user's complete profile — skills, experience, life stage, burnout level, career goals, and personal context. Computes derived scores used downstream.

**Key profile fields:**
- `technical_skills` / `soft_skills` / `certifications` — skill inventory
- `life_stage` — Early Career / Mid Career / Career Break / Re-entering
- `burnout_level` (1–10) — adjusts recommended transition difficulty
- `recent_life_event` — New Parent / Layoff / Health Issue / Relocation
- `institution_tier` — Tier 1 / 2 / 3 — flagged in bias audit
- `leadership_score` — computed from experience + certifications + role seniority

**Why it matters:**
The profile is the query. Everything downstream — retrieval, generation, audit — is personalized based on what this module captures. A shallow profile produces a generic roadmap. A rich profile produces a precise one.

**Output:** Structured JSON profile stored in Supabase, passed to RAG pipeline on roadmap generation request.

---

### Module 2 — RAG Pipeline

**What it does:**
Converts the user profile into a vector embedding, searches the knowledge base for the most relevant career documents, and returns the top-5 context chunks to the LLM.

**How retrieval works:**
- User profile → `all-MiniLM-L6-v2` (sentence-transformers) → 384-dimension vector
- Vector query → ChromaDB similarity search → top-5 relevant career docs retrieved
- Metadata filtering by `domain` and `doc_type` before ranking — prevents cross-domain noise
- Retrieved docs passed as grounded context to Groq LLaMA 3

**Knowledge base document types:**

| Type | Count | Description |
|------|-------|-------------|
| `role_description` | ~150 | Day-to-day responsibilities, success metrics |
| `transition_path` | ~100 | Step-by-step career change guides |
| `skill_requirements` | ~100 | Technical + soft skills per role |
| `salary_data` | ~50 | LPA benchmarks by role, city, experience |
| `industry_trend` | ~50 | Market demand, growth projections |
| `career_story` | ~50 | Real anonymized transition narratives |

**Why it matters:**
Without RAG, the LLM hallucinates salary figures and invents transition timelines. With RAG, every roadmap is grounded in actual career data. This is what makes the system industry-grade.

**Output:** Top-5 retrieved document chunks with metadata, ready for LLM injection.

---

### Module 3 — LLM Roadmap Generator

**What it does:**
Takes the user profile + retrieved RAG context and generates a structured 3-year career transition roadmap with milestone nodes, skill gaps, salary projections, and emotional adjustment forecast.

**Output structure:**

| Field | Description |
|-------|-------------|
| `current_role` | Starting node |
| `target_role` | Final destination node |
| `transition_path` | Array of milestone objects with timeline, skills, salary |
| `success_probability` | Float 0–100 |
| `skill_gap` | What the user needs to acquire |
| `emotional_adjustment_forecast` | Stress curve over transition timeline |
| `alternative_paths` | 1–2 alternate route options |
| `explanation` | LLM reasoning for this specific path |

**Why it matters:**
This is the user-facing output. The React Flow roadmap visualizer parses this JSON into an interactive node graph. The quality of this output determines the product's value.

**Output:** Structured JSON roadmap stored in Supabase, cached in Redis, rendered in React Flow on the frontend.

---

### Module 4 — Ethical Audit

**What it does:**
Sends the generated roadmap back to Groq with a specialized audit prompt that evaluates the recommendation against PASSIONIT and PRUTL ethical frameworks.

**PASSIONIT dimensions:**
`Purpose` · `Accountability` · `Safety` · `Sustainability` · `Inclusivity` · `Objectivity` · `Non-bias` · `Integrity` · `Transparency`

**PRUTL dimensions:**
`Privacy` · `Reliability` · `Usability` · `Trustworthiness` · `Legality`

**Audit output per dimension:**

| Field | Description |
|-------|-------------|
| `dimension` | PASSIONIT / PRUTL dimension name |
| `score` | Integer 1–10 |
| `risk_level` | Low / Medium / High |
| `explanation` | Why this score |
| `recommendation` | What to improve |
| `flagged_biases` | e.g. "Tier-1 institution over-weighted" |

**Why it matters:**
Most career recommendation systems are black boxes. The ethical audit makes this system explainable and trustworthy — users can see exactly why a recommendation was made and whether it is biased. This is the project's strongest differentiator.

**Output:** Audit scores table rendered in the Reports tab. Bias flags shown prominently.

---

### Module 5 — Data Pipeline

**What it does:**
Builds and maintains the knowledge base that powers the RAG system. Sources career data from multiple origins, cleans and normalizes it into a unified format, and ingests it into ChromaDB as vector embeddings.

**Data sources:**

| Source | Data Type | Volume |
|--------|-----------|--------|
| O\*NET API | Career descriptions, skill requirements | 30+ occupations |
| BLS API | Growth trends, demand scores | All 25 clusters |
| Kaggle Datasets | Career transition paths, job skills | 200+ records |
| Crawl4AI (Naukri/LinkedIn) | Live job listings | 1000+ listings |
| Manual Curation | Transition stories, India-specific context | 90+ documents |

**Document JSON format:**
```json
{
  "text": "Full career content — 200 to 400 words",
  "metadata": {
    "doc_id": "doc_001",
    "source": "Manual | O*NET | BLS | Naukri | LinkedIn | Kaggle",
    "domain": "AI & ML | Cybersecurity | EdTech | Product Management | ...",
    "doc_type": "role_description | transition_path | skill_requirements | salary_data | industry_trend | career_story",
    "role_title": "Machine Learning Engineer",
    "experience_level": "Entry | Mid | Senior | Leadership",
    "region": "India | Bangalore | Mumbai | Global",
    "last_scraped": "2026-03-08"
  }
}
```

**Why it matters:**
The RAG pipeline is only as good as the knowledge base. Without accurate, well-tagged career documents, retrieval returns irrelevant results and the LLM generates generic advice. This module is the foundation of everything.

**Output:** 500+ embedded documents in ChromaDB, 25 career clusters in Supabase, 1000 synthetic user profiles for testing.

---

## How the Modules Work Together

```
User fills Profile Form
         ↓
Module 1: Profile Engine → structured profile JSON
         ↓
Check Redis Cache → if hit, return cached roadmap instantly
         ↓ (cache miss)
Module 2: RAG Pipeline
  → sentence-transformers embeds profile
  → ChromaDB retrieves top-5 relevant career docs
         ↓
Module 3: LLM Generator
  → Groq LLaMA 3 receives profile + retrieved docs
  → generates structured roadmap JSON
         ↓
Module 4: Ethical Audit
  → second Groq call with PASSIONIT/PRUTL prompt
  → returns dimension scores + bias flags
         ↓
Store in Supabase → cache in Redis
         ↓
Frontend renders:
  React Flow  →  interactive roadmap visualizer
  Recharts    →  skill gap radar + demand scores
  Reports tab →  ethical audit table
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 + Tailwind CSS + TypeScript | SSR, routing, UI |
| Roadmap Visualizer | React Flow | Interactive career node graph |
| Charts | Recharts | Dashboard analytics, skill radar |
| Backend | Node.js + Express + TypeScript | REST API, business logic |
| Validation | Zod | Request/response schema validation |
| Auth | Supabase Auth + JWT + bcrypt | Login, sessions, security |
| Database | Supabase PostgreSQL | Users, clusters, roadmaps, audits |
| Cache | Redis (Upstash free tier) | LLM response caching, rate limit buffer |
| RAG Service | FastAPI (Python) | Wraps RAG pipeline, called by Node backend |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Local, free, 384-dim vectors |
| Vector Store | ChromaDB | Stores and retrieves career doc embeddings |
| LLM | Groq LLaMA 3 (free tier) | Roadmap generation + ethical audit |
| Web Scraping | Crawl4AI | Job boards → clean LLM-ready markdown |
| Data Sources | O\*NET API + BLS API + Kaggle | Career knowledge base |

**Total infrastructure cost: ₹0**

---

## Team

| Member | Role | Owns |
|--------|------|------|
| Sanat | Frontend Engineer | Next.js UI, all 4 pages, React Flow, Recharts |
| Nikhil | Backend Engineer | Node.js + Express, Supabase schema, Redis, Auth |
| Sachi | AI / RAG Engineer | FastAPI, ChromaDB, sentence-transformers, Groq |
| Ragini | Data Engineer | Knowledge base, O\*NET/BLS/Kaggle, Crawl4AI, synthetic profiles |
| Shakti | DevOps / Integration | Vercel, Render, HuggingFace Spaces, Docker, GitHub Actions |

**Institution:** VIT Pune — CSE (AI & ML), Batch 2028

---

## Data Layer

| Dataset | Count | Description |
|---------|-------|-------------|
| Career Documents | 500+ | RAG knowledge base across all domains |
| Career Clusters | 25 | All major Indian career domains with LPA salary data |
| Synthetic User Profiles | 1000 | India-realistic test profiles |
| Job Listings | 1000+ | Scraped from Naukri, LinkedIn, Indeed |

**Career domains covered:**
AI & ML · Cybersecurity · Product Management · EdTech · Cloud & DevOps · FinTech · Healthcare IT · UI/UX Design · Data Analytics · Full Stack · HR Tech · ESG · Legal Tech · Supply Chain · GCC Leadership · Entrepreneurship · Embedded/IoT · Research & Academia · Gaming · Finance · Content & Creator · Consulting · Civil Engineering · Sales & BD

---

## API Contracts

### Backend → Frontend

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/auth/register` | POST | `{ name, email, password }` | `{ token, user }` |
| `/api/auth/login` | POST | `{ email, password }` | `{ token, user }` |
| `/api/profile` | POST | profile object | `{ profileId, saved: true }` |
| `/api/profile/:id` | GET | profileId | profile object |
| `/api/roadmap/generate` | POST | `{ profileId }` | `{ roadmap, auditScores, probability }` |
| `/api/roadmap/:id` | GET | roadmapId | saved roadmap object |
| `/api/clusters` | GET | — | `{ clusters[], demandScores[] }` |

### RAG Microservice → Backend

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/rag/generate` | POST | `{ profile, topK: 5 }` | `{ roadmap, explanation, auditScores }` |
| `/rag/embed` | POST | `{ text: string }` | `{ embedding: float[] }` |
| `/rag/health` | GET | — | `{ status: 'ok', chromadb: 'ok', groq: 'ok' }` |

---

## Deployment

| Service | Platform | Cost |
|---------|----------|------|
| Frontend + Backend | Vercel (Next.js native) | Free |
| Python RAG Microservice | Hugging Face Spaces (Docker) | Free |
| Database | Supabase (free tier) | Free |
| Vector Store | ChromaDB (inside HF Space) | Free |
| Cache | Redis — Upstash (10k req/day) | Free |
| Scraping | Crawl4AI (self-hosted) | Free |

---

## Future Scope

- Multi-language support for regional Indian languages (Hindi, Tamil, Telugu)
- Integration with LinkedIn API for automatic profile import
- Real-time job matching against live Naukri/LinkedIn postings
- Cohort benchmarking — compare your profile against peers with similar backgrounds
- Mobile app with push notifications for roadmap milestone reminders
- Fine-tuned LLM on Indian career transition data for higher accuracy
- Employer-side portal for companies to discover career-ready candidates
