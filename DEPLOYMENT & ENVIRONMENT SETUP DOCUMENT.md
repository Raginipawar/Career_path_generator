# DEPLOYMENT & ENVIRONMENT SETUP DOCUMENT

<div align="center">

**Career Path Generator — AI-Powered Career Transition Platform**

**Project Guide:** Varsh Dange

**Team Members:** Nikhil Shah, Ragini Pawar, Shaktisingh Suryawanshi, Sanat Sanjeev, Sachi Dhoka

</div>

**Technology Stack:** Next.js 16 (Vercel), Node.js / Express / TypeScript (Render), FastAPI / Python (HuggingFace Spaces), PostgreSQL (34.71.87.187), Upstash Redis, ChromaDB

---

## 1. Deployment Objectives

The deployment strategy ensures:
- Stable hosting for all three services on free/low-cost cloud tiers
- Independent scalability of the AI-heavy RAG service
- Secure environment variable management across all services
- Reproducible local development environment for all team members
- Live production environment accessible via public URLs for demonstration

---

## 2. Environment Configuration

### 2.1 Development Environment

**Purpose:** Local development, debugging, and feature testing

**Configuration:**
- Node.js 20+ with npm (backend and frontend)
- Python 3.12 (Anaconda) for RAG service
- PostgreSQL instance at `34.71.87.187:5432` (shared dev/prod DB)
- Upstash Redis (same instance as production)
- ChromaDB running in-process (local persistent storage)

**Ports:**
| Service | Port |
|---|---|
| Frontend (Next.js) | 3017 |
| Backend (Express) | 6017 |
| RAG Service (FastAPI) | 8000 |

**Start Commands:**
```bash
# Frontend
cd career-path-gen && npm install && npm run dev

# Backend
cd backend && npm install && npx prisma generate && npm run dev

# RAG Service
pip install -r requirements.txt
pip install chroma-hnswlib==0.7.5 --prefer-binary
pip install chromadb==0.5.23 --no-deps
python main.py
```

**Usage:** Feature development, manual testing, local API validation

### 2.2 Testing Environment

**Purpose:** Quality assurance, API validation, integration testing

**Configuration:**
- Same local stack as development
- Isolated test profiles (do not use production employee data)
- Postman collection for API endpoint testing
- `demo_employees.xlsx` for bulk upload testing

**Usage:**
- Functional testing of all 20+ API endpoints
- AI model output validation (JSON schema, probability range)
- Excel upload edge case testing (missing fields, duplicate emails)
- PDF export rendering verification

### 2.3 Production / Demo Environment

**Purpose:** Live deployment accessible via public URLs

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | `https://<project>.vercel.app` |
| Backend | Render (Free tier) | `https://<project>.onrender.com` |
| RAG Service | HuggingFace Spaces | `https://nikhil-shah-career-path.hf.space` |
| Database | PostgreSQL VM | `34.71.87.187:5432/career_path_generator` |
| Cache | Upstash Redis | `ruling-mackerel-111736.upstash.io:6379` |

---

## 3. Deployment Architecture

### 3.1 Frontend Deployment (Vercel)

- Next.js app deployed via GitHub integration (auto-deploy on push to `main`)
- Environment variable: `NEXT_PUBLIC_API_URL=https://<backend>.onrender.com`
- Build command: `npm run build`
- Output: Static + server-side rendered pages via Vercel edge network

### 3.2 Backend Deployment (Render)

- Node.js service deployed from `backend/` subdirectory
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `node dist/index.js`
- Server binds to `0.0.0.0:PORT` (Render injects `PORT` env var)
- Health check endpoint: `GET /health`

**Critical:** Server listens **before** DB connection to pass Render's port scan.

### 3.3 RAG Service Deployment (HuggingFace Spaces)

- FastAPI app in `main.py` at repo root
- `requirements.txt` lists all Python dependencies (ChromaDB managed separately)
- ChromaDB persistent storage within HuggingFace Space filesystem
- Space set to **Public** for unauthenticated backend access
- Keep-alive: Backend pings `/health` every 4 minutes to prevent cold sleep

