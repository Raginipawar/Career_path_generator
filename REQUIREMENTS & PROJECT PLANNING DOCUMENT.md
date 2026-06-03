# REQUIREMENTS & PROJECT PLANNING DOCUMENT

<div align="center">

**Career Path Generator — AI-Powered Career Transition Platform**

**Project Guide:** Varsh Dange

**Team Members:** Nikhil Shah, Ragini Pawar, Shaktisingh Suryawanshi, Sanat Sanjeev, Sachi Dhoka

</div>

**Technology Stack:** Next.js 16 / React 19 (Frontend), Node.js / Express / TypeScript (Backend), FastAPI / Python (RAG Service), PostgreSQL, Upstash Redis, ChromaDB, Groq LLaMA 3.3-70b, PyTorch MLP

---

## 1. Problem Statement / Project Overview

### 1.1 Problem Statement

Career decision-making in India is fragmented, opaque, and often inaccessible to professionals without expensive coaching. Most tools offer generic advice disconnected from the Indian job market, ignore psychological factors like burnout and life stage, and apply no ethical framework to their recommendations. Students and early-career professionals especially lack structured, personalised guidance.

Key gaps:
- No personalised roadmaps grounded in real Indian salary data
- No consideration of emotional/life-stage factors during transitions
- No ethical audit of career advice (algorithmic bias, sustainability)
- No organisation-level career intelligence for company HR teams
- Dropout and non-traditional candidates completely unserved

### 1.2 Project Overview

Career Path Generator is a full-stack AI platform that generates personalised, ethically audited career transition roadmaps for individuals and organisations in the Indian job market.

**Core capabilities:**
- 6-step profile wizard with resume auto-fill via Groq VLM
- RAG-powered roadmap generation using ChromaDB + 500+ career documents
- PyTorch MLP neural network for success probability scoring (14 features)
- PASSIONIT-PRUTL 14-dimension ethical audit of every roadmap
- Interactive ReactFlow career graph with node-level action plans
- Company dashboard: bulk employee upload, cohort analytics, roadmap generation
- Quick Analysis tool for hiring/promotion decisions
- PDF export, progress tracking, AI chat assistant
- Sanatan Labs GCC course recommendations

---

## 2. Pain Points & Solution Description

### 2.1 Pain Points

| Pain Point | Affected User |
|---|---|
| Generic, non-India-specific career advice | Individual professionals |
| No acknowledgment of burnout / stress in career planning | Burned-out professionals |
| Degree gatekeeping — dropouts have no tools | School / College dropouts |
| HR teams lack AI tools for talent mobility decisions | Company admins |
| Career advice ignores ethical dimensions (bias, sustainability) | All users |
| No skill gap → course mapping for Indian market | Students, early career |
| No cohort benchmarking for organisations | Company HR teams |

### 2.2 Proposed Solution

- **RAG Engine:** ChromaDB vector store with 500+ career documents + Groq LLaMA 3.3-70b for contextually grounded roadmap generation
- **Neural Scoring:** PyTorch MLP trained on 14 profile features produces calibrated success probability
- **Ethical Audit:** PASSIONIT-PRUTL framework audits every roadmap across 14 ethical dimensions
- **Dropout Support:** Dedicated UX path and LLM prompt rules for non-traditional candidates
- **Company Dashboard:** Bulk Excel upload, per-employee roadmap, cohort analytics, quick analysis
- **GCC Courses:** Sanatan Labs 11-course GCC curriculum surfaced as personalised recommendations

---

## 3. Module Definition Document

| Module | Description | Owner |
|---|---|---|
| Auth | JWT-based login/register for personal and company users | Backend |
| Profile Wizard | 6-step form with resume upload, GitHub import, validation | Frontend |
| RAG Service | FastAPI service: embeddings, ChromaDB retrieval, roadmap generation | Python/RAG |
| Neural Scorer | PyTorch MLP: 14-feature success probability | RAG Service |
| Ethical Auditor | PASSIONIT-PRUTL 14-dimension audit scoring | RAG Service |
| Roadmap Store | Prisma/PostgreSQL roadmap persistence, progress tracking | Backend |
| Company Org | Organisation CRUD, Excel bulk upload, employee management | Backend |
| Company Roadmap | Per-employee roadmap generation and display | Backend + Frontend |
| Quick Analysis | Instant hire/promote evaluation without account | Frontend + Backend |
| Analytics | Cohort benchmarking, domain/risk distribution charts | Backend + Frontend |
| Chat | Context-aware career advisor using roadmap + profile | Backend + RAG |
| PDF Export | jsPDF-based full roadmap PDF with ethical audit | Frontend |
| Sanatan Widget | GCC course recommender based on roadmap skill gaps | Frontend |

