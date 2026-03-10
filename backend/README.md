# Career Path Generator — Backend API

**Node.js + TypeScript + Express | Supabase PostgreSQL | Redis (Upstash) | JWT Auth**

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your Supabase, Redis, and JWT values

# 3. Push DB schema and generate Prisma client
npx prisma db push
npx prisma generate

# 4. Seed career clusters (22 clusters)
npm run prisma:seed

# 5. Start dev server
npm run dev
```

Server runs at **http://localhost:4000**

---

## 🗺️ API Reference

### Base URL
```
Development:  http://localhost:4000
Production:   https://your-app.onrender.com
```

### Authentication
All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Auth Endpoints (Public)

### POST `/api/auth/register`
Register a new user.

**Request:**
```json
{
  "name": "Ragini Pawar",
  "email": "ragini@example.com",
  "password": "SecurePass123"
}
```

**Response `201`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Ragini Pawar",
    "email": "ragini@example.com",
    "createdAt": "2026-03-10T09:00:00Z"
  }
}
```

**Validation rules:**
- `name`: 2–100 chars
- `email`: valid email
- `password`: min 8 chars, 1 uppercase, 1 number

---

### POST `/api/auth/login`
Authenticate an existing user.

**Request:**
```json
{
  "email": "ragini@example.com",
  "password": "SecurePass123"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid", "name": "Ragini Pawar", "email": "ragini@example.com" }
}
```

---

## 👤 Profile Endpoints (Protected)

### POST `/api/profile`
Save a user career profile.

**Request:**
```json
{
  "skills": ["Python", "Machine Learning", "SQL", "Deep Learning"],
  "domain": "AI/ML",
  "experience": "2-5",
  "lifeStage": "early"
}
```

**`experience` values:** `"0-2"` | `"2-5"` | `"5-10"` | `"10+"`  
**`lifeStage` values:** `"student"` | `"early"` | `"mid"` | `"senior"` | `"transition"`

**Response `201`:**
```json
{
  "profileId": "uuid",
  "saved": true,
  "profile": { ... }
}
```

---

### GET `/api/profile/:id`
Fetch a specific profile (own profiles only).

**Response `200`:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "skills": ["Python", "ML"],
  "domain": "AI/ML",
  "experience": "2-5",
  "lifeStage": "early",
  "createdAt": "2026-03-10T09:00:00Z"
}
```

---

### GET `/api/profile`
List all profiles for the authenticated user.

**Response `200`:**
```json
{
  "profiles": [ ... ],
  "count": 3
}
```

---

## 🗺️ Roadmap Endpoints (Protected)

### POST `/api/roadmap/generate`
Generate a career roadmap using the RAG pipeline.

> ⚡ Results are cached in Redis for 24 hours. Identical profileId returns instantly from cache.

**Request:**
```json
{
  "profileId": "uuid"
}
```

**Response `200`:**
```json
{
  "roadmapId": "uuid",
  "roadmap": {
    "title": "From ML Engineer → Research Scientist",
    "summary": "A 18-month transition roadmap...",
    "steps": [
      {
        "id": "step-1",
        "title": "Strengthen Mathematical Foundations",
        "description": "Focus on linear algebra, probability...",
        "duration": "2 months",
        "skills": ["Linear Algebra", "Probability", "Calculus"],
        "resources": ["CS229 Stanford", "3Blue1Brown"]
      }
    ],
    "probability": 0.78
  },
  "auditScores": [
    { "dimension": "Passion", "score": 8.5, "risk": "low", "explanation": "..." },
    { "dimension": "Skills", "score": 6.2, "risk": "medium", "explanation": "..." }
  ],
  "probability": 0.78,
  "fromCache": false
}
```

---

### GET `/api/roadmap/:id`
Fetch a specific saved roadmap.

---

### GET `/api/roadmap/history/:userId`
Get all past roadmaps for a user (own history only).

**Response `200`:**
```json
{
  "roadmaps": [
    {
      "id": "uuid",
      "profile": { "skills": [...], "domain": "AI/ML" },
      "probability": 0.78,
      "createdAt": "2026-03-10T09:00:00Z"
    }
  ],
  "count": 5
}
```

---

## 📊 Clusters & Analytics (Protected)

### GET `/api/clusters`
Fetch all career clusters sorted by demand score.

**Response `200`:**
```json
{
  "clusters": [
    {
      "id": "uuid",
      "name": "AI/ML Engineering",
      "description": "...",
      "domains": ["tech", "research"],
      "demandScore": 95,
      "growthTrend": "rising",
      "avgSalary": 2200000,
      "topSkills": ["PyTorch", "LLMs", "MLOps"]
    }
  ],
  "demandScores": [
    { "name": "AI/ML Engineering", "demandScore": 95, "growthTrend": "rising" }
  ],
  "fromCache": false
}
```

---

### GET `/api/analytics/summary`
Get dashboard analytics for the authenticated user.

**Response `200`:**
```json
{
  "totalProfiles": 3,
  "totalRoadmaps": 5,
  "latestProbability": 0.78,
  "alignmentDistribution": [
    { "dimension": "Passion", "avgScore": 8.2, "count": 5 },
    { "dimension": "Skills", "avgScore": 6.8, "count": 5 }
  ],
  "lastUpdated": "2026-03-10T09:00:00Z"
}
```

---

## 🏥 Health Check (Public)

### GET `/health`
Check status of all services.

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-10T09:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "rag": "ok"
  }
}
```

