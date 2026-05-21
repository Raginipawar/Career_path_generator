# Career Path Generator — V2 Product Roadmap

## Priority 1 — Core AI Features (Missing from V1)

### 1. Resume Upload → Auto Profile Fill (VLM)
**What:** User uploads PDF resume or photo → VLM extracts skills, experience, education, domains and pre-fills the 6-step profile wizard. User just reviews and edits instead of typing from scratch.
**How to build:**
- Backend: POST `/api/profile/parse-resume` — accepts multipart file upload
- Use Claude claude-haiku-4-5 with vision: send resume as base64 image, prompt it to return structured JSON matching ProfileSchema
- Frontend: Add upload button on Step 1 of profile wizard, show extraction progress, pre-populate fields
- Fallback: If extraction fails, user fills manually
**Why it matters:** Eliminates the biggest friction point. Most users drop off at long forms.

---

### 2. "Ask Your Profile" Chat (Claude API)
**What:** Conversational chat interface where users ask natural language questions about their career data. "What roles can I reach in 2 years?", "If I learn Docker, how does my alignment change?", "Which skill gap is blocking me most?"
**How to build:**
- Backend: POST `/api/chat` — takes `{ message, profileId, roadmapId }`, maintains conversation history in Redis (TTL 1 hour)
- Use Claude claude-sonnet-4-6 with the user's full profile + generated roadmap as system context
- Enable prompt caching on the profile/roadmap context (saves cost on follow-up messages)
- Frontend: Chat drawer/panel on the roadmap page — floating button opens it
**Why it matters:** Transforms a static output into an interactive advisor. Highest engagement driver.

---

## Priority 2 — Intelligence Improvements