---

## 4. Product Backlog Item (PBI) Inventory

### High Priority (Core)
- PBI-01: User registration and JWT authentication
- PBI-02: 6-step profile wizard with validation
- PBI-03: Resume upload + Groq VLM parsing
- PBI-04: ChromaDB vector store setup with career documents
- PBI-05: RAG roadmap generation via LLaMA 3.3-70b
- PBI-06: PyTorch MLP success probability scoring
- PBI-07: PASSIONIT-PRUTL ethical audit
- PBI-08: ReactFlow interactive roadmap visualization
- PBI-09: Node flashcard with skill gap, courses, monthly plan
- PBI-10: PDF export with ethical audit

### Medium Priority (Company)
- PBI-11: Company registration and organisation setup
- PBI-12: Bulk employee Excel upload (29 fields)
- PBI-13: Company employee detail page with full roadmap
- PBI-14: Quick Analysis tool (hire/promote)
- PBI-15: Cohort analytics dashboard

### Enhancement
- PBI-16: AI chat assistant with roadmap context
- PBI-17: GitHub skills import
- PBI-18: Dropout-specific UX and LLM rules
- PBI-19: Sanatan Labs GCC course widget
- PBI-20: Upstash Redis caching for roadmaps

---

## 5. Project Plan

### 5.1 Project Phases & Timeline

| Phase | Duration | Deliverables |
|---|---|---|
| Phase 1: Foundation | Week 1–2 | Auth, profile wizard, DB schema, RAG service setup |
| Phase 2: Core AI | Week 3–4 | ChromaDB embeddings, LLM roadmap generation, neural scoring |
| Phase 3: Frontend | Week 5–6 | ReactFlow graph, node flashcard, PDF export |
| Phase 4: Company | Week 7–8 | Org management, bulk upload, employee roadmaps |
| Phase 5: Polish | Week 9–10 | Dropout UX, GCC widget, chat, caching, deployment |
| Phase 6: Demo | Week 11 | Demo Excel, presentation, final QA |

---

## 6. Test Plan

### 6.1 Testing Scope
- Profile form validation (all 30 fields)
- Resume parsing accuracy (Groq VLM)
- RAG retrieval relevance (ChromaDB)
- Roadmap generation correctness (JSON schema validation)
- Neural scorer output range (0–100%)
- Ethical audit dimension coverage (all 14 dimensions)
- Company Excel bulk upload (edge cases, missing fields)
- PDF export completeness
- API authentication and authorisation

### 6.2 Testing Types
- Unit Testing (backend routes, utility functions)
- Integration Testing (API → DB → RAG chain)
- AI Model Validation (neural scorer calibration)
- End-to-End Testing (full profile → roadmap flow)
- Security Testing (JWT, CORS, rate limiting)
- Performance Testing (RAG response time, Redis cache hit rate)

### 6.3 Testing Tools
- Jest / Supertest — Backend API testing
- PyTest — Python RAG service unit tests
- Postman — Manual API endpoint validation
- Browser DevTools — Frontend performance profiling

---

## 7. Entry & Exit Criteria

### 7.1 Entry Criteria
- All 3 services running (backend:6017, frontend:3017, RAG:8000)
- PostgreSQL schema migrated (Prisma)
- ChromaDB populated with career documents
- `.env` files configured for all services

### 7.2 Exit Criteria
- Full profile → roadmap → PDF flow working end-to-end
- Company bulk upload processes 12 demo employees without error
- All 14 PASSIONIT-PRUTL audit dimensions populated in output
- Neural scorer returns probability in 0–85% range for all test inputs
- Render backend deployment live and responding on `/health`

---

## 8. Conclusion

This Requirements & Project Planning document provides the full framework for the Career Path Generator platform — from individual career guidance to organisational talent intelligence. The system is designed to be scalable, ethically grounded, and immediately useful for the Indian job market.
