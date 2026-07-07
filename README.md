# Career Path Generator — for KALKI AI

> AI-powered career roadmap system with semantic retrieval, a 14-dimension ethical audit engine, and a knowledge graph — built as a full-stack research project.

---

## What it does

Users input their current skills, domain, and experience level. The system:

1. **Classifies** the career goal into one of 25 domains using a two-stage semantic classifier (keyword override → embedding cosine similarity)
2. **Retrieves** the top-K most relevant documents from a 360-doc ChromaDB corpus via all-MiniLM-L6-v2 embeddings
3. **Scores** career transition probability using a 3-layer PyTorch MLP (7→32→16→1)
4. **Audits** the roadmap across 14 ethical dimensions (PASSIONIT + PRUTL framework) — zero LLM calls, fully deterministic
5. **Narrates** the final roadmap using Groq LLaMA-3.3-70B (called exactly twice per non-cached request)
6. **Caches** results in Redis by SHA-256 content hash (24h TTL, ~45× speedup on cache hits: 2.24s → 0.05s)

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Next.js 16 Frontend (React 19, Zustand, ReactFlow)        │
│  Landing page · Profile form · Roadmap visualizer          │
└──────────────────────────┬─────────────────────────────────┘
                           │ REST
┌──────────────────────────▼─────────────────────────────────┐
│  Express Backend (Node.js / TypeScript)                    │
│  Auth (JWT + bcrypt) · Prisma ORM · Redis cache layer      │
│  Supabase PostgreSQL · Render.com deployment               │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼─────────────────────────────────┐
│  RAG Microservice (Python / FastAPI)                       │
│  ChromaDB · all-MiniLM-L6-v2 · NetworkX knowledge graph    │
│  PyTorch MLP · PASSIONIT/PRUTL audit · Groq LLaMA-3.3-70B │
│  Deployed on Hugging Face Spaces                           │
└────────────────────────────────────────────────────────────┘
```

---

## Technical Highlights

| Feature | Detail |
|---|---|
| Embedding model | `all-MiniLM-L6-v2` (384-dim, 6-layer transformer) |
| Vector store | ChromaDB, 360 documents, 25 career domains |
| Domain classifier | Two-stage: keyword override (+0.45 boost) → cosine similarity |
| Knowledge graph | NetworkX DiGraph, 95 nodes, 70 edges, density 0.0078 |
| Probability head | PyTorch MLP (7→32→16→1, Xavier-uniform init) |
| Ethical audit | 14-dim PASSIONIT+PRUTL, fully deterministic, 0 LLM calls |
| LLM | Groq LLaMA-3.3-70B, called max 2× per uncached request |
| Cache | Redis SHA-256 content hash, 24h TTL, ~45× hit speedup |
| Domain classification accuracy | 28/28, avg confidence 0.87 |
| Avg latency | ~2.24s uncached, ~0.05s cached |

---

## Stack

**RAG Service** — Python 3.11, FastAPI, ChromaDB, sentence-transformers, PyTorch, NetworkX, Groq SDK, Redis

**Backend API** — Node.js 20, TypeScript, Express 4, Prisma, Supabase PostgreSQL, Redis (Upstash), JWT, Zod

**Frontend** — Next.js 16, React 19, Tailwind CSS v4, Zustand, ReactFlow, Recharts, jsPDF

**Infrastructure** — Docker, Hugging Face Spaces (RAG), Render.com (backend), Vercel (frontend)

---

## Repo Structure

```
Career_path_generator/
├── main.py               # FastAPI app entry point
├── config.py             # Settings (pydantic-settings)
├── models.py             # Pydantic request/response schemas
├── requirements.txt
├── Dockerfile            # HF Spaces container
├── render.yaml           # Render.com deployment config
│
├── rag/
│   ├── embedder.py       # ChromaDB init, sentence-transformer loader
│   ├── retriever.py      # Semantic retrieval + two-stage domain classifier
│   ├── generator.py      # Groq roadmap generation + PASSIONIT/PRUTL audit
│   ├── knowledge_graph.py # NetworkX DiGraph from ChromaDB metadata
│   ├── neural_scorer.py  # PyTorch MLP probability head
│   ├── suggester.py      # Career path suggestion engine
│   └── cache.py          # Redis SHA-256 content-hash cache
│
├── data/                 # 360-doc ChromaDB corpus (JSON)
│
├── backend/              # Express API (Node.js / TypeScript)
│   ├── src/
│   │   ├── routes/       # auth, profile, roadmap, clusters, analytics
│   │   ├── middleware/   # JWT auth, rate limiter, error handler
│   │   └── services/     # RAG proxy, Redis cache, Prisma client
│   └── prisma/
│       └── schema.prisma
│
└── career-path-gen/      # Next.js frontend
    └── app/              # App Router pages
```

---

## Running Locally

### RAG Service (Python)

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
# → http://localhost:7860
```

Requires: `GROQ_API_KEY`, `REDIS_URL` (optional — service degrades gracefully without Redis)

### Backend API (Node.js)

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, REDIS_URL, RAG_SERVICE_URL

npx prisma db push
npx prisma generate
npm run prisma:seed    # seeds 22 career clusters

npm run dev
# → http://localhost:4000
```

### Frontend (Next.js)

```bash
cd career-path-gen
npm install
npm run dev
# → http://localhost:3017
```

---

## Live Deployment

| Service | URL |
|---|---|
| RAG Microservice | https://nikhil-shah-career-path.hf.space |
| Backend API | Render.com |

---

## License

MIT
