# TEST STRATEGY & QUALITY ASSURANCE DOCUMENT

**Project Title:** Career Path Generator — AI-Powered Career Transition Platform
**Team Members:** Nikhil Shah, Ragini Pawar, Shakti Singh, Sanat Jain, Sachi Dhoka
**Technology Stack:** Node.js / Express / TypeScript, Next.js / React, FastAPI / Python, PostgreSQL, ChromaDB, Groq LLaMA 3.3-70b, PyTorch MLP

---

## 1. Testing & Quality Assurance Overview

The QA objective is to ensure:
- Correct functionality of all 20+ API endpoints
- Accuracy of AI roadmap generation (JSON schema, probability range, node count)
- Reliability of PASSIONIT-PRUTL ethical audit (all 14 dimensions populated)
- Security of JWT authentication and role-based access control
- Performance of RAG service under expected load
- Usability of the ReactFlow roadmap interface
- Correctness of company Excel bulk upload (edge cases, duplicate handling)
- PDF export completeness and formatting

The QA process covers **traditional software testing**, **AI model validation**, and **ethical audit verification**.

---

## 2. Test Strategy

### 2.1 Testing Objectives

| Objective | Coverage Area |
|---|---|
| Profile form saves all 30 fields correctly | Backend / DB |
| Resume parsing extracts correct fields via Groq VLM | RAG Service |
| RAG retrieval returns domain-relevant documents | ChromaDB |
| Roadmap JSON matches expected schema | RAG Service |
| Neural scorer outputs probability in 5–85% range | PyTorch MLP |
| All 14 PASSIONIT-PRUTL dimensions scored | Ethical Auditor |
| JWT authentication works for personal and company sessions | Backend Auth |
| Company Excel upload handles 12+ employees without error | Backend / DB |
| PDF export contains all roadmap sections | Frontend |
| Dropout UX hides irrelevant fields | Frontend |

### 2.2 Types of Testing

| Type | Description | Tools |
|---|---|---|
| Unit Testing | Individual functions: JWT verify, profile validation, MLP forward pass | Jest, PyTest |
| Integration Testing | API → DB chain: profile save, roadmap store, roadmap retrieve | Supertest |
| AI Model Validation | Roadmap JSON schema, probability bounds, node count (3–5) | PyTest + Pydantic |
| End-to-End Testing | Full flow: register → profile → generate → PDF | Manual / Playwright |
| API Testing | All REST endpoints: request/response validation | Postman |
| Security Testing | JWT auth, CORS, rate limiting, input injection | Manual + Postman |
| Performance Testing | RAG response time, Redis cache hit rate | Postman timing, Upstash dashboard |
| Usability Testing | Profile wizard flow, ReactFlow graph, mobile responsiveness | Manual browser testing |
| Excel Upload Testing | 12-employee demo file, missing fields, duplicate emails | Manual API |

---

## 3. Test Case Inventory

### 3.1 Authentication

| Test ID | Test Case | Expected Result |
|---|---|---|
| AUTH-01 | Register with valid email/password | 201 + JWT returned |
| AUTH-02 | Register with duplicate email | 409 Conflict |
| AUTH-03 | Login with correct credentials | 200 + JWT returned |
| AUTH-04 | Login with wrong password | 401 Unauthorized |
| AUTH-05 | Access protected route without JWT | 401 Unauthorized |
| AUTH-06 | Access company route with personal JWT | 403 Forbidden |

### 3.2 Profile Wizard

| Test ID | Test Case | Expected Result |
|---|---|---|
| PROF-01 | Submit complete 30-field profile | 201 + profileId returned |
| PROF-02 | Submit profile with missing required fields | 400 with field errors |
| PROF-03 | Upload PDF resume → Groq VLM parsing | Extracted fields pre-fill form |
| PROF-04 | Select School Dropout → form personalisation | Institution Tier hidden, field renamed |
| PROF-05 | Select College Dropout → form personalisation | Student option removed from employment |
| PROF-06 | Import GitHub username → skills populated | technicalSkills array updated |

### 3.3 Roadmap Generation

| Test ID | Test Case | Expected Result |
|---|---|---|
| RMP-01 | Generate roadmap for valid profile | JSON with 3–5 nodes, edges, forecast |
| RMP-02 | Generated JSON schema validates | All required fields present |
| RMP-03 | Success probability in range | 5 ≤ probability ≤ 85 |
| RMP-04 | All 14 PRUTL dimensions in audit | audit_scores.length === 14 |
| RMP-05 | Second generate for same profile | Returns Redis cache (fromCache: true) |
| RMP-06 | Dropout profile → no degree-gated roles | No "CA", "MBBS", "IAS" in role titles |
| RMP-07 | Burnout ≥ 8 → lower probability | probability reduced vs non-burnout equivalent |

### 3.4 Company Features

