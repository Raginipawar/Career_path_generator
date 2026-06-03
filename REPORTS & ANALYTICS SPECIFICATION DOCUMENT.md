# REPORTS & ANALYTICS SPECIFICATION DOCUMENT

<div align="center">

**Career Path Generator — AI-Powered Career Transition Platform**

**Project Guide:** Varsh Dange

**Team Members:** Nikhil Shah, Ragini Pawar, Shaktisingh Suryawanshi, Sanat Sanjeev, Sachi Dhoka

</div>

**Technology Stack:** PostgreSQL, Upstash Redis, Node.js / Express, Next.js / Recharts, FastAPI / Python

---

## 1. Purpose of Reports & Analytics

The Reports & Analytics module provides actionable insights for three user types:

| User | Insights Available |
|---|---|
| Individual | Roadmap progress, skill gap breakdown, probability score, ethical audit |
| Company Admin | Cohort talent overview, domain distribution, risk/burnout heatmap, salary benchmarks |
| System | Cache performance, RAG latency, roadmap generation rate |

The module ensures **transparency** (users understand why a path was recommended), **accountability** (PASSIONIT-PRUTL audit logged per roadmap), and **organisational intelligence** (HR teams make data-driven talent decisions).

---

## 2. Types of Reports

### 2.1 Individual Career Roadmap Report (PDF Export)

**Purpose:** Comprehensive personalised career transition document for individuals.

**Content Sections:**
1. Header: Sanatan Labs branding, PASSIONIT-PRUTL attribution, date
2. Candidate name, transition overview (From → To, probability, timeline)
3. AI Assessment explanation (3–4 sentences)
4. Career Transition Steps (3–5 nodes): role, timeline, salary, risk, description, skill gap
5. Alternative Career Paths (1–2 alternatives with probability and timeline)
6. Journey Forecast: phase-by-phase emotional stress prediction
7. Ethical Audit Table: all 14 PASSIONIT-PRUTL dimensions with scores, risk, explanation

**Format:** PDF (jsPDF client-side generation, A4 portrait)
**Filename:** `sanatan-labs-{name}-{target-role}.pdf`
**Access:** Individual user, company admin (for their employees)

---

### 2.2 PASSIONIT-PRUTL Ethical Audit Report

**Purpose:** Full ethical audit of a generated roadmap across 14 dimensions.

**Key Data Fields:**
- Dimension name (e.g., Passion Alignment, Algorithmic Fairness)
- Framework source (PASSIONIT / PRUTL / GCC-ESG)
- Score (0–10)
- Risk Level (Low / Medium / High)
- Explanation (1–2 sentences)
- Recommendation (actionable improvement)

**Display:** `/reports` page — tabular + colour-coded risk indicators
**Usage:**
- Validate ethical soundness of AI-generated advice
- Flag high-risk dimensions (score < 4 = High Risk)
- Support academic evaluation of responsible AI

---

### 2.3 Company Cohort Analytics Report

**Purpose:** Organisation-level view of employee talent distribution and career readiness.

**Key Metrics:**
| Metric | Visualization | Description |
|---|---|---|
| Domain Distribution | Pie / Donut chart | Breakdown of employee interest domains |
| Risk Level Distribution | Bar chart | % employees in Low / Medium / High risk transitions |
| Success Probability Spread | Histogram | Distribution of roadmap probability scores |
| Average Burnout by Department | Heatmap | Identify at-risk teams |
| Salary Benchmark | Box plot | Current vs target salary range per domain |
| Skill Gap Frequency | Tag cloud / bar | Most common missing skills across org |
| Life Stage Distribution | Stacked bar | Early / Mid / Late career breakdown |

**Access:** Company admin only (`/company/dashboard`)
**Export:** CSV download of employee list with key metrics

---

### 2.4 Employee Individual Summary Card

**Purpose:** Quick snapshot of a single employee's career data visible from company dashboard.

**Key Data Fields:**
- Name, current role, industry
- Years of experience, current salary
- Alignment category (High / Moderate / Low)
- Burnout level / Leadership score
- Generated roadmap: target role, probability, timeline
- Top 3 skill gaps

