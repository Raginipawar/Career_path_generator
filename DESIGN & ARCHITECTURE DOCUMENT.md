# DESIGN & ARCHITECTURE DOCUMENT

<div align="center">

**Career Path Generator — AI-Powered Career Transition Platform**

**Project Guide:** Varsh Dange

**Team Members:** Nikhil Shah, Ragini Pawar, Shaktisingh Suryawanshi, Sanat Sanjeev, Sachi Dhoka

</div>

**Technology Stack:** Next.js 16 / React 19, Node.js / Express / TypeScript, FastAPI / Python, PostgreSQL, Redis, ChromaDB, Groq LLaMA 3.3-70b, PyTorch MLP

---

## 1. Technical Approach Document

### 1.1 System Architecture Overview

Career Path Generator follows a **three-service microservice architecture** with a shared PostgreSQL database and Redis cache layer.

```
┌─────────────────────┐    ┌───────────────────────┐    ┌──────────────────────┐
│   Next.js Frontend  │───▶│  Express.js Backend    │───▶│  FastAPI RAG Service │
│   (Vercel :3017)    │    │  (Render :6017)        │    │  (HuggingFace :8000) │
└─────────────────────┘    └───────────────────────┘    └──────────────────────┘
                                       │                          │
                              ┌────────┴────────┐       ┌────────┴────────┐
                              │   PostgreSQL     │       │    ChromaDB     │
                              │   (Supabase)     │       │  (Vector Store) │
                              └─────────────────┘       └─────────────────┘
                                       │
                              ┌────────┴────────┐
                              │  Upstash Redis  │
                              │   (Cache)       │
                              └─────────────────┘
```

**Architecture Advantages:**
- Independent scaling of AI-heavy RAG service
- Frontend deployable to edge CDN (Vercel) for low latency
- Backend handles auth, persistence, and orchestration separately from AI
- ChromaDB isolated in RAG service — no direct DB access from frontend

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 | UI, routing, SSR |
| State | Zustand | Client state management |
| Visualization | ReactFlow 11, Recharts 3 | Career graph, analytics charts |
| Backend | Express.js, TypeScript, Node.js 24 | REST API, auth, orchestration |
| ORM | Prisma 5 | PostgreSQL schema + queries |
| AI / LLM | Groq SDK (LLaMA 3.3-70b) | Roadmap generation, chat, resume parsing |
| RAG | FastAPI, ChromaDB, all-MiniLM-L6-v2 | Document retrieval + LLM context |
| Neural Net | PyTorch MLP | Success probability scoring |
| Ethics | Custom PASSIONIT-PRUTL auditor | 14-dimension ethical audit |
| Graph | NetworkX | Career knowledge graph construction |
| Cache | Upstash Redis | Roadmap TTL caching (24h) |
| Database | PostgreSQL 15 | Users, profiles, roadmaps, organisations |
| Auth | JWT (jsonwebtoken) | Stateless authentication |
| PDF | jsPDF | Client-side PDF generation |

### 1.3 Processing Flow

**Individual User Flow:**
1. Register / Login → JWT issued by Express backend
2. Profile Wizard → 6 steps → POST `/api/profile` → Prisma → PostgreSQL
3. Optional: Resume PDF/image → POST `/api/profile/parse-resume` → Groq VLM → extracted fields
4. Generate Roadmap → POST `/api/roadmap/generate` → Backend checks Redis cache
5. Cache miss → POST to RAG service `/generate` → ChromaDB retrieval → LLaMA generation → neural scoring → PRUTL audit
6. Response stored in Redis (24h TTL) + PostgreSQL
7. Frontend renders ReactFlow graph + sidebar + Sanatan widget
8. Click node → flashcard with skill gap, courses, monthly plan
9. Export PDF → jsPDF client-side generation

**Company Flow:**
1. Company admin registers org → POST `/api/org/register`
2. Upload Excel (29 fields per employee) → POST `/api/org/bulk-upload`
3. Backend creates user accounts + profiles for each employee
4. Background auto-generates roadmaps for employees with career goals
5. Admin views cohort dashboard, clicks employee → full roadmap interface
6. Quick Analysis → instant hire/promote evaluation without account creation

---

## 2. Architecture Decision Document

### 2.1 Decision Rationale

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Full Monolith | Simple, fast dev | Can't scale RAG independently | Rejected |
| Full Microservices | Maximum scalability | Complex for academic deployment | Partial |
| Hybrid (chosen) | RAG isolated, core monolith | Slightly more DevOps | **Selected** |