### 3. Proper Skill Gap Radar (Data-Driven)
**What:** Replace the current PASSIONIT/PRUTL audit radar with a real skill gap visualization showing: user's current skills vs. required skills for the target role, with a readiness percentage.
**How to build:**
- RAG already returns `skill_gap[]` and `required_skills[]` per node — this data exists
- Extract from the target role node: required_skills (what's needed), user's technicalSkills (what they have), skill_gap (what's missing)
- Compute readiness % = (required_skills - skill_gap).length / required_skills.length * 100
- Render as Recharts RadarChart with two overlapping polygons: "Current" vs "Required"
- Keep the PASSIONIT/PRUTL table below — just move it out of the radar
**Why it matters:** The current radar is misleading — it shows audit scores not skill coverage.

---

### 4. Probability Calibration (Fix Circular Audit)
**Current problem:** Same LLM generates the roadmap AND audits it — scores are always inflated. MBA→ML Engineering should not be 80%.
**V2 fix:**
- Add a deterministic pre-scoring layer BEFORE calling Groq:
  - Skill overlap score: intersection(user.technicalSkills, targetRole.requiredSkills) / targetRole.requiredSkills.length
  - Domain distance score: same domain = 1.0, adjacent = 0.7, unrelated = 0.3
  - Experience gap penalty: yearsRequired - yearsOfExperience (if negative, cap at 0)
  - Burnout penalty: burnoutLevel >= 7 → -0.1
- Blend deterministic score (60% weight) + LLM estimate (40% weight) for final probability
- This makes probability actually reflect the profile data, not LLM optimism

---

### 5. Cohort Benchmarking
**What:** Show user where they stand vs peers with similar backgrounds. "You're in the top 23% for leadership score among Product Managers in India" etc.
**How to build:**
- Store anonymized aggregate stats per (domain, lifeStage, institutionTier) bucket in a PostgreSQL materialized view
- New endpoint: GET `/api/benchmarks/:profileId` → returns percentile for leadershipScore, skillBreadth (technicalSkills.length), alignmentCategory, successProbability
- Frontend: Add a "How You Compare" section on the Reports page with horizontal bar percentile indicators
**Privacy note:** Only compute when there are >= 10 users in the bucket to prevent de-anonymization.

---

## Priority 3 — Reporting & Dashboard

### 6. Career Alignment Overview Dashboard
**What:** The `/api/analytics/summary` endpoint already exists and returns the right data — it's just not visualized. Add a proper command-center view.
**How to build (frontend only — no backend changes needed):**
- Fetch `/api/analytics/summary` on dashboard load
- Add 3 stat cards: Total Profiles Created, Total Roadmaps Generated, Latest Success Probability
- Add a Recharts PieChart showing alignment distribution (High/Moderate/Low breakdown)
- Add a Recharts BarChart showing avg audit score per PASSIONIT dimension across all user roadmaps
**Effort:** Low — data already exists, pure frontend work.

---

### 7. Market Trend Analysis Report
**What:** Demand scores for career clusters shift over time. Show a historical trend view so users can see which domains are rising vs declining.
**How to build:**
- Add a `snapshotDate` column to `career_clusters` table
- Scheduled job (weekly cron) that re-scrapes demand scores and inserts new snapshot rows instead of updating
- New endpoint: GET `/api/clusters/trends` → returns time-series data per cluster for last 90 days
- Frontend: Recharts LineChart on a new "Market Trends" tab — each line is a domain, x-axis is week
**Note:** For V2 launch, seed 4-8 weeks of fake historical data to make the chart meaningful immediately.

---

## Priority 4 — Product Experience

### 8. Profile Versioning
**What:** Users can create multiple profiles and compare the roadmaps generated from each.
**Current state:** Profile is saved but only the latest one is used. The DB already supports multiple profiles per user (one-to-many relation).
**How to build:**
- Frontend: Show "My Profiles" list, let user pick which profile to generate from
- Add profile name/label field to the wizard (e.g. "Optimistic path", "Conservative path")
- Roadmap history already shows past roadmaps — link each to its source profile

---

### 9. Export Roadmap as PDF
**What:** "Download as PDF" button on the roadmap page.
**How to build:**
- Frontend: Use `html2canvas` + `jsPDF` to capture the roadmap React Flow canvas + audit scores
- Or use a headless browser approach via a serverless function on Vercel
- Simple and high-value — users want to share/print their career plan

---

### 10. Progress Tracking
**What:** Users can mark roadmap milestones as completed. "I got the AWS cert", "I'm now in the PM role".
**How to build:**
- Add `completedNodes: string[]` JSON column to the `Roadmap` table
- New endpoint: PATCH `/api/roadmap/:id/progress` → updates completedNodes array
- Frontend: Checkbox on each React Flow node, completed nodes turn green
- Show overall progress % at the top of the roadmap page

---

## Priority 5 — Ethics & Trust (Making Audit Non-Circular)

### 11. External Validation Layer
**Current problem:** LLM audits itself → always gives high scores.
**V2 fix — three-layer audit:**

**Layer 1 (Deterministic — runs before LLM):**
- Skill gap ratio: required_skills covered by user / total required
- Salary jump ratio: (target_salary - current_salary) / current_salary — flag if > 100% as unrealistic
- Timeline vs experience: flag if user expects senior role in < 18 months with < 2 years experience

**Layer 2 (LLM audit — current PASSIONIT/PRUTL):**
- Keep as-is but weight it lower

**Layer 3 (Rule-based bias detection):**
- Flag if institution_tier heavily influences the recommendation (Tier 3 users getting worse paths)
- Flag if gender field correlates with different salary estimates
- Flag if location outside metro gets systematically lower salary estimates

**Blend:** Final audit scores = 40% Layer 1 + 40% Layer 2 + 20% Layer 3

---

---

## Priority 6 — Dual Product Mode (Personal vs Company)

### 12. Personal Mode (B2C)
All V1 features + all V2 features listed above. The current product is already this.
No changes needed to the personal flow — it stays exactly as is.

---

### 13. Company Mode (B2B) — Employee Dashboard

**What:** A company admin logs in and sees a dashboard of all their employees' career profiles and generated roadmaps. They can select any employee, set a target role/goal for them, and generate a roadmap — useful for performance reviews, succession planning, and internal mobility decisions.

**How to build:**

**Auth layer:**
- Add `role` field to `users` table: `'personal' | 'company_admin' | 'company_employee'`
- Add `organisations` table: `{ id, name, adminUserId, createdAt }`
- Add `orgId` to `users` table — employees belong to an org
- Company admin sees all profiles/roadmaps within their org; employees only see their own

**Backend endpoints:**
```
POST /api/org/register         → create org + admin account
POST /api/org/invite           → send invite link to employee email
GET  /api/org/employees        → list all employees with their latest roadmap status
POST /api/org/roadmap/generate → { employeeId, careerGoal } → generate roadmap for an employee
GET  /api/org/dashboard        → aggregate stats: alignment distribution, avg probability, top skill gaps
```

**Frontend — Company Dashboard:**
- Separate login flow for company admins
- Employee list table: name, current role, alignment category, last roadmap date, success probability
- Click employee → see their full roadmap + audit report
- "Generate New Roadmap" button: admin picks target role/goal → generates fresh roadmap
- Top-level stats: total employees analysed, alignment breakdown chart, most common skill gaps across the org

---

### 14. Company Mode — Bulk Employee Upload via Excel

**What:** Company uploads a filled Excel template containing employee data. System processes all rows, generates roadmaps for each, and populates the employee dashboard automatically.

**Template format (strict — company downloads this template):**
```
full_name | email | current_role | industry | years_experience | technical_skills (comma-sep) | 
soft_skills | interest_domains | career_goal | life_stage | burnout_level | leadership_score
```

**How to build:**
- Frontend: Upload button on company dashboard → accepts `.xlsx` / `.csv` only
- Backend: `POST /api/org/bulk-upload` — uses `xlsx` npm package to parse rows
- Validate each row against ProfileSchema — skip invalid rows, report errors
- Queue roadmap generation: process employees in batches of 5 (avoid Groq rate limits)
- Show progress bar: "Processing 3 of 47 employees..."
- Once complete: all employees appear in the dashboard

**Key rule:** Company must use the exact downloaded template. No free-form Excel accepted. This prevents column mismatch errors.

**Resume column:** Optional. If company includes a `resume_url` column (cloud link), the VLM auto-fills missing fields from the resume. If not present, only Excel data is used.

---

### 15. Company Mode — Quick Analysis (Hiring & Promotion)

**What:** A single-entry point where the company evaluates one person without adding them to the employee roster. Two use cases:
1. **Hiring:** Candidate's profile → target role → "Are they ready? What's the gap?"
2. **Promotion:** Existing employee → promoted role → "Should we promote them? What do they still need?"

**How to build:**
- Separate page: `/company/quick-analysis`
- Simple form: paste profile info OR upload resume → set target role → generate
- No employee record created — this is a one-off evaluation
- Output: roadmap + audit + skill gap + readiness % + recommendation summary ("Ready / 6 months away / Not recommended")
- Can be exported as PDF for HR files

**Why this matters:** Companies often want a quick objective data point — not a full dashboard entry. This reduces friction for the most common enterprise use case.

---

## Priority 7 — AI-Suggested Career Transitions

### 16. "Suggest My Path" Mode (No Goal Required)

**Current problem:** The profile wizard assumes the user already knows their career goal. Most people don't — they want the AI to tell them what they should aim for.

**What:** After filling the profile, user sees two options:
- **"I know my goal"** → current flow (user types career goal, generates roadmap)
- **"Suggest paths for me"** → AI analyses the profile and returns 3 ranked career path options

**How the suggestion works:**
- Backend calls RAG with a modified prompt: "Based on this profile, suggest the top 3 most realistic and fulfilling career transitions. Return as JSON: `[{ path_name, target_role, reasoning, estimated_probability, timeline_months }]`"
- Frontend shows 3 path cards, each with: target role, probability, timeline, 2-line reasoning
- User clicks one → that becomes their career goal → full roadmap generated

**How to build:**
- New endpoint: `POST /api/roadmap/suggest` → `{ profileId }` → returns 3 path suggestions
- New RAG prompt: `SUGGEST_SYSTEM_PROMPT` — similar to roadmap prompt but asks for 3 options, not one full roadmap
- Frontend: fork after Step 6 of profile wizard — show suggestion cards before roadmap generation

**Why it matters:** Removes the biggest assumption in the current product. Opens the tool to people who are lost, not just people who are already decided.

---

## Priority 8 — Roadmap Experience Overhaul

### 17. Full-Page Interactive Roadmap

**Current problem:** The roadmap is rendered inside a card on a page. Nodes are small. It feels like a demo widget, not a centrepiece feature.

**What:** The roadmap becomes a full-viewport experience — the entire screen is the roadmap canvas. Navigation happens via a sidebar or top bar, not by scrolling away from the roadmap.

**How to build:**
- Change the roadmap page layout: `height: 100vh`, no page padding, React Flow fills the screen
- Sidebar panel (collapsible) shows: current/target role header, probability, timeline, explanation text, emotional forecast, alternative paths
- React Flow background: subtle dot grid (already supported)
- Nodes: wider, taller — show role title + salary + timeline visible without clicking
- Zoom controls: prominent bottom-right corner
- Mini-map: bottom-left corner, always visible
- Animated edges: flowing arrows (React Flow supports animated edge prop)

---

### 18. Node Flashcard — Deep Dive on Click

**What:** When the user clicks any node (career milestone), a slide-in drawer opens from the right showing everything they need to actually execute that transition step.

**Flashcard content per node:**
```
Role: Senior ML Engineer
Timeline: Months 7–18
Salary: ₹22–28 LPA
Risk Level: Medium

WHAT TO DO IN THIS PHASE
• Join a team or project using ML in production
• Build 2 end-to-end ML projects (not toy datasets)
• Get comfortable with model deployment (Docker, FastAPI)

SKILLS TO BUILD
• Missing: MLflow, Kubernetes, system design
• You already have: Python, SQL, basic ML

RECOMMENDED COURSES
• "MLOps Specialization" — Coursera (Andrew Ng) — 3 months
• "Designing ML Systems" — Book by Chip Huyen
• "Full Stack Deep Learning" — free online — 6 weeks

MONTHLY FOCUS BREAKDOWN
• Month 7–9: Complete MLOps course, build project 1
• Month 10–12: Deploy project to production, start system design prep
• Month 13–15: Apply for ML Engineer roles, negotiate offers
• Month 16–18: Transition period — notice, onboarding

RISK FACTORS & MITIGATION
• Risk: No prior deployment experience → Mitigate: side project on HuggingFace
• Risk: Salary dip during transition → Mitigate: negotiate signing bonus
```

**How to build:**
- Expand the LLM roadmap prompt to return richer `description` per node — currently it's a single string, change to structured object: `{ what_to_do[], skills_to_build[], courses[], monthly_plan[], risk_mitigation[] }`
- Frontend: React Flow `onNodeClick` handler → opens a Drawer component (Tailwind slide-in panel)
- Course data: LLM generates course names + platforms + durations — no third-party API needed
- Monthly plan: already partially in the emotional forecast — restructure into per-node format

---

## Priority 9 — GitHub Profile Import (Optional)

### 19. GitHub Username Import

**What:** On the profile wizard (Step 4 — Skills), an optional field where the user can enter their GitHub username. If they do, the system fetches their public profile and auto-fills technical skills and interest domains. If they skip it, nothing changes — fully optional.

**Why GitHub and not LinkedIn:**
- GitHub REST API is completely free, no API key needed for public profiles
- No Claude API cost involved — pure data extraction from structured JSON responses
- LinkedIn import requires either paid API access or Claude vision (costs money) — dropped for now

**How it works (zero cost):**
- User types GitHub username in an optional input on Step 4
- Frontend calls backend: `POST /api/profile/import-github` → `{ username }`
- Backend calls two free GitHub endpoints:
  - `https://api.github.com/users/{username}` → bio, account age, public repos count, followers
  - `https://api.github.com/users/{username}/repos?sort=stars&per_page=10` → top 10 repos by stars
- From repos: extract `language` field from each → deduplicated list of programming languages → maps to `technicalSkills`
- From repo topics: extract `topics[]` → maps to `interestDomains` where relevant (e.g. "machine-learning" → "AI & ML")
- Account age (years since `created_at`) → rough experience indicator shown to user as a suggestion, not auto-filled
- Follower count + star count across repos → rough proxy for `leadershipScore` suggestion

**What gets pre-filled vs suggested:**
- **Auto pre-filled:** `technicalSkills` (from repo languages) — user can remove any
- **Suggested (user confirms):** `interestDomains`, rough `yearsOfExperience`, `leadershipScore` nudge
- **Not touched:** Everything else — personal info, education, life context, career goal

**Why this is better than self-reporting:**
- Developers consistently under-report skills on forms but their repos don't lie
- If someone has 20 Python repos but says they don't know Python, GitHub catches it
- Star count across repos is a real signal of technical credibility

**UX flow:**
```
Step 4 (Skills) → Optional field: "GitHub username (optional)"
→ User types "nikhil191206" → clicks "Import"
→ Loading spinner (1-2 seconds)
→ Skills section pre-fills: Python, JavaScript, TypeScript, React...
→ Toast: "Imported 7 skills from your GitHub. Review and edit below."
→ User can remove any pre-filled skill or add more manually
```

**New endpoint:**
```
POST /api/profile/import-github
Input:  { username: string }
Output: { technicalSkills: string[], suggestedDomains: string[], accountAgeYears: number, error?: string }
```
No auth required for this endpoint — it's just a public data fetch proxy.

---

## Updated Stack Additions for V2

| Feature | New Tech |
|---------|----------|
| Resume VLM | Claude claude-haiku-4-5 (vision), multer (file upload) |
| Profile Chat | Claude claude-sonnet-4-6, Redis conversation history |
| PDF Export | html2canvas + jsPDF |
| Scheduled scraping | node-cron or Vercel Cron Jobs |
| Deterministic scoring | Pure TypeScript, no new deps |
| Company mode auth | org + role fields on users table |
| Excel bulk upload | `xlsx` npm package |
| GitHub import (optional) | GitHub REST API (no auth needed, zero cost) |
| Full-page roadmap | React Flow config changes only, no new deps |
| Node flashcard | Tailwind drawer component + expanded LLM prompt |
| Path suggestion | New RAG prompt + `/api/roadmap/suggest` endpoint |

---

## Technical Debt to Fix

| Issue | Fix |
|-------|-----|
| `isGenerating` stuck in localStorage | Done in V1 — `partialize` excludes it |
| CORS trailing slash bug | Done in V1 — dynamic origin check |
| ChromaDB empty on cold start | Done in V1 — auto-embed on startup |
| Probability always optimistic | Done in V1 — calibration rules in prompt |
| Audit radar shows wrong data | V2 — replace with skill gap radar |
| `roadmap.ts` keeps reverting | Permanent fix: add to CLAUDE.md |

--- 

## Stack Additions for V2

| Feature | New Tech |
|---------|----------|
| Resume VLM | Claude claude-haiku-4-5 (vision), multer (file upload) |
| Profile Chat | Claude claude-sonnet-4-6, Redis conversation history |
| PDF Export | html2canvas + jsPDF |
| Scheduled scraping | node-cron or Vercel Cron Jobs |
| Deterministic scoring | Pure TypeScript, no new deps |

---

## What Makes This Non-MVP

The V1 is a working demo. V2 becomes a real product when:

**For individual users:**
1. Users don't have to type their entire profile (Resume VLM + optional GitHub import)
2. Users who don't know their goal get guided (AI-suggested paths)
3. The output is interactive, not just a static page (Chat + full-page roadmap)
4. Each roadmap step tells you exactly what to do, what to study, what to build (Node flashcard)
5. The probability is trustworthy, not inflated (Calibration + external validation)
6. Users can track their progress over time (Progress Tracking)
7. Users understand where they stand vs others (Cohort Benchmarking)

**For companies:**
8. HR can analyse entire teams in one upload (Excel bulk upload)
9. Managers get an objective data point for promotion decisions (Quick analysis)
10. Leadership sees org-wide skill gaps and alignment trends (Company dashboard)