### 3.4 Database Deployment

- PostgreSQL 15 hosted on GCP VM (`34.71.87.187`)
- Tables created via Prisma schema (`npx prisma db push` or manual migration)
- Database: `career_path_generator`
- User: `postgres` / Password: `India@5555`
- All tables indexed by `userId`, `profileId`, `orgId`

---

## 4. Environment Variables

### 4.1 Backend `.env` (`backend/.env`)

```env
PORT=6017
NODE_ENV=development

DATABASE_URL=postgresql://postgres:India%405555@34.71.87.187:5432/career_path_generator

JWT_SECRET=<team-shared-secret>
JWT_EXPIRES_IN=7d

REDIS_URL=rediss://default:<token>@ruling-mackerel-111736.upstash.io:6379
REDIS_TTL_SECONDS=86400

GROQ_API_KEY=<groq-api-key>

RAG_SERVICE_URL=https://nikhil-shah-career-path.hf.space
RAG_TIMEOUT_MS=30000

FRONTEND_URL=http://localhost:3017
```

### 4.2 Frontend `.env.local` (`career-path-gen/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:6017
```

### 4.3 RAG Service `.env` (root `.env`)

```env
PORT=8000
GROQ_API_KEY=<groq-api-key>
REDIS_URL=rediss://default:<token>@ruling-mackerel-111736.upstash.io:6379
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION_NAME=career_docs
```

---

## 5. CI/CD & Automation

| Action | Mechanism |
|---|---|
| Frontend deploy | Vercel auto-deploy on GitHub `main` push |
| Backend deploy | Render auto-deploy on GitHub `main` push |
| RAG deploy | HuggingFace Spaces auto-sync from GitHub (separate HF repo) |
| DB migrations | Manual: `npx prisma db push` from local |
| ChromaDB rebuild | Manual: run embedding scripts in `outputs/` |
| Cache invalidation | Automatic: 24h TTL on all Redis keys |

---

## 6. chroma-hnswlib Installation Note

ChromaDB 0.5.23 requires `chroma-hnswlib==0.7.6` which has no prebuilt wheel for Windows Python 3.12. Install in this order:

```bash
pip install chroma-hnswlib==0.7.5 --prefer-binary
pip install chromadb==0.5.23 --no-deps
pip install -r requirements.txt
```

On HuggingFace Spaces (Linux), standard `pip install -r requirements.txt` works without this workaround.

---

## 7. Security & Privacy Controls

- All API endpoints require JWT bearer token (except `/api/auth/*` and `/health`)
- CORS restricted to `*.vercel.app` + explicit `FRONTEND_URL`
- Rate limiting: 200 req/15min global, 20 req/15min auth routes (express-rate-limit)
- bcrypt (rounds=12) for all passwords
- Helmet.js for HTTP security headers
- RAG service not directly accessible from frontend — backend proxy only
- `.env` files in `.gitignore` — never committed to repository
- Render and Vercel environment variables set via dashboard, not files

---

## 8. Backup & Recovery

| Resource | Backup Strategy |
|---|---|
| PostgreSQL | Manual dump from VM; nightly pg_dump recommended |
| ChromaDB | Committed to HuggingFace Space filesystem; versioned in HF repo |
| Redis | Upstash handles persistence; TTL data is regeneratable |
| Code | Git repository at `github.com/nikhil191206/Career_path_generator` |
| Environment variables | Documented in this file (values stored in team password manager) |

---

## 9. Conclusion

The three-service deployment architecture of Career Path Generator leverages free-tier cloud platforms efficiently:
- Vercel handles global frontend CDN delivery
- Render manages the Node.js backend API with auto-deploy
- HuggingFace Spaces hosts the Python RAG microservice with GPU-ready infrastructure

The setup is fully reproducible locally and deployable to production with a single git push per service.
