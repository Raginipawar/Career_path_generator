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
1. Users don't have to type their entire profile (Resume VLM)
2. The output is interactive, not just a static page (Chat)
3. The probability is trustworthy, not inflated (Calibration)
4. Users can track their progress over time (Progress Tracking)
5. The audit is actually independent, not circular (External Validation)
6. Users understand where they stand vs others (Cohort Benchmarking)