| Test ID | Test Case | Expected Result |
|---|---|---|
| ORG-01 | Register organisation | 201 + orgId returned |
| ORG-02 | Upload demo_employees.xlsx (12 employees) | 12 created, 0 errors |
| ORG-03 | Upload same file again | 12 skipped (idempotent) |
| ORG-04 | Upload file with missing email column | 400 + clear error message |
| ORG-05 | Employee roadmap page loads full ReactFlow | Same interface as personal roadmap |
| ORG-06 | Quick Analysis with valid profile | Verdict + roadmap returned |
| ORG-07 | Company admin cannot access another org's employees | 403 Forbidden |

### 3.5 PDF Export

| Test ID | Test Case | Expected Result |
|---|---|---|
| PDF-01 | Export personal roadmap | PDF downloads with candidate name (not "Candidate") |
| PDF-02 | PDF contains all roadmap nodes | 3–5 steps in PDF |
| PDF-03 | PDF contains ethical audit table | 14 rows in audit section |
| PDF-04 | Export company employee roadmap | PDF downloads with employee name |
| PDF-05 | Export quick analysis | PDF downloads with candidate name |

---

## 4. Test Execution Matrix

| Module | Unit | Integration | E2E | Security | Performance |
|---|---|---|---|---|---|
| Auth | ✓ | ✓ | ✓ | ✓ | - |
| Profile | ✓ | ✓ | ✓ | - | - |
| RAG Generation | ✓ | ✓ | ✓ | - | ✓ |
| Neural Scorer | ✓ | ✓ | - | - | - |
| PRUTL Audit | ✓ | ✓ | ✓ | - | - |
| Company Upload | - | ✓ | ✓ | ✓ | ✓ |
| PDF Export | - | - | ✓ | - | - |
| ReactFlow UI | - | - | ✓ | - | - |
| Redis Cache | - | ✓ | - | - | ✓ |

---

## 5. Automation Testing Strategy

| Layer | Tool | Coverage |
|---|---|---|
| Backend API | Supertest + Jest | Auth, profile, roadmap, org endpoints |
| Python RAG | PyTest | Generator, auditor, neural scorer, embedder |
| API Manual | Postman Collection | All 20+ endpoints with sample payloads |
| Schema Validation | Pydantic (Python) | Roadmap JSON structure on every generation |
| Frontend | Manual browser | Profile wizard, roadmap graph, PDF download |

**AI Validation Datasets:**
- `outputs/career_docs_expanded.json` — 500+ career docs for retrieval testing
- `outputs/career_clusters.json` — domain clusters for demand score validation
- `demo_employees.xlsx` — 12 diverse profiles for bulk upload + roadmap testing

---

## 6. Performance Testing Approach

| Endpoint | Target Response Time | Notes |
|---|---|---|
| `POST /api/auth/login` | < 500ms | bcrypt hashing included |
| `POST /api/profile` | < 300ms | Prisma write |
| `POST /api/roadmap/generate` (cache miss) | < 30 seconds | RAG + LLM generation |
| `POST /api/roadmap/generate` (cache hit) | < 500ms | Redis retrieval only |
| `POST /api/org/bulk-upload` (12 employees) | < 10 seconds | Batched Prisma writes |
| `GET /api/org/employees` | < 1 second | Indexed org query |
| RAG `/health` | < 200ms | Keep-alive check |

**Load Testing:** Simulate 10 concurrent roadmap generations to verify RAG service stability under semaphore constraints.

---

## 7. Security Testing Coverage

| Area | Test |
|---|---|
| JWT Verification | Tampered token → 401; expired token → 401 |
| Role Enforcement | Personal JWT on company routes → 403 |
| Input Validation | SQL injection attempt in profile fields → sanitised by Prisma ORM |
| Rate Limiting | 21 auth requests in 15 min → 429 Too Many Requests |
| CORS | Request from non-allowed origin → CORS error |
| Password Storage | bcrypt hash verified; plaintext never stored |
| API Key Exposure | Groq/Redis keys never returned in any API response |

---

## 8. Code Review Checklist

- [ ] All API routes require JWT (except `/api/auth/*`, `/health`)
- [ ] Prisma used for all DB queries (no raw SQL)
- [ ] Error responses include descriptive message but no stack traces
- [ ] RAG timeout set (`RAG_TIMEOUT_MS=30000`)
- [ ] Redis cache key uses `profileId` for deduplication
- [ ] Neural scorer output clamped to [5, 85]
- [ ] All 14 PRUTL dimensions present in audit response
- [ ] Company queries always filter by `orgId`
- [ ] PDF export uses `profileData.fullName || user.name` (not hardcoded "Candidate")
- [ ] Dropout-specific LLM rules present in `ROADMAP_SYSTEM_PROMPT`

---

## 9. Conclusion

The QA framework for Career Path Generator ensures:
- **Reliable AI generation** — schema validation and output bounds on every roadmap
- **Ethical accountability** — automated verification of all 14 PRUTL dimensions
- **Secure multi-tenant operation** — org-scoped queries, JWT enforcement, rate limiting
- **Inclusive UX** — dropout path tested explicitly as a first-class user journey
- **Production-ready performance** — Redis caching keeps repeat generation under 500ms

This QA strategy supports both academic evaluation and real-world deployment readiness.