---

## ⚠️ Error Responses

All errors follow this format:
```json
{
  "error": "Human-readable error message",
  "details": { }  // optional, only on validation errors
}
```

| Status | Meaning |
|--------|---------|
| `400` | Validation failed — check `details` field |
| `401` | Missing or invalid JWT token |
| `403` | Forbidden — access denied |
| `404` | Resource not found |
| `409` | Conflict (e.g., email already registered) |
| `429` | Rate limit exceeded |
| `503` | Downstream service (RAG) unavailable |

---

## 🗄️ Database Schema

### Tables
| Table | Description |
|-------|-------------|
| `users` | Registered users |
| `profiles` | Career profiles (skills, domain, experience) |
| `roadmaps` | Generated roadmaps + audit scores (JSON) |
| `audit_results` | Individual PASSIONIT/PRUTL scores per roadmap |
| `career_clusters` | 22 seeded career domains with demand scores |

### Key Indexes
```sql
users(email)           -- fast auth lookups
profiles(userId)       -- user's profiles
roadmaps(userId)       -- user's history
roadmaps(profileId)    -- profile → roadmaps
audit_results(roadmapId) -- roadmap → audit
```

---

## 🔴 Redis Caching Strategy

| Cache Key | Data | TTL |
|-----------|------|-----|
| `roadmap:profile:<profileId>` | Generated roadmap + audit | 24 hours |
| `clusters:all` | All career clusters | 1 hour |

Cache miss → calls RAG service → stores result.  
Cache hit → returns immediately (sub-10ms).

---

## 🌐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 4000) |
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 char secret for JWT signing |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 7d) |
| `REDIS_URL` | ✅ | Upstash Redis connection URL |
| `RAG_SERVICE_URL` | ✅ | Person 3's FastAPI service URL |
| `FRONTEND_URL` | ✅ | Allowed CORS origin |

---

## 📦 Tech Stack

- **Runtime:** Node.js 20 + TypeScript 5
- **Framework:** Express 4 + Helmet + CORS + Compression
- **Database:** Supabase PostgreSQL via Prisma ORM
- **Cache:** Redis (Upstash) via ioredis
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **Validation:** Zod
- **Logging:** Custom request logger (timestamp + color coded status)
- **Rate Limiting:** express-rate-limit (200/15min global, 20/15min auth)
