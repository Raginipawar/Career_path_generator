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
  CheckCircle2, ArrowRight, Calendar, DollarSign, BarChart2,
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

  // Suggested learning resources based on skill gap
  const courses = node.skill_gap.slice(0, 4).map(skill => ({
    skill,
    resource: skill.toLowerCase().includes("python") ? "Python — freeCodeCamp (free, YouTube)"
      : skill.toLowerCase().includes("aws") ? "AWS — A Cloud Guru or official AWS training"
      : skill.toLowerCase().includes("sql") ? "SQL — Mode Analytics SQL Tutorial (free)"
      : skill.toLowerCase().includes("docker") ? "Docker — Docker's official get-started guide (free)"
      : skill.toLowerCase().includes("react") ? "React — official React docs + Scrimba course"
      : skill.toLowerCase().includes("ml") || skill.toLowerCase().includes("machine") ? "ML — Andrew Ng's ML Specialization on Coursera"
      : skill.toLowerCase().includes("system") ? "System Design — Grokking System Design (Educative)"
      : skill.toLowerCase().includes("leadership") ? "Leadership — \"The Manager's Path\" by Camille Fournier"
      : `${skill} — search Coursera, Udemy, or YouTube for beginner guides`,
  }));

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
              <BookOpen className="w-4 h-4 text-[var(--primary)]" /> Recommended Learning
            </h3>
            <div className="space-y-3">
              {courses.map(({ skill, resource }) => (
                <div key={skill} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide mb-0.5">{skill}</p>
                  <p className="text-sm text-[var(--text)]">{resource}</p>
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
  const { roadmapResponse, profileId, setCompletedNodes } = useAppStore();
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
            <ExportPDF roadmap={roadmapResponse} />
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

      {/* Chat */}
      {profileId && (
        <ChatDrawer profileId={profileId} roadmapId={roadmapResponse.roadmapId} />
      )}
    </ProtectedRoute>
  );
}