### 2.2 Monolithic Components (Express Backend)
- User Authentication & JWT management
- Profile creation and storage (Prisma → PostgreSQL)
- Roadmap persistence and progress tracking
- Organisation management and bulk upload
- Redis cache orchestration
- Route proxying to RAG service

### 2.3 Microservice Components (FastAPI RAG)
- ChromaDB vector retrieval (500+ career documents)
- Groq LLaMA roadmap generation with RAG context
- PyTorch MLP neural success probability scoring
- PASSIONIT-PRUTL 14-dimension ethical audit
- NetworkX career knowledge graph traversal
- Resume text parsing

### 2.4 Decision Justification
The RAG service is computationally distinct from the backend — it loads ML models, manages ChromaDB, and makes external LLM calls. Isolating it allows:
- Independent deployment (HuggingFace Spaces free tier)
- Separate scaling without affecting API latency
- Clean separation of Python ML ecosystem from Node.js

---

## 3. Database Schema

```
users          → id, name, email, password, role, orgId
profiles       → id, userId, fullName, age, ..., 30 fields total
roadmaps       → id, userId, profileId, roadmapData (JSON), completedNodes[]
organisations  → id, name, industry, adminId
career_clusters → id, name, domains[], demandScore, growthTrend
demand_snapshots → id, clusterId, demandScore, snapshotDate
audit_results  → id, roadmapId, dimension, score, risk, explanation
```

---

## 4. API Design

### Backend REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | JWT login |
| POST | `/api/profile` | Save profile |
| POST | `/api/profile/parse-resume` | Groq VLM resume extraction |
| POST | `/api/roadmap/generate` | Generate roadmap (via RAG) |
| GET | `/api/roadmap/:profileId` | Fetch existing roadmap |
| PATCH | `/api/roadmap/:id/progress` | Toggle node completion |
| POST | `/api/org/register` | Company registration |
| POST | `/api/org/bulk-upload` | Excel employee upload |
| GET | `/api/org/employees` | List org employees |
| POST | `/api/org/roadmap/generate` | Employee roadmap generation |
| POST | `/api/org/quick-analysis` | Hire/promote evaluation |
| GET | `/api/analytics` | Cohort benchmarking data |
| POST | `/api/chat` | Context-aware AI chat |

### RAG Service Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/generate` | Full roadmap generation |
| POST | `/suggest` | 3 career path suggestions |
| POST | `/audit` | Standalone ethical audit |
| POST | `/chat` | Chat with roadmap context |
| GET | `/health` | Service health check |

---

## 5. Component Architecture

### Frontend Components
```
app/
├── page.tsx              Landing page
├── auth/login/           Personal login
├── auth/register/        Personal register
├── profile/              6-step profile wizard
├── roadmap/              ReactFlow roadmap + Sanatan widget
├── reports/              PASSIONIT-PRUTL audit display
├── history/              Past roadmaps
├── trends/               Market demand charts
├── company/
│   ├── login/            Company login
│   ├── register/         Company + org registration
│   ├── dashboard/        Cohort analytics
│   ├── employee/[id]/    Full employee roadmap
│   └── quick-analysis/   Instant evaluation
components/
├── ui/ExportPDF.tsx      jsPDF export
├── ui/ChatDrawer.tsx     AI chat sidebar
├── ui/CustomNode.tsx     ReactFlow node
└── ui/Navbar.tsx         Navigation
```

---

## 6. Security Design

- JWT tokens (7-day expiry) stored in localStorage for personal, `company-token` for org sessions
- bcrypt (salt rounds 12) for password hashing
- Helmet.js for HTTP header security
- CORS: allow `*.vercel.app` + explicit `FRONTEND_URL`
- Rate limiting: 200 req/15min global, 20 req/15min for auth endpoints
- RAG service accessed only by backend — not directly from frontend
- `.env` files gitignored; environment variables set via Render/Vercel dashboards

---

## 7. Conclusion

The Career Path Generator architecture balances simplicity, AI capability, and ethical accountability. The hybrid approach — monolithic Express backend + FastAPI RAG microservice — enables independent scaling of AI components while keeping the core system maintainable. The three-tier deployment (Vercel + Render + HuggingFace) uses all free/low-cost tiers suitable for academic demonstration and early production use.