**Display:** Company dashboard employee list tiles + employee detail page sidebar
**Access:** Company admin

---

### 2.5 Quick Analysis Report

**Purpose:** Instant hire/promote evaluation without creating an employee account.

**Key Output Fields:**
- Verdict (Ready / Needs X months / Not Suitable)
- Success probability %
- Total transition timeline (months)
- Skill gap count
- AI Assessment explanation
- Full roadmap nodes (same interface as personal roadmap)
- Journey forecast + alternative paths
- PDF export with candidate name

**Usage:**
- HR screening for new hires
- Promotion consideration evaluation
- Rapid candidate benchmarking

---

### 2.6 Career Trends Report

**Purpose:** Market demand intelligence for career domains in the Indian job market.

**Key Metrics:**
- Domain demand scores (from `career_clusters` table)
- Growth trend per domain (Rising / Stable / Declining)
- Average salary per cluster
- Top skills in demand per domain
- Demand score over time (from `demand_snapshots` table)

**Visualization:** Line charts (demand over time), bar charts (avg salary by domain)
**Access:** Individual users (`/trends` page)

---

## 3. Analytics Dashboard Overview

### 3.1 Individual Dashboard (`/dashboard`)

| Widget | Data Source | Description |
|---|---|---|
| Roadmap Progress | `roadmaps.completedNodes` | % nodes marked complete |
| Success Probability | `roadmaps.roadmapData.success_probability` | Gauge / score card |
| Current → Target | `roadmapData` | Role transition summary |
| Skill Gap Count | `roadmapData.roadmap_nodes[].skill_gap` | Total skills to build |
| Next Step | First incomplete node | Actionable next milestone |

### 3.2 Company Dashboard (`/company/dashboard`)

| Widget | Data Source | Description |
|---|---|---|
| Total Employees | `users` table (orgId filter) | Headcount |
| Roadmaps Generated | `roadmaps` table | Coverage % |
| Domain Pie Chart | `profiles.interestDomains` | Talent distribution |
| Risk Distribution | `roadmapData.roadmap_nodes[].risk_level` | Org-wide risk spread |
| Top Skill Gaps | Aggregated `skill_gap` across roadmaps | Most needed org-wide skills |
| Avg Probability | Average of `roadmaps.probability` | Org talent readiness score |

---

## 4. Data Retention & Security

| Data Type | Retention | Access Control |
|---|---|---|
| Roadmap JSON | Indefinite (until user deletes) | Owner + company admin (own org only) |
| Ethical audit scores | Stored in `audit_results` table | Same as roadmap |
| Profile data | Indefinite | Owner only + company admin (own org) |
| Redis cache | 24-hour TTL (auto-expiry) | Backend only |
| Company employee profiles | Indefinite (company admin manages) | Admin + employee themselves |

**Privacy controls:**
- Company admins cannot see employees of other organisations (org-scoped queries)
- Personal JWT cannot access company endpoints
- No cross-user data exposure in any API response
- Sensitive fields (password hashes) never returned in any API response

---

## 5. Report Export Formats

| Report | Format | Trigger |
|---|---|---|
| Individual roadmap + audit | PDF (jsPDF) | "Export PDF" button in roadmap top bar |
| Company employee roadmap | PDF (jsPDF) | "Export PDF" in employee detail top bar |
| Quick analysis | PDF (jsPDF) | "Export PDF" in results view |
| Company employee list | (future: CSV) | Dashboard export button |

---

## 6. Conclusion

The Reports & Analytics module of Career Path Generator delivers measurable value at every level:
- **Individuals** receive a professional PDF career document with ethical audit
- **Companies** gain data-driven talent intelligence across their workforce
- **HR teams** can make evidence-based hire/promote decisions via Quick Analysis
- **System operators** can monitor AI quality via audit scores and probability distributions

All reports are grounded in real data, ethically reviewed, and branded under the Sanatan Labs / PASSIONIT-PRUTL framework.
