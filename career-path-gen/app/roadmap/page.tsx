"use client";

import { useAppStore } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatDrawer from "@/components/ui/ChatDrawer";
import { useState, useMemo, useCallback } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, Handle, Position,
  NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import Link from "next/link";
import {
  Zap, Clock, Target, Navigation, ShieldCheck, TrendingUp,
  ChevronLeft, ChevronRight, X, BookOpen, Wrench, AlertTriangle,
  CheckCircle2, ArrowRight, Calendar, DollarSign, BarChart2, GraduationCap,
} from "lucide-react";
import { RoadmapNode } from "@/types";
import { api } from "@/lib/api";
import ExportPDF from "@/components/ui/ExportPDF";

// ─── Flashcard Panel ──────────────────────────────────────────────────────────
function NodeFlashcard({ node, onClose, roadmapId, completed, onToggle }: {
  node: RoadmapNode;
  onClose: () => void;
  roadmapId: string;
  completed: boolean;
  onToggle: (nodeIds: string[]) => void;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await api.toggleProgress(roadmapId, node.node_id);
      onToggle(res.completedNodes);
    } catch { /* silent */ } finally {
      setToggling(false);
    }
  };
  const riskColor = node.risk_level === "Low"
    ? "text-green-600 bg-green-50 border-green-200"
    : node.risk_level === "Medium"
    ? "text-yellow-700 bg-yellow-50 border-yellow-200"
    : "text-red-600 bg-red-50 border-red-200";

  // Derive monthly plan from timeline
  const months = node.timeline_months;
  const third = Math.ceil(months / 3);
  const plan = months > 0 ? [
    { period: `Month 1–${third}`,       focus: "Foundation — learn core skills, take relevant courses, build first project" },
    { period: `Month ${third + 1}–${Math.ceil(months * 2 / 3)}`, focus: "Application — work on real projects, contribute to team, get feedback" },
    { period: `Month ${Math.ceil(months * 2 / 3) + 1}–${months}`, focus: "Consolidation — apply for roles, negotiate offers, transition" },
  ] : [];

  // Skill → real course with URL
  const COURSE_MAP: Record<string, { title: string; platform: string; url: string; free: boolean }> = {
    python:           { title: "Python for Everybody",               platform: "Coursera",      url: "https://www.coursera.org/specializations/python",                        free: false },
    sql:              { title: "SQL for Data Science",               platform: "Coursera",      url: "https://www.coursera.org/learn/sql-for-data-science",                   free: false },
    aws:              { title: "AWS Cloud Practitioner Essentials",  platform: "AWS Training",  url: "https://explore.skillbuilder.aws/learn/course/134",                     free: true  },
    docker:           { title: "Docker Tutorial for Beginners",      platform: "YouTube",       url: "https://www.youtube.com/watch?v=3c-iBn73dDE",                           free: true  },
    kubernetes:       { title: "Kubernetes for Beginners",           platform: "freeCodeCamp",  url: "https://www.youtube.com/watch?v=d6WC5n9G_sM",                           free: true  },
    react:            { title: "React – The Official Tutorial",      platform: "React Docs",    url: "https://react.dev/learn",                                               free: true  },
    "node.js":        { title: "Node.js Crash Course",               platform: "YouTube",       url: "https://www.youtube.com/watch?v=fBNz5xF-Kx4",                          free: true  },
    typescript:       { title: "TypeScript Handbook",                platform: "TypeScript",    url: "https://www.typescriptlang.org/docs/handbook/intro.html",               free: true  },
    tensorflow:       { title: "TensorFlow Developer Certificate",   platform: "Coursera",      url: "https://www.coursera.org/professional-certificates/tensorflow-in-practice", free: false },
    pytorch:          { title: "Deep Learning with PyTorch",         platform: "fast.ai",       url: "https://course.fast.ai/",                                               free: true  },
    "machine learning": { title: "ML Specialization – Andrew Ng",  platform: "Coursera",      url: "https://www.coursera.org/specializations/machine-learning-introduction", free: false },
    "deep learning":  { title: "Deep Learning Specialization",       platform: "Coursera",      url: "https://www.coursera.org/specializations/deep-learning",                free: false },
    llm:              { title: "LLM Bootcamp",                       platform: "Full Stack DL",url: "https://fullstackdeeplearning.com/llm-bootcamp/",                       free: true  },
    mlops:            { title: "MLOps Specialization",               platform: "Coursera",      url: "https://www.coursera.org/specializations/machine-learning-engineering-for-production-mlops", free: false },
    "system design":  { title: "Grokking System Design",             platform: "Educative",     url: "https://www.educative.io/courses/grokking-the-system-design-interview", free: false },
    terraform:        { title: "Terraform Crash Course",             platform: "YouTube",       url: "https://www.youtube.com/watch?v=SLB_c_ayRMo",                           free: true  },
    java:             { title: "Java Programming Masterclass",       platform: "Udemy",         url: "https://www.udemy.com/course/java-the-complete-java-developer-course/",  free: false },
    figma:            { title: "Figma UI Design Tutorial",           platform: "YouTube",       url: "https://www.youtube.com/watch?v=HZuk6Wkx_Eg",                           free: true  },
    "product management": { title: "Product Management Fundamentals", platform: "Coursera",   url: "https://www.coursera.org/learn/uva-darden-foundations-of-the-strategy",   free: false },
    agile:            { title: "Agile Project Management",           platform: "Google/Coursera", url: "https://www.coursera.org/learn/agile-project-management",             free: false },
    cybersecurity:    { title: "Google Cybersecurity Certificate",   platform: "Coursera",      url: "https://www.coursera.org/professional-certificates/google-cybersecurity", free: false },
    "penetration testing": { title: "Ethical Hacking Bootcamp",     platform: "Udemy",         url: "https://www.udemy.com/course/learn-ethical-hacking-from-scratch/",       free: false },
    leadership:       { title: "Inspiring and Motivating Individuals", platform: "Coursera",   url: "https://www.coursera.org/learn/motivate-people-teams",                  free: false },
    "data analysis":  { title: "Google Data Analytics Certificate",  platform: "Coursera",      url: "https://www.coursera.org/professional-certificates/google-data-analytics", free: false },
    tableau:          { title: "Tableau Tutorial for Beginners",     platform: "YouTube",       url: "https://www.youtube.com/watch?v=TPMlZxRRaBQ",                           free: true  },
    "power bi":       { title: "Power BI Full Course",               platform: "YouTube",       url: "https://www.youtube.com/watch?v=fnA-_iDV_LY",                           free: true  },
    postgresql:       { title: "PostgreSQL Tutorial",                platform: "freeCodeCamp",  url: "https://www.youtube.com/watch?v=qw--VYLpxG4",                           free: true  },
    "rest api":       { title: "REST API Design – Best Practices",   platform: "YouTube",       url: "https://www.youtube.com/watch?v=7nm1pYuKAhY",                           free: true  },
    microservices:    { title: "Microservices with Node & React",    platform: "Udemy",         url: "https://www.udemy.com/course/microservices-with-node-js-and-react/",     free: false },
    blockchain:       { title: "Blockchain Basics",                  platform: "Coursera",      url: "https://www.coursera.org/learn/blockchain-basics",                     free: false },
    statistics:       { title: "Statistics with Python",             platform: "Coursera",      url: "https://www.coursera.org/specializations/statistics-with-python",       free: false },
    linux:            { title: "Linux Command Line Basics",          platform: "Udacity",       url: "https://www.udacity.com/course/linux-command-line-basics--ud595",       free: true  },
    "ci/cd":          { title: "DevOps CI/CD Pipeline",              platform: "YouTube",       url: "https://www.youtube.com/watch?v=scEDHsr3APg",                           free: true  },
    // PASSIONIT-PRUTL / GCC / Sanatan Labs Curriculum
    "gcc":            { title: "Engagement Management & GCC Shared Services",   platform: "Sanatan Labs",  url: "https://passionit.in",                                      free: false },
    "global delivery": { title: "GCC Operations & Offshore Delivery Leadership", platform: "Sanatan Labs", url: "https://passionit.in",                                      free: false },
    "process management": { title: "Process Management & Agile Sprint Choreography", platform: "Sanatan Labs", url: "https://passionit.in",                                  free: false },
    "sop":            { title: "SOP Architecture & Operational PMO",            platform: "Sanatan Labs",  url: "https://passionit.in",                                      free: false },
    "prompt engineering": { title: "Predictive Prompt Engineering & Semantic Logic", platform: "Sanatan Labs", url: "https://passionit.in",                                  free: false },
    "osint":          { title: "OSINT & Forensic Operational Audit",            platform: "Sanatan Labs",  url: "https://passionit.in",                                      free: false },
    "corporate communications": { title: "Corporate Communications & C-Suite Reporting", platform: "Sanatan Labs", url: "https://passionit.in",                              free: false },
    "data governance": { title: "Zero-Trust Cyber Hygiene & Data Sovereignty",  platform: "Sanatan Labs",  url: "https://passionit.in",                                      free: false },
    "stakeholder":    { title: "Strategic Project Alignment & Stakeholder Management", platform: "Sanatan Labs", url: "https://passionit.in",                                free: false },
    "compliance":     { title: "Forensic Compliance & GDPR/ISO Data Isolation", platform: "Sanatan Labs",  url: "https://passionit.in",                                      free: false },
    "market research": { title: "AI-Driven Competitive Intelligence & Market Research", platform: "Sanatan Labs", url: "https://passionit.in",                               free: false },
  };

  const courses = node.skill_gap.slice(0, 4).map(skill => {
    const key = Object.keys(COURSE_MAP).find(k => skill.toLowerCase().includes(k));
    const course = key ? COURSE_MAP[key] : null;
    return { skill, course };
  });

  return (
    <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-[var(--primary)] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Step {node.node_order}</p>
          <h2 className="text-xl font-serif text-white font-bold leading-tight">{node.role_title}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-white/80 text-xs"><Calendar className="w-3 h-3" /> {node.timeline_months} months</span>
            <span className="flex items-center gap-1 text-white/80 text-xs"><DollarSign className="w-3 h-3" /> ₹{node.salary_estimate_lpa} LPA</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${riskColor}`}>{node.risk_level} Risk</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              completed
                ? "bg-green-500 border-green-400 text-white"
                : "bg-white/10 border-white/30 text-white/80 hover:bg-white/20"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {completed ? "Completed" : "Mark Done"}
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview */}
        <div className="px-6 py-5 border-b border-slate-100">
          <p className="text-[var(--text)] text-sm leading-relaxed">{node.description}</p>
        </div>

        {/* Skills to build (gap) */}
        {node.skill_gap.length > 0 && (
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
              <Wrench className="w-4 h-4 text-[var(--primary)]" /> Skills You Need to Build
            </h3>
            <div className="flex flex-wrap gap-2">
              {node.skill_gap.map(s => (
                <span key={s} className="px-3 py-1 rounded-full text-sm bg-red-50 text-red-700 border border-red-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Skills you already have */}
        {node.required_skills.filter(s => !node.skill_gap.includes(s)).length > 0 && (
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Skills You Already Have
            </h3>
            <div className="flex flex-wrap gap-2">
              {node.required_skills.filter(s => !node.skill_gap.includes(s)).map(s => (
                <span key={s} className="px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Recommended courses */}
        {courses.length > 0 && (
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
              <BookOpen className="w-4 h-4 text-[var(--primary)]" /> Recommended Courses
            </h3>
            <div className="space-y-3">
              {courses.map(({ skill, course }) => (
                <div key={skill} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide mb-1">{skill}</p>
                  {course ? (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--dark)]">{course.title}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{course.platform} · {course.free ? "Free" : "Paid"}</p>
                      </div>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--secondary)] px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Open →
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text)]">
                      Search <a href={`https://www.coursera.org/search?query=${encodeURIComponent(skill)}`} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">Coursera</a> or <a href={`https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}`} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">Udemy</a> for {skill} courses.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly plan */}
        {plan.length > 0 && (
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
              <BarChart2 className="w-4 h-4 text-[var(--primary)]" /> Month-by-Month Plan
            </h3>
            <div className="space-y-3">
              {plan.map((p, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--primary)]">{p.period}</p>
                    <p className="text-sm text-[var(--text)] mt-0.5">{p.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk mitigation */}
        <div className="px-6 py-5">
          <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600" /> Risk & Mitigation
          </h3>
          <div className="space-y-2">
            {node.risk_level === "High" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>High risk transition.</strong> Consider upskilling for 3-6 months before applying. Build a strong portfolio project in this domain first.
              </div>
            )}
            {node.skill_gap.length > 3 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                <strong>Large skill gap ({node.skill_gap.length} skills).</strong> Prioritise the top 2-3 skills that appear most in job descriptions. Don't try to learn everything at once.
              </div>
            )}
            {node.salary_estimate_lpa > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Salary negotiation tip.</strong> Research current market rates on LinkedIn Salary, Glassdoor, and Levels.fyi before accepting any offer. ₹{node.salary_estimate_lpa} LPA is the estimated range for this role.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sanatan Labs Floating Widget ─────────────────────────────────────────────
const SANATAN_COURSES = [
  {
    id: "C01", track: "Shared Services",
    title: "Engagement Management & Client Success",
    role: "GCC Shared Services & Onboarding",
    description: "Learn to standardise internal HR service delivery across global teams. Master managing cross-border stakeholder tickets, onboarding remote workforces, and resolving friction in GCC shared service environments.",
    skills: ["Stakeholder Management", "SLA Operations", "JIRA/Ticketing", "Cross-cultural Communication", "HR Service Delivery"],
    bestFor: "HR, operations, or admin professionals pivoting to GCC roles.",
    keywords: ["hr", "operations", "admin", "client", "stakeholder", "onboarding", "communication", "shared services"],
  },
  {
    id: "C02", track: "Automation",
    title: "Predictive Prompt Engineering & Semantic Logic",
    role: "Intelligent Automation Engineering",
    description: "Build custom LLM pipelines and prompt-chains for automated corporate workflows. Reduce manual processing time by 70% through intelligent automation — no deep ML expertise required.",
    skills: ["Prompt Engineering", "LLM APIs", "Workflow Automation", "Semantic Logic", "AI Tool Integration"],
    bestFor: "Developers, technical writers, or analysts moving into AI automation.",
    keywords: ["ai", "llm", "prompt", "automation", "nlp", "machine learning", "python", "developer", "engineer"],
  },
  {
    id: "C03", track: "PMO & BPM",
    title: "Process Management & Agile Sprint Choreography",
    role: "Operational PMO & SOP Architecture",
    description: "Migrate complex tasks from US/Europe to India by mapping them into airtight Standard Operating Procedures and tracking them through agile sprint backlogs.",
    skills: ["Agile/Scrum", "SOP Writing", "Sprint Planning", "Jira", "Process Documentation", "Change Management"],
    bestFor: "Project coordinators, business analysts, and operations leads.",
    keywords: ["project", "agile", "scrum", "process", "management", "sop", "pmo", "operations", "coordinator"],
  },
  {
    id: "C04", track: "Governance",
    title: "Cyber Hygiene, Data Isolation & Forensic Compliance",
    role: "Information Security & Data Isolation",
    description: "Enforce strict data isolation between parallel teams, audit credential safety, and ensure GDPR/ISO 27001 compliance in distributed GCC environments.",
    skills: ["Data Security", "GDPR/ISO 27001", "Endpoint Hygiene", "Credential Management", "Access Control"],
    bestFor: "IT admins, compliance officers, or security-focused professionals.",
    keywords: ["security", "cybersecurity", "compliance", "data", "gdpr", "iso", "audit", "governance", "forensic"],
  },
  {
    id: "C05", track: "Automation",
    title: "Website Lifecycle Operations & Maintenance",
    role: "Enterprise Portal Management",
    description: "Stage global digital infrastructure, maintain intranet systems, and handle multi-region content sync. Learn to manage enterprise CMS backends with minimal downtime.",
    skills: ["CMS Management", "Web Maintenance", "HTML/CSS Basics", "Content Sync", "Digital Auditing"],
    bestFor: "Web coordinators, content managers, and digital operations professionals.",
    keywords: ["web", "website", "cms", "digital", "content", "portal", "html", "frontend", "operations"],
  },
  {
    id: "C06", track: "Automation",
    title: "Digital Media Scheduling & Growth Marketing Grids",
    role: "Global Shared Marketing Operations",
    description: "Manage multi-channel campaign grids and performance analytics for international business units. Learn systematic content scheduling and data-driven marketing decision-making.",
    skills: ["Campaign Management", "Social Media Analytics", "Content Calendars", "Growth Metrics", "Performance Reporting"],
    bestFor: "Marketing executives, social media managers, and content strategists.",
    keywords: ["marketing", "digital marketing", "social media", "content", "campaign", "growth", "analytics", "branding"],
  },
  {
    id: "C07", track: "PMO & BPM",
    title: "Technical Product Documentation & Manual Writing",
    role: "Technical Content Asset Management",
    description: "Author change logs, user guides, internal knowledge bases, and complex operational compliance manuals for enterprise-grade systems and global delivery teams.",
    skills: ["Technical Writing", "Knowledge Base Management", "Compliance Documentation", "Information Architecture", "Style Guides"],
    bestFor: "Writers, QA engineers, and product managers building documentation expertise.",
    keywords: ["documentation", "technical writing", "product", "knowledge", "manual", "content", "qa", "writer"],
  },
  {
    id: "C08", track: "PMO & BPM",
    title: "AI-Driven Competitive Intelligence & Market Research",
    role: "Global Market Intelligence Unit",
    description: "Run automated market research, track global competitor pricing matrices, and scrape geopolitical data trends to produce high-impact intelligence briefings for C-suite leadership.",
    skills: ["Market Research", "Competitor Analysis", "Data Scraping", "Business Intelligence", "AI Research Tools", "Strategic Reporting"],
    bestFor: "Business analysts, strategy consultants, and research professionals.",
    keywords: ["research", "analytics", "data", "business intelligence", "strategy", "market", "consulting", "analyst"],
  },
  {
    id: "C09", track: "Governance",
    title: "OSINT & Data Auditing",
    role: "Forensic Operational Audit Unit",
    description: "Map regional supply chain vectors, analyse deep-web data for fraud detection, and audit enterprise transactions to catch administrative errors and compliance anomalies.",
    skills: ["OSINT Tools", "Data Forensics", "Fraud Detection", "Supply Chain Auditing", "Transaction Analysis"],
    bestFor: "Analysts, compliance officers, and risk management professionals.",
    keywords: ["audit", "compliance", "fraud", "risk", "data", "security", "investigation", "supply chain", "governance"],
  },
  {
    id: "C10", track: "Shared Services",
    title: "Corporate Communications & Precision Reporting",
    role: "C-Suite Executive Reporting",
    description: "Manage cross-border corporate governance, craft cross-cultural executive correspondence, and deliver precise weekly GCC delivery metrics to C-suite leadership.",
    skills: ["Executive Communication", "Business Writing", "Reporting Dashboards", "Corporate Governance", "Cross-cultural Management"],
    bestFor: "Communications professionals, executive assistants, and operations managers.",
    keywords: ["communication", "reporting", "executive", "corporate", "writing", "presentation", "governance", "manager"],
  },
  {
    id: "C11", track: "Governance",
    title: "Administrative Command & Sovereign Leadership",
    role: "Strategic Crisis PMO",
    description: "Command high-pressure situations during system failures and pipeline disruptions. Learn failover orchestration, crisis decision-making, and sovereign leadership architecture for regional GCC teams.",
    skills: ["Crisis Management", "Leadership Under Pressure", "Failover Planning", "Strategic Decision-making", "Team Command"],
    bestFor: "Senior managers, team leads, and operations heads ready for leadership roles.",
    keywords: ["leadership", "management", "senior", "crisis", "strategy", "director", "head", "lead", "pmo", "commander"],
  },
];

const TRACK_COLORS: Record<string, string> = {
  "Shared Services": "bg-blue-100 text-blue-700",
  "Automation":      "bg-purple-100 text-purple-700",
  "PMO & BPM":       "bg-amber-100 text-amber-700",
  "Governance":      "bg-red-100 text-red-700",
};

function scoreCourse(course: typeof SANATAN_COURSES[0], roadmap: any): number {
  if (!roadmap) return 0;
  const haystack = [
    roadmap.target_role ?? "",
    roadmap.current_role ?? "",
    ...(roadmap.roadmap_nodes ?? []).flatMap((n: any) => [...(n.skill_gap ?? []), ...(n.required_skills ?? [])]),
  ].join(" ").toLowerCase();

  return course.keywords.reduce((score, kw) => score + (haystack.includes(kw) ? 1 : 0), 0);
}

function CourseCard({ course }: { course: typeof SANATAN_COURSES[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden cursor-pointer hover:border-[var(--accent)] transition-colors"
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-start gap-2.5 p-2.5">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold flex items-center justify-center mt-0.5">
          {course.id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--dark)] leading-snug">{course.title}</p>
          <p className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug">→ {course.role}</p>
          <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded ${TRACK_COLORS[course.track]}`}>
            {course.track}
          </span>
        </div>
        <span className="text-[10px] text-[var(--muted)] flex-shrink-0 mt-1">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="px-3 pb-3 border-t border-slate-200 mt-0 pt-3 space-y-2">
          <p className="text-[11px] text-[var(--text)] leading-relaxed">{course.description}</p>
          <div>
            <p className="text-[10px] font-semibold text-[var(--dark)] mb-1">Skills you'll gain</p>
            <div className="flex flex-wrap gap-1">
              {course.skills.map(s => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] font-medium">{s}</span>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-[var(--muted)] italic">Best for: {course.bestFor}</p>
        </div>
      )}
    </div>
  );
}

function SanatanLabsWidget({ roadmap }: { roadmap: any }) {
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);

  if (!visible) return null;

  const sorted = [...SANATAN_COURSES].sort((a, b) => scoreCourse(b, roadmap) - scoreCourse(a, roadmap));
  const displayed = expanded ? sorted : sorted.slice(0, 3);

  return (
    <div className="absolute top-4 right-4 z-20 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--primary)] text-white">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          <div>
            <p className="text-sm font-semibold leading-none">Sanatan Labs</p>
            <p className="text-[10px] text-white/70 mt-0.5">GCC Capability Courses</p>
          </div>
        </div>
        <button onClick={() => setVisible(false)} className="text-white/70 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 pt-2 pb-1">
        <p className="text-[10px] text-[var(--muted)]">
          {expanded ? "All 11 courses — sorted by match" : "Top 3 recommended for your roadmap"}
        </p>
      </div>

      <div className="px-3 pb-2 space-y-2 max-h-[420px] overflow-y-auto">
        {displayed.map(c => <CourseCard key={c.id} course={c} />)}
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-1.5 rounded-lg border border-[var(--primary)]/30 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
        >
          {expanded ? "Show top 3 ↑" : `View all ${SANATAN_COURSES.length} courses ↓`}
        </button>
      </div>
    </div>
  );
}

// ─── Custom React Flow Node ───────────────────────────────────────────────────
function CareerNode({ data, selected }: any) {
  const isCurrent   = data.node_order === 1;
  const isCompleted = data.isCompleted;
  const riskBorder  = isCompleted ? "#16a34a" : data.risk_level === "Low" ? "#16a34a" : data.risk_level === "Medium" ? "#d97706" : "#dc2626";

  return (
    <div
      className="rounded-xl shadow-lg border-2 transition-all cursor-pointer hover:scale-105"
      style={{
        width: 220,
        background: isCompleted ? "#f0fdf4" : isCurrent ? "var(--primary)" : "white",
        borderColor: selected ? "var(--accent)" : riskBorder,
        boxShadow: selected ? "0 0 0 3px var(--accent)" : undefined,
        opacity: isCompleted && !isCurrent ? 0.85 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "var(--primary)", width: 12, height: 12 }} />
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCurrent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
            {isCurrent ? "Current" : `+${data.timeline_months}mo`}
          </span>
          <span className="text-xs font-bold" style={{ color: riskBorder }}>{data.risk_level}</span>
        </div>
        <p className={`font-serif font-semibold text-sm leading-tight mb-1 ${isCurrent ? "text-white" : "text-[var(--dark)]"}`}>
          {data.role_title}
        </p>
        <p className={`text-xs ${isCurrent ? "text-white/70" : "text-[var(--muted)]"}`}>
          ₹{data.salary_estimate_lpa} LPA
        </p>
        {data.skill_gap?.length > 0 && (
          <p className={`text-xs mt-1 ${isCurrent ? "text-white/60" : "text-red-500"}`}>
            {data.skill_gap.length} skill{data.skill_gap.length > 1 ? "s" : ""} to build
          </p>
        )}
        <p className={`text-xs mt-2 line-clamp-2 ${isCurrent ? "text-white/60" : "text-[var(--muted)]"}`}>
          {data.description}
        </p>
        <p className={`text-xs mt-1 font-medium ${isCurrent ? "text-white/80" : "text-[var(--primary)]"}`}>
          Click for details →
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--primary)", width: 12, height: 12 }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const { roadmapResponse, profileId, user, profileData, setCompletedNodes } = useAppStore();
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);

  const completedNodes = roadmapResponse?.completedNodes ?? [];
  const totalNodes     = roadmapResponse?.roadmap_nodes.length ?? 0;
  const progressPct    = totalNodes > 0 ? Math.round((completedNodes.length / totalNodes) * 100) : 0;

  const nodes = useMemo(() => {
    if (!roadmapResponse) return [];
    return roadmapResponse.roadmap_nodes.map((node, i) => ({
      id:       node.node_id,
      position: { x: 80 + (i % 2) * 280, y: i * 220 + 40 },
      data:     { ...node, isCompleted: completedNodes.includes(node.node_id) },
      type:     "careerNode",
    }));
  }, [roadmapResponse, completedNodes]);

  const edges = useMemo(() => {
    if (!roadmapResponse) return [];
    return roadmapResponse.roadmap_edges.map((e) => ({
      id:         `${e.source}-${e.target}`,
      source:     e.source,
      target:     e.target,
      label:      e.label,
      animated:   true,
      style:      { stroke: "var(--primary)", strokeWidth: 2 },
      labelStyle: { fill: "var(--text)", fontWeight: 500, fontSize: 11 },
      labelBgStyle: { fill: "white", fillOpacity: 0.9 },
    }));
  }, [roadmapResponse]);

  const nodeTypes = useMemo(() => ({ careerNode: CareerNode }), []);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    const full = roadmapResponse?.roadmap_nodes.find(n => n.node_id === node.id);
    if (full) setSelectedNode(full);
  }, [roadmapResponse]);

  if (!roadmapResponse) return null;

  const prob = roadmapResponse.success_probability;
  const probColor = prob >= 70 ? "text-green-400" : prob >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <ProtectedRoute>
      {/* Full viewport layout */}
      <div className="fixed inset-0 top-14 flex flex-col" style={{ zIndex: 10 }}>

        {/* Top bar */}
        <div className="bg-[var(--dark)] text-white px-6 py-3 flex items-center justify-between flex-shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm">{roadmapResponse.current_role}</span>
            <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
            <span className="font-semibold text-[var(--accent)]">{roadmapResponse.target_role}</span>
            <span className={`ml-4 text-2xl font-bold font-serif ${probColor}`}>{prob}%</span>
            <span className="text-white/50 text-sm">· {roadmapResponse.total_transition_months} months</span>
            {roadmapResponse.fromCache && <span className="flex items-center gap-1 text-xs text-white/50"><Clock className="w-3 h-3" /> cached</span>}
            <span className="ml-4 flex items-center gap-2">
              <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs text-white/60">{completedNodes.length}/{totalNodes} done</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/reports" className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" /> Audit Report
            </Link>
            <ExportPDF roadmap={roadmapResponse} profileName={profileData?.fullName || user?.name} />
            <button onClick={() => setSidebarOpen(o => !o)} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
              {sidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              {sidebarOpen ? "Hide" : "Show"} Details
            </button>
          </div>
        </div>

        {/* Body: sidebar + flow */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
              {/* Explanation */}
              <div className="p-5 border-b border-slate-100">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">AI Explanation</p>
                <p className="text-sm text-[var(--text)] leading-relaxed">{roadmapResponse.explanation}</p>
              </div>

              {/* Emotional forecast */}
              <div className="p-5 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--dark)] mb-4">
                  <TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Journey Forecast
                </h3>
                <div className="space-y-4">
                  {roadmapResponse.emotional_forecast.map((phase, i) => (
                    <div key={i} className="relative pl-5 border-l-2 border-slate-100">
                      <div className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white
                        ${phase.stress_level.toLowerCase() === "high" ? "bg-red-500" : phase.stress_level.toLowerCase() === "medium" ? "bg-yellow-500" : "bg-green-500"}`} />
                      <p className="text-xs font-bold text-[var(--primary)] uppercase">{phase.timeline}</p>
                      <p className="text-sm font-medium text-[var(--dark)]">{phase.phase}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{phase.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternative paths */}
              <div className="p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--dark)] mb-3">
                  <Navigation className="w-4 h-4 text-[var(--primary)]" /> Alternative Paths
                </h3>
                <div className="space-y-3">
                  {roadmapResponse.alternative_paths.map((alt, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-semibold text-[var(--dark)]">{alt.path_name}</p>
                        <span className="text-xs font-bold text-[var(--primary)]">{alt.success_probability}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1 text-xs text-[var(--muted)]">
                        {alt.roles.map((r, ri) => (
                          <span key={ri}>{r}{ri < alt.roles.length - 1 ? " →" : ""}</span>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-1">{alt.total_months} months</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* React Flow — full remaining space */}
          <div className="flex-1 relative">
            <SanatanLabsWidget roadmap={roadmapResponse} />
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.3}
              maxZoom={2}
            >
              <Background color="#e2e8f0" gap={20} />
              <Controls />
              <MiniMap
                nodeColor={(n: any) =>
                  n.data.risk_level === "High" ? "#dc2626" : n.data.risk_level === "Medium" ? "#d97706" : "#16a34a"
                }
              />
            </ReactFlow>

            {/* Hint when no node selected */}
            {!selectedNode && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[var(--dark)]/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">
                Click any node to see detailed action plan
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Node flashcard drawer */}
      {selectedNode && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedNode(null)} />
          <NodeFlashcard
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            roadmapId={roadmapResponse.roadmapId}
            completed={completedNodes.includes(selectedNode.node_id)}
            onToggle={setCompletedNodes}
          />
        </>
      )}

      {/* Chat — always shown when roadmap exists; profileId falls back to user id */}
      <ChatDrawer profileId={profileId ?? user?.id ?? 'default'} roadmapId={roadmapResponse.roadmapId} />
    </ProtectedRoute>
  );
}
