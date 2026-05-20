# Career Path Generator — Complete Technical Documentation
### Everything your team needs to present and explain the project

---

## Table of Contents
1. [What We Built — The Big Picture](#1-what-we-built)
2. [System Architecture](#2-system-architecture)
3. [Frontend — Next.js](#3-frontend)
4. [Backend — Node.js + Express](#4-backend)
5. [Database — PostgreSQL via Supabase](#5-database)
6. [RAG Service — FastAPI + Groq](#6-rag-service)
7. [How the RAG Pipeline Works (Step by Step)](#7-rag-pipeline-deep-dive)
8. [The LLM Prompts — What We Ask Llama](#8-the-prompts)
9. [The Audit Framework — PASSIONIT & PRUTL](#9-audit-framework)
10. [Caching Strategy — Redis](#10-caching)
11. [Data Flow — Request to Response](#11-full-data-flow)
12. [Deployment Architecture](#12-deployment)
13. [Key Design Decisions & Why](#13-design-decisions)

---

## 1. What We Built

Career Path Generator is an **AI-powered career roadmapping tool** that:
- Takes a user's professional profile (skills, experience, life stage, goals)
- Searches a knowledge base of 360+ career documents using semantic search
- Sends the relevant context + profile to Groq's LLaMA 3.3 70B model
- Generates a personalized, step-by-step career transition roadmap
- Runs an independent ethical audit on the recommendation
- Displays everything in an interactive visual dashboard

**The core innovation:** We don't just ask an LLM to give career advice. We retrieve domain-specific career knowledge first (RAG), then inject that into the prompt. This grounds the LLM's response in real career data rather than generic advice.

**Live URLs:**
- Frontend: https://career-path-generator-delta.vercel.app
- Backend: https://career-path-generator-qfjz.onrender.com
- RAG Service: https://nikhil-shah-career-path.hf.space

---

## 2. System Architecture

```
User Browser (Next.js on Vercel)
        │
        │ HTTPS API calls
        ▼
Backend API (Node.js/Express on Render)
        │                    │
        │ Prisma ORM          │ HTTP call
        ▼                    ▼
Supabase PostgreSQL    RAG Service (FastAPI on HF Spaces)
                              │              │
                         ChromaDB       Groq LLaMA 3.3
                       (vector store)   (LLM inference)

Redis (Upstash) ←── shared cache ──→ both Backend and RAG Service
```

**Three separate services, each independently deployed:**
| Service | Language | Platform | Port |
|---------|----------|----------|------|
| Frontend | Next.js 16 + TypeScript | Vercel | 3000 (local) |
| Backend API | Node.js + Express + TypeScript | Render | 4000 |
| RAG Service | Python + FastAPI | HuggingFace Spaces | 7860 |

---

## 3. Frontend

### Stack
- **Next.js 16** with App Router
- **React 19**
- **TypeScript** — fully typed, all interfaces match backend exactly
- **Tailwind CSS 4** — green design system (`#004d40` primary)
- **React Flow 11** — interactive node-based roadmap visualizer
- **Recharts 3** — radar chart for audit scores
- **Zustand 5** — global state management with localStorage persistence
- **react-hot-toast** — notifications

### Pages

#### `/` — Landing Page
Static marketing page. Explains the product, shows feature cards and domain badges. Two CTAs: Register and Login.

#### `/auth/register` and `/auth/login`
Registration requires: name, email, password (min 8 chars, 1 uppercase, 1 number).
On success, JWT token is stored in Zustand (persisted to localStorage). User is auto-logged in after registration.

#### `/profile` — 6-Step Profile Wizard
The most complex page. Collects 28 fields across 6 steps:
- **Step 1 — Personal:** Name, age, gender, city, state
- **Step 2 — Education:** Degree, field of study, institution tier (Tier 1/2/3)
- **Step 3 — Career:** Current role, industry, years of experience (slider), employment status, salary (slider)
- **Step 4 — Skills:** Technical skills, soft skills, certifications (tag-based inputs with suggestions)
- **Step 5 — Goals:** Interest domains (multi-select from 20 options), career goal text, work style, relocation preference, target timeline
- **Step 6 — Life Context:** Life stage, burnout level (slider 1-10), stress tolerance, leadership score, dependents, recent life event, work-life priority

**Auto-calculation:** The alignment category (Low/Moderate/High) is computed live on the frontend from burnout and leadership scores — no backend call needed.

**On submit:** Calls POST `/api/profile` → then immediately calls POST `/api/roadmap/generate`. Shows animated loading screen with rotating messages while RAG processes (~15-30 seconds).

#### `/roadmap` — Career Path Visualizer
Displays the generated roadmap using **React Flow**:
- Each career milestone = a node with role title, timeline, salary estimate, risk level, required skills
- Arrows between nodes show the transition path
- Nodes are color-coded by risk (green=Low, yellow=Medium, red=High)
- Interactive: pan, zoom, mini-map, click to expand node details
- Top header shows: current role → target role, success probability %, total timeline in months
- Explanation text from LLM
- Emotional forecast timeline (stress levels at each phase)
- Alternative career paths listed below

#### `/reports` — Ethical Audit Report
Shows the PASSIONIT + PRUTL dual audit:
- Recharts `RadarChart` with two overlapping areas — one for PASSIONIT scores, one for PRUTL scores
- Detailed table: each dimension, score out of 10, risk level (Low/Medium/High), explanation, recommendation, flagged biases
- Green/yellow/red color coding based on risk level

#### `/history` — Past Roadmaps
Lists all previously generated roadmaps for the user. Each card shows: transition path, success probability, timeline, creation date.

### State Management (Zustand)
```typescript
// What's stored globally and persisted to localStorage:
{
  user: { id, name, email, createdAt },
  token: "JWT string",
  profileId: "uuid",
  profileData: { ...all 28 fields },
  roadmapResponse: { roadmap_nodes, audit_scores, ... },
  // isGenerating is NOT persisted — resets to false on every page load
}
```

### API Client (`lib/api.ts`)
Central fetch wrapper that:
1. Reads the JWT token from localStorage
2. Attaches `Authorization: Bearer {token}` header to every request
3. Points to `NEXT_PUBLIC_API_URL` environment variable
4. Throws errors with detailed field-level messages from Zod validation failures

---

## 4. Backend

### Stack
- **Node.js + Express 4.18** — HTTP server
- **TypeScript 5.4** — fully typed
- **Prisma 5.10** — ORM for PostgreSQL
- **Zod 3.22** — request validation schemas
- **bcrypt** — password hashing (12 salt rounds)
- **jsonwebtoken** — JWT creation and verification (7-day expiry)
- **ioredis** — Redis client for caching
- **helmet** — security headers (CSP, XSS protection, clickjacking)
- **express-rate-limit** — 200 req/15min globally, 20 req/15min for auth routes

### API Endpoints

#### Auth Routes (`/api/auth`)
```
POST /api/auth/register
  Input:  { name, email, password }
  Output: { token, user: { id, name, email, createdAt } }
  
POST /api/auth/login
  Input:  { email, password }
  Output: { token, user }
  Security: Timing-attack resistant (hashes dummy password on user-not-found)
```

#### Profile Routes (`/api/profile`) — Auth Required
```
POST /api/profile
  Input:  28-field profile object (Zod validated)
  Output: { profileId, saved: true, profile }
  
GET /api/profile/:id
  Output: full profile object
  
GET /api/profile
  Output: all profiles for the authenticated user
```

#### Roadmap Routes (`/api/roadmap`) — Auth Required
```
POST /api/roadmap/generate
  Input:  { profileId }
  Process: 1. Verify profile belongs to user
           2. Check Redis cache
           3. If miss: call RAG service
           4. Save to DB (roadmapData JSON + auditScores JSON + probability)
           5. Cache result
           6. Return flat response matching RoadmapResponse type
  Output: { roadmapId, roadmap_nodes, roadmap_edges, current_role, target_role,
            success_probability, total_transition_months, explanation,
            emotional_forecast, alternative_paths, audit_scores, fromCache }

GET /api/roadmap/history/:userId
  Output: Array of RoadmapResponse objects (reconstructed from DB)
  
GET /api/roadmap/:id
  Output: single roadmap with profile
```

#### Cluster Routes
```
GET /api/clusters      → 22 career clusters ordered by demand score (1hr cache)
GET /api/analytics/summary → { totalProfiles, totalRoadmaps, alignmentDistribution }
GET /health            → status of DB, Redis, RAG service
```

### Auth Middleware
Every protected route passes through `requireAuth`:
1. Reads `Authorization: Bearer {token}` header
2. Verifies JWT signature using `JWT_SECRET`
3. Attaches `req.user = { userId, email }` for downstream use
4. Returns 401 if missing or invalid

### How the Backend Talks to RAG
The backend acts as a **proxy** between the frontend and the RAG service:
1. Frontend sends `{ profileId }` to backend
2. Backend fetches full profile from DB
3. `prismaToRagProfile()` converts camelCase DB fields to snake_case RAG format
4. Backend POSTs to `https://nikhil-shah-career-path.hf.space/rag/generate`
5. 30-second timeout — returns 503 if RAG is unreachable
6. Saves the full RAG response to DB, caches it in Redis
7. Returns flat response to frontend

**Keep-alive:** The backend pings the RAG health endpoint every 4 minutes to prevent HuggingFace Spaces from hibernating.

---

## 5. Database

### Database: PostgreSQL via Supabase
**Why Supabase:** Free hosted PostgreSQL, instant setup, no infrastructure to manage.

### Schema (5 Tables)

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| name | String | Display name |
| email | String (unique) | Login email |
| password | String | bcrypt hash (never stored plain) |
| createdAt | DateTime | Auto-set |

#### `profiles`
28 columns covering every field the user fills in. Key ones:
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| userId | String (FK → users) | Cascade delete |
| fullName, age, gender | Basic info | |
| highestDegree, fieldOfStudy, institutionTier | Education | Tier 1/2/3 |
| currentRole, currentIndustry, yearsOfExperience | Career | |
| technicalSkills, softSkills, certifications | String[] | PostgreSQL arrays |
| interestDomains | String[] | Multi-select |
| burnoutLevel, stressTolerance, leadershipScore | Float | 1-10 scale |
| alignmentCategory | String | Low/Moderate/High |

#### `roadmaps`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| userId | FK → users | |
| profileId | FK → profiles | |
| roadmapData | JSON | Stores nodes, edges, explanation, emotional forecast, alternative paths |
| auditScores | JSON | Full audit scores array |
| probability | Float | 0.0–1.0 (stored as decimal, displayed as %) |
| createdAt | DateTime | |

#### `career_clusters` (22 rows, seeded)
Stores the 22 career domains with demand scores, growth trends, avg salary, top skills.
Examples: AI/ML Engineering (95 demand), Software Engineering (92), Cybersecurity (91).

#### `audit_results`
Stores individual audit dimension scores per roadmap for analytics queries.
Links to `roadmaps` via `roadmapId`.

### ORM: Prisma
All database operations go through Prisma Client — no raw SQL (except health check: `SELECT 1`).
Schema is in `backend/prisma/schema.prisma`. Changes deployed via `npx prisma db push`.

---

## 6. RAG Service

### What is RAG?
**Retrieval-Augmented Generation** — before asking the LLM to generate a response, we first retrieve relevant documents from our knowledge base and inject them into the prompt. This prevents hallucination and grounds the output in real career data.

Without RAG: "Hey Llama, suggest a career path for this person" → generic advice
With RAG: "Here are 5 relevant career documents about ML Engineering in India. Now suggest a path for this person using this context" → specific, grounded advice

### Stack
- **FastAPI 0.115** — Python web framework
- **sentence-transformers** — local embedding model (all-MiniLM-L6-v2, runs on CPU)
- **ChromaDB 0.5** — vector database (stores document embeddings, enables semantic search)
- **Groq** — LLM API (LLaMA 3.3 70B Versatile, free tier)
- **Redis** — response caching (SHA256 hash of profile as cache key)
- **Pydantic v2** — request/response validation with camelCase↔snake_case aliases

### Knowledge Base
- **360+ career documents** in ChromaDB
- Sources: custom-generated career descriptions covering 60+ domains
- Each document has: `doc_id`, `text` (career description), `metadata` (source, domain, doc_type, role_title, experience_level, region)
- Documents cover domains like: AI/ML, Cybersecurity, FinTech, Cloud/DevOps, Product Management, EdTech, Healthcare IT, etc.

### Auto-Embed on Startup
When the container starts, if ChromaDB collection is empty (e.g., fresh deployment), the service automatically:
1. Reads all JSON files from `data/processed/`
2. Loads 360+ career documents
3. Embeds them using sentence-transformers
4. Stores embeddings in ChromaDB
This ensures the service is always ready even after a fresh deployment.

---

## 7. RAG Pipeline Deep Dive

This is the core logic. Here's exactly what happens when a user clicks "Generate Roadmap":

### Step 1: Profile → Text Conversion
The user's structured profile (28 fields) is converted to a natural language paragraph:
```
"Nikhil Shah, age 22, Male from Pune, Maharashtra. 
Education: B.Tech in Computer Science (Tier 2 institution). 
Currently working as Junior Product Manager in Robotics for 1 year. 
Technical Skills: Python, SQL. Soft Skills: Leadership, Communication. 
Interested in: AI & ML, Product Management. 
Career Goal: Transition to ML leadership. 
Life Stage: Early Career. Burnout Level: 3/10. Stress Tolerance: 7/10..."
```

### Step 2: Profile Embedding
The natural language profile text is converted to a **384-dimensional vector** using `all-MiniLM-L6-v2`.
This vector represents the semantic meaning of the entire profile as a point in mathematical space.

### Step 3: ChromaDB Semantic Search
The profile vector is compared against 360+ pre-embedded career documents using **cosine similarity**.
- First tries domain-filtered search: if user selected "AI & ML", only searches docs tagged with that domain
- If filtered search returns fewer than 3 results, falls back to searching all documents
- Returns the **top 5 most semantically similar** career documents

Example: A profile mentioning "ML, Python, data engineering" would retrieve documents about ML Engineering careers, Data Science transitions, AI team structures — not documents about marketing or HR.

### Step 4: First Groq Call — Generate Roadmap
The system prompt + profile + retrieved documents are combined and sent to **LLaMA 3.3 70B**:
- **System prompt:** "You are an expert Indian career advisor. Generate a realistic, ethically-audited career roadmap in strict JSON format..."
- **User message:** Full profile details + 5 retrieved career documents as context
- **Output format enforced:** JSON with nodes, edges, emotional forecast, alternative paths, probability

The probability calibration rules in the prompt prevent inflated scores:
- Adjacent role: 75-90%
- Cross-functional pivot: 55-70%  
- Major unrelated pivot: 25-45%
- High burnout: subtract 10%
- Empty skills for technical role: subtract 15%

### Step 5: Parse & Validate Roadmap Response
The LLM response is:
1. Stripped of markdown formatting (LLMs sometimes wrap JSON in ```json blocks```)
2. Parsed as JSON
3. Validated against Pydantic models
4. If parsing fails: retried once. If still fails: fallback demo response returned.

### Step 6: Second Groq Call — Ethical Audit
A completely separate LLM call evaluates the generated roadmap:
- **System prompt:** "You are an Ethical Career Recommendation AI Auditor..."
- **Input:** The user's profile + the generated roadmap
- **Output:** 14 audit scores (9 PASSIONIT + 5 PRUTL dimensions), each with score/risk/explanation/flagged_biases

This is an independent evaluation — the LLM is asked to critique the roadmap it just generated.

### Step 7: Cache & Return
- Full response (roadmap + audit) cached in Redis with 24-hour TTL
- Cache key = SHA256 hash of the profile fields (same profile = same cache hit)
- Response returned to backend → saved to DB → returned to frontend

---

## 8. The Prompts

### Roadmap Generation Prompt
**System role:** "Expert Indian career advisor specializing in ethical, data-driven career roadmapping."

**Key instructions to the LLM:**
- Output ONLY valid JSON (no text, no markdown)
- Generate 3-5 nodes (milestone roles), where node 1 is always the current role
- Each node must have: role_title, timeline_months, required_skills, skill_gap, salary_estimate_lpa (Indian market), risk_level
- Edges connect nodes and describe the transition action
- Generate an emotional_forecast (2-4 phases: stress, description, timeline)
- Generate 1-2 alternative_paths
- Probability calibration rules (see Step 4 above)

**What gets injected as context (from ChromaDB):**
```
RELEVANT CAREER KNOWLEDGE:
Document 1 [AI & ML Engineering]:
"Senior ML Engineers in India typically require 3-5 years of Python experience,
 proficiency in TensorFlow/PyTorch, strong statistics background. 
 Salary range: 18-35 LPA at mid-level. High demand in Bangalore, Hyderabad..."

Document 2 [Product Management to Technical PM transition]:
...
```

### Audit Prompt
**System role:** "Ethical Career Recommendation AI Auditor."

**What it evaluates:**
The LLM is given both the profile and the generated roadmap and asked to score 14 dimensions. It specifically looks for:
- High burnout + demanding path = Safety flag
- Dependents + required relocation = Sustainability flag
- Tier 3 institution getting systematically worse recommendations = Non-bias flag
- Salary jump > 100% in < 12 months = Reliability flag

---

## 9. Audit Framework

### PASSIONIT (9 dimensions)
Custom ethical evaluation framework:
| Dimension | What It Checks |
|-----------|----------------|
| **P**urpose | Does the recommendation align with stated goals and life priorities? |
| **A**ccountability | Can the recommendation be traced to specific data and reasoning? |
| **S**afety | Does the path avoid financial or emotional risk without warning? |
| **S**ustainability | Is the path sustainable given the user's life stage and constraints? |
| **I**nclusivity | Does the recommendation work regardless of gender, location, or institution tier? |
| **O**bjectivity | Is it based on skills and market data, not assumptions? |
| **N**on-bias | Are there demographic, geographic, or institutional biases? |
| **I**ntegrity | Is the data used accurate and current? |
| **T**ransparency | Can the user understand WHY this path was recommended? |

### PRUTL (5 dimensions)
| Dimension | What It Checks |
|-----------|----------------|
| **P**rivacy | Is personal data handled appropriately? |
| **R**eliability | Is the recommendation consistent and reproducible? |
| **U**sability | Is the output actionable and clear? |
| **T**rustworthiness | Would a human career counselor agree with this? |
| **L**egality | Does it comply with employment laws and ethical standards? |

**Scoring:** 1-10 scale. 8-10 = Low risk (green), 5-7 = Medium risk (yellow), 1-4 = High risk (red).

---

## 10. Caching

**Why two layers of caching:**
- Groq LLaMA 3.3 calls take 10-25 seconds and count against rate limits
- Generating the same roadmap twice wastes time and API quota
- Redis caches at both layers to prevent redundant calls

### Backend Cache (Redis)
- **Key:** `roadmap:profile:{profileId}` 
- **TTL:** 24 hours
- **What's stored:** Full flat roadmap response (nodes, edges, audit scores, etc.)
- **When used:** Before calling RAG service — if cache hit, return immediately

### RAG Service Cache (Redis)
- **Key:** `rag:roadmap:{sha256_of_profile_fields}`
- **TTL:** 24 hours
- **What's stored:** Full RAG response
- **Key difference:** Uses a hash of profile *field values* (not profileId) — so if two different users have identical profiles, they share a cache entry

**Cache invalidation:** Never manually — just wait for TTL. Profiles rarely change.

---

## 11. Full Data Flow

```
User fills 6-step profile → clicks "Generate Roadmap"
    │
    ▼
Frontend → POST /api/profile (28 fields)
    │
    ▼
Backend validates with Zod → saves to PostgreSQL → returns profileId
    │
    ▼
Frontend → POST /api/roadmap/generate { profileId }
    │
    ▼
Backend checks Redis cache ──→ CACHE HIT? Return immediately (fromCache: true)
    │ CACHE MISS
    ▼
Backend fetches profile from DB
Backend converts to RagProfile (camelCase → snake_case)
Backend → POST https://nikhil-shah-career-path.hf.space/rag/generate
    │
    ▼
RAG Service checks own Redis cache ──→ CACHE HIT? Return immediately
    │ CACHE MISS
    ▼
RAG: Convert profile to natural language text
RAG: Embed text → 384-dim vector (sentence-transformers)
RAG: Query ChromaDB → top 5 semantically similar career docs
    │
    ▼
RAG: First Groq Call (LLaMA 3.3 70B)
    Input: system prompt + profile + 5 docs
    Output: JSON roadmap (nodes, edges, emotional forecast, alternatives, probability)
    │
    ▼
RAG: Parse + validate JSON response
    │
    ▼
RAG: Second Groq Call (LLaMA 3.3 70B)
    Input: audit system prompt + profile + generated roadmap
    Output: 14 audit scores (PASSIONIT + PRUTL)
    │
    ▼
RAG: Cache full response in Redis (24hr TTL)
RAG: Returns response to backend
    │
    ▼
Backend: Saves roadmapData + auditScores to PostgreSQL
Backend: Saves individual AuditResult rows for analytics
Backend: Caches response in Redis (24hr TTL)
Backend: Returns flat response to frontend
    │
    ▼
Frontend: Stores in Zustand (persisted to localStorage)
Frontend: Navigates to /roadmap
Frontend: React Flow renders nodes/edges
Frontend: Recharts renders audit radar
```

---

## 12. Deployment

### Frontend → Vercel
- Auto-deploys from GitHub `main` branch
- Build: `next build` (Next.js static + server components)
- Environment variable: `NEXT_PUBLIC_API_URL=https://career-path-generator-qfjz.onrender.com`
- URL: https://career-path-generator-delta.vercel.app

### Backend → Render (Free Tier)
- Auto-deploys from GitHub `main` branch
- Root directory: `backend/`
- Build: `npm install && npx prisma generate && tsc`
- Start: `node dist/index.js`
- Environment: All secrets (DATABASE_URL, JWT_SECRET, REDIS_URL, etc.) set as Render env vars
- URL: https://career-path-generator-qfjz.onrender.com

### RAG Service → HuggingFace Spaces (Docker)
- Deployed as a Docker container
- `Dockerfile`: Python 3.11, installs requirements, runs `uvicorn main:app --port 7860`
- ChromaDB data: embedded at container startup (auto-embed on first boot)
- Secrets (GROQ_API_KEY, REDIS_URL) set as HF Spaces secrets
- URL: https://nikhil-shah-career-path.hf.space

### Database → Supabase
- Hosted PostgreSQL
- Schema applied via `npx prisma db push`
- 22 career clusters seeded via `npx prisma db seed`

### Redis → Upstash
- Serverless Redis (free tier)
- Shared between backend and RAG service (same REDIS_URL)
- Region: ap-southeast-1 (Singapore)

---

## 13. Key Design Decisions & Why

### Why three separate services (not one)?
- The Python RAG stack (ChromaDB, sentence-transformers, Groq) doesn't run cleanly in Node.js
- Separating them lets each service scale independently
- HuggingFace Spaces is free for Python/Docker but not for Node
- The backend acts as a secure proxy — the frontend never directly talks to the RAG service

### Why RAG instead of pure LLM?
- Pure LLM gives generic advice ("learn Python, get certifications")
- RAG grounds responses in our 360+ document knowledge base about real Indian career transitions
- Prevents hallucination of salary figures, timeline estimates, skill requirements
- Allows updating the knowledge base without retraining the model

### Why Groq instead of OpenAI?
- Groq provides LLaMA 3.3 70B for free (rate limited but usable)
- 10x faster inference than comparable OpenAI models
- For a hackathon, free tier was sufficient

### Why two separate Groq calls (roadmap + audit)?
- Keeps concerns separated — generation and evaluation are different tasks
- If combined, the LLM is "grading its own homework" even more directly
- Separate calls allow different system prompts optimized for each task
- The audit call is specifically prompted to critique, not to encourage

### Why store probability as 0.0–1.0 in DB but show as % in UI?
- Consistent with how probability is typically stored in data systems
- The frontend multiplies by 100 for display
- The history endpoint multiplies back: `Math.round((r.probability ?? 0) * 100)`

### Why Zustand instead of React Context or Redux?
- Much simpler API than Redux
- Built-in persist middleware handles localStorage serialization
- Zero boilerplate compared to Context + useReducer
- `partialize` lets us exclude `isGenerating` from persistence (prevents stuck loading state)

### Why does the history page reconstruct data from DB fields?
- The DB stores `roadmapData` with keys `nodes` and `edges` (not `roadmap_nodes`/`roadmap_edges`)
- The frontend expects `roadmap_nodes` and `roadmap_edges`
- The history endpoint maps between these: `d.nodes → roadmap_nodes`, `d.edges → roadmap_edges`
- `probability` is stored as decimal, converted back to percentage: `Math.round(r.probability * 100)`

---

*Document generated: May 2026 | Career Path Generator V1*
