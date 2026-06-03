"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, BrainCircuit, Loader2, ShieldCheck, TrendingUp,
  Navigation, ChevronLeft, ChevronRight, X, BookOpen, Wrench,
  AlertTriangle, CheckCircle2, ArrowRight, Calendar, DollarSign, BarChart2,
} from "lucide-react";
import ReactFlow, {
  Background, Controls, MiniMap, Handle, Position, NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import toast from "react-hot-toast";
import Link from "next/link";
import ExportPDF from "@/components/ui/ExportPDF";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6017";
function getToken() { try { return localStorage.getItem("company-token"); } catch { return null; } }

// ─── Node Flashcard (same detail panel as personal roadmap) ───────────────────
function NodeFlashcard({ node, onClose }: { node: any; onClose: () => void }) {
  const riskColor =
    node.risk_level === "Low"   ? "text-green-600 bg-green-50 border-green-200" :
    node.risk_level === "Medium"? "text-yellow-700 bg-yellow-50 border-yellow-200" :
                                  "text-red-600 bg-red-50 border-red-200";

  const months = node.timeline_months;
  const third  = Math.ceil(months / 3);
  const plan   = months > 0 ? [
    { period: `Month 1–${third}`,                                   focus: "Foundation — learn core skills, take relevant courses, build first project" },
    { period: `Month ${third + 1}–${Math.ceil(months * 2 / 3)}`,   focus: "Application — work on real projects, contribute to team, get feedback" },
    { period: `Month ${Math.ceil(months * 2 / 3) + 1}–${months}`,  focus: "Consolidation — apply for roles, negotiate offers, transition" },
  ] : [];

  return (
    <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
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
        <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100">
          <p className="text-[var(--text)] text-sm leading-relaxed">{node.description}</p>
        </div>

        {node.skill_gap?.length > 0 && (
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
              <Wrench className="w-4 h-4 text-[var(--primary)]" /> Skills to Build
            </h3>
            <div className="flex flex-wrap gap-2">
              {node.skill_gap.map((s: string) => (
                <span key={s} className="px-3 py-1 rounded-full text-sm bg-red-50 text-red-700 border border-red-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        {node.required_skills?.filter((s: string) => !node.skill_gap?.includes(s)).length > 0 && (
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Skills Already Present
            </h3>
            <div className="flex flex-wrap gap-2">
              {node.required_skills.filter((s: string) => !node.skill_gap?.includes(s)).map((s: string) => (
                <span key={s} className="px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200">{s}</span>
              ))}
            </div>
          </div>
        )}

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

        <div className="px-6 py-5">
          <h3 className="flex items-center gap-2 font-semibold text-[var(--dark)] text-sm mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600" /> Risk & Mitigation
          </h3>
          <div className="space-y-2">
            {node.risk_level === "High" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>High risk transition.</strong> Consider upskilling for 3-6 months before applying. Build a strong portfolio in this domain first.
              </div>
            )}
            {node.skill_gap?.length > 3 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                <strong>Large skill gap ({node.skill_gap.length} skills).</strong> Prioritise the top 2-3 that appear most in job descriptions.
              </div>
            )}
            {node.salary_estimate_lpa > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Salary tip.</strong> ₹{node.salary_estimate_lpa} LPA is the estimated range. Research on LinkedIn Salary and Glassdoor before accepting offers.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Career Node (identical to personal roadmap) ──────────────────────────────
function CareerNode({ data, selected }: any) {
  const isCurrent  = data.node_order === 1;
  const riskBorder = data.risk_level === "Low" ? "#16a34a" : data.risk_level === "Medium" ? "#d97706" : "#dc2626";
  return (
    <div
      className="rounded-xl shadow-lg border-2 transition-all cursor-pointer hover:scale-105"
      style={{ width: 220, background: isCurrent ? "var(--primary)" : "white", borderColor: selected ? "var(--accent)" : riskBorder, boxShadow: selected ? "0 0 0 3px var(--accent)" : undefined }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "var(--primary)", width: 12, height: 12 }} />
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCurrent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
            {isCurrent ? "Current" : `+${data.timeline_months}mo`}
          </span>
          <span className="text-xs font-bold" style={{ color: isCurrent ? "white" : riskBorder }}>{data.risk_level}</span>
        </div>
        <p className={`font-serif font-semibold text-sm leading-tight mb-1 ${isCurrent ? "text-white" : "text-[var(--dark)]"}`}>{data.role_title}</p>
        <p className={`text-xs ${isCurrent ? "text-white/70" : "text-[var(--muted)]"}`}>₹{data.salary_estimate_lpa} LPA</p>
        {data.skill_gap?.length > 0 && <p className={`text-xs mt-1 ${isCurrent ? "text-white/60" : "text-red-500"}`}>{data.skill_gap.length} skill{data.skill_gap.length > 1 ? "s" : ""} to build</p>}
        <p className={`text-xs mt-2 line-clamp-2 ${isCurrent ? "text-white/60" : "text-[var(--muted)]"}`}>{data.description}</p>
        <p className={`text-xs mt-1 font-medium ${isCurrent ? "text-white/80" : "text-[var(--primary)]"}`}>Click for details →</p>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--primary)", width: 12, height: 12 }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [careerGoal, setCareerGoal] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/company/login"); return; }
    fetch(`${BASE_URL}/api/org/employees/${employeeId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { toast.error("Failed to load employee"); setLoading(false); });
  }, [employeeId]);

  const generateRoadmap = async () => {
    if (!careerGoal.trim()) { toast.error("Enter a career goal first"); return; }
    setGenerating(true);
    const token = getToken()!;
    try {
      const res = await fetch(`${BASE_URL}/api/org/roadmap/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employeeId, careerGoal }),
      });
      const roadmap = await res.json();
      if (!res.ok) throw new Error(roadmap.error);
      setData((prev: any) => ({ ...prev, roadmap }));
      setShowGoalInput(false);
      toast.success("Roadmap generated!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const roadmap  = data?.roadmap;
  const profile  = data?.profile;
  const employee = data?.employee;

  const nodes = useMemo(() => {
    if (!roadmap?.roadmap_nodes) return [];
    return roadmap.roadmap_nodes.map((node: any, i: number) => ({
      id:       node.node_id || `node_${i + 1}`,
      position: { x: 80 + (i % 2) * 280, y: i * 220 + 40 },
      data:     { ...node },
      type:     "careerNode",
    }));
  }, [roadmap]);

  const edges = useMemo(() => {
    if (!roadmap?.roadmap_edges) return [];
    return roadmap.roadmap_edges.map((e: any) => ({
      id:         `${e.source}-${e.target}`,
      source:     e.source,
      target:     e.target,
      label:      e.label,
      animated:   true,
      style:      { stroke: "var(--primary)", strokeWidth: 2 },
      labelStyle: { fill: "var(--text)", fontWeight: 500, fontSize: 11 },
      labelBgStyle: { fill: "white", fillOpacity: 0.9 },
    }));
  }, [roadmap]);

  const nodeTypes = useMemo(() => ({ careerNode: CareerNode }), []);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    const full = roadmap?.roadmap_nodes?.find((n: any) => (n.node_id || `node_${roadmap.roadmap_nodes.indexOf(n) + 1}`) === node.id);
    if (full) setSelectedNode(full);
  }, [roadmap]);

  const prob      = roadmap?.success_probability ?? 0;
  const probColor = prob >= 70 ? "text-green-400" : prob >= 50 ? "text-yellow-400" : "text-red-400";

  // Shape roadmap for ExportPDF (matches RoadmapResponse interface)
  const pdfRoadmap = roadmap ? {
    ...roadmap,
    roadmapId:                roadmap.roadmapId ?? "emp",
    completedNodes:           roadmap.completedNodes ?? [],
    fromCache:                false,
    audit_scores:             roadmap.audit_scores ?? [],
    emotional_forecast:       roadmap.emotional_forecast ?? [],
    alternative_paths:        roadmap.alternative_paths ?? [],
  } : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
      <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 top-0 flex flex-col" style={{ zIndex: 10 }}>

      {/* Top bar */}
      <div className="bg-[var(--dark)] text-white px-6 py-3 flex items-center justify-between flex-shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/company/dashboard" className="text-white/60 hover:text-white transition-colors mr-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="font-semibold text-white leading-none">{employee?.name ?? "Employee"}</p>
            <p className="text-white/50 text-xs mt-0.5">{employee?.email} · {profile?.currentRole || "No role set"}</p>
          </div>
          {roadmap && (
            <>
              <ArrowRight className="w-4 h-4 text-[var(--accent)] ml-3" />
              <span className="font-semibold text-[var(--accent)]">{roadmap.target_role}</span>
              <span className={`ml-3 text-2xl font-bold font-serif ${probColor}`}>{prob}%</span>
              <span className="text-white/50 text-sm">· {roadmap.total_transition_months} months</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pdfRoadmap && <ExportPDF roadmap={pdfRoadmap} profileName={employee?.name} />}
          <button
            onClick={() => setShowGoalInput(v => !v)}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--secondary)] transition-colors"
          >
            <BrainCircuit className="w-4 h-4" />
            {roadmap ? "Regenerate" : "Generate Roadmap"}
          </button>
          {roadmap && (
            <button onClick={() => setSidebarOpen(o => !o)} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
              {sidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              {sidebarOpen ? "Hide" : "Show"} Details
            </button>
          )}
        </div>
      </div>

      {/* Career goal input */}
      {showGoalInput && (
        <div className="bg-[var(--primary)]/5 border-b border-[var(--accent)]/30 px-6 py-4 flex-shrink-0">
          <p className="text-sm font-medium text-[var(--primary)] mb-2">Set career goal for {employee?.name}</p>
          <div className="flex gap-3">
            <input type="text" value={careerGoal} onChange={e => setCareerGoal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generateRoadmap()}
              placeholder="e.g. Transition to Senior Data Scientist in 18 months"
              className="flex-1 input-field text-sm" />
            <button onClick={generateRoadmap} disabled={generating}
              className="flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : "Generate"}
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        {roadmap && sidebarOpen && (
          <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">

            {/* Profile stats */}
            {profile && (
              <div className="p-5 border-b border-slate-100 grid grid-cols-2 gap-3">
                {[
                  { label: "Experience",  value: `${profile.yearsOfExperience}y` },
                  { label: "Alignment",   value: profile.alignmentCategory, color: profile.alignmentCategory === "High" ? "text-green-600" : profile.alignmentCategory === "Low" ? "text-red-500" : "text-yellow-600" },
                  { label: "Burnout",     value: `${profile.burnoutLevel}/10`, color: profile.burnoutLevel > 7 ? "text-red-500" : "text-[var(--dark)]" },
                  { label: "Leadership",  value: `${profile.leadershipScore}/10` },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{item.label}</p>
                    <p className={`font-bold text-sm mt-0.5 ${(item as any).color || "text-[var(--dark)]"}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Explanation */}
            <div className="p-5 border-b border-slate-100">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">AI Explanation</p>
              <p className="text-sm text-[var(--text)] leading-relaxed">{roadmap.explanation}</p>
            </div>

            {/* Emotional forecast */}
            {roadmap.emotional_forecast?.length > 0 && (
              <div className="p-5 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--dark)] mb-4">
                  <TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Journey Forecast
                </h3>
                <div className="space-y-4">
                  {roadmap.emotional_forecast.map((phase: any, i: number) => (
                    <div key={i} className="relative pl-5 border-l-2 border-slate-100">
                      <div className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${phase.stress_level === "High" ? "bg-red-500" : phase.stress_level === "Medium" ? "bg-yellow-500" : "bg-green-500"}`} />
                      <p className="text-xs font-bold text-[var(--primary)] uppercase">{phase.timeline}</p>
                      <p className="text-sm font-medium text-[var(--dark)]">{phase.phase}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{phase.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative paths */}
            {roadmap.alternative_paths?.length > 0 && (
              <div className="p-5 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--dark)] mb-3">
                  <Navigation className="w-4 h-4 text-[var(--primary)]" /> Alternative Paths
                </h3>
                <div className="space-y-3">
                  {roadmap.alternative_paths.map((alt: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-semibold text-[var(--dark)]">{alt.path_name}</p>
                        <span className="text-xs font-bold text-[var(--primary)]">{alt.success_probability}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1 text-xs text-[var(--muted)]">
                        {alt.roles?.map((r: string, ri: number) => <span key={ri}>{r}{ri < alt.roles.length - 1 ? " →" : ""}</span>)}
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-1">{alt.total_months} months</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ethical Audit */}
            {roadmap.audit_scores?.length > 0 && (
              <div className="p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--dark)] mb-3">
                  <ShieldCheck className="w-4 h-4 text-[var(--primary)]" /> Ethical Audit
                </h3>
                <div className="space-y-2">
                  {roadmap.audit_scores.slice(0, 6).map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${s.risk_level === "Low" ? "bg-green-500" : s.risk_level === "Medium" ? "bg-yellow-500" : "bg-red-500"}`} />
                      <div>
                        <p className="text-xs font-medium text-[var(--dark)]">{s.dimension} <span className="text-[var(--muted)]">({s.score}/10)</span></p>
                        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{s.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flow / empty state */}
        <div className="flex-1 relative bg-[var(--surface)]">
          {!roadmap && !generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <BrainCircuit className="w-16 h-16 text-slate-300" />
              <p className="text-[var(--muted)] text-lg font-medium">No roadmap generated yet</p>
              <p className="text-sm text-[var(--muted)]">Click "Generate Roadmap" and enter a career goal.</p>
            </div>
          )}

          {generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/60">
              <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
              <p className="text-[var(--primary)] font-medium animate-pulse">Generating roadmap via AI…</p>
            </div>
          )}

          {roadmap && !generating && (
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
              <MiniMap nodeColor={(n: any) => n.data.risk_level === "High" ? "#dc2626" : n.data.risk_level === "Medium" ? "#d97706" : "#16a34a"} />
            </ReactFlow>
          )}

          {roadmap && !selectedNode && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[var(--dark)]/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">
              Click any node to see detailed action plan
            </div>
          )}
        </div>
      </div>

      {/* Node flashcard */}
      {selectedNode && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedNode(null)} />
          <NodeFlashcard node={selectedNode} onClose={() => setSelectedNode(null)} />
        </>
      )}
    </div>
  );
}
