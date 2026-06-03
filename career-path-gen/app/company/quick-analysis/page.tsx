"use client";
import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, Zap, Loader2, CheckCircle2, AlertTriangle, XCircle, BookOpen, TrendingUp, Navigation, Calendar, DollarSign, X, Wrench } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import ReactFlow, { Background, Controls, Handle, Position, NodeMouseHandler } from "reactflow";
import "reactflow/dist/style.css";
import ExportPDF from "@/components/ui/ExportPDF";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
function getToken() { try { return localStorage.getItem("company-token"); } catch { return null; } }

const defaultProfile: {
  fullName: string; age: number; gender: string; locationCity: string; locationState: string;
  highestDegree: string; fieldOfStudy: string; institutionTier: string;
  currentRole: string; currentIndustry: string; yearsOfExperience: number;
  employmentStatus: string; currentSalaryLpa: number;
  technicalSkills: string[]; softSkills: string[]; certifications: string[];
  interestDomains: string[]; careerGoal: string;
  preferredWorkStyle: string; willingToRelocate: boolean; targetTimelineYears: number;
  lifeStage: string; burnoutLevel: number; stressTolerance: number;
  hasDependents: boolean; recentLifeEvent: string;
  workLifePriority: string; leadershipScore: number; alignmentCategory: string;
} = {
  fullName: "", age: 28, gender: "", locationCity: "", locationState: "",
  highestDegree: "", fieldOfStudy: "", institutionTier: "Tier 2",
  currentRole: "", currentIndustry: "", yearsOfExperience: 3,
  employmentStatus: "Employed Full-Time", currentSalaryLpa: 0,
  technicalSkills: [], softSkills: [], certifications: [],
  interestDomains: [], careerGoal: "",
  preferredWorkStyle: "Hybrid", willingToRelocate: false, targetTimelineYears: 2,
  lifeStage: "Mid Career", burnoutLevel: 3, stressTolerance: 6,
  hasDependents: false, recentLifeEvent: "None",
  workLifePriority: "Career Growth", leadershipScore: 6, alignmentCategory: "Moderate",
};

export default function QuickAnalysisPage() {
  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [purpose, setPurpose] = useState<"hiring" | "promotion">("hiring");
  const [targetRole, setTargetRole] = useState("");
  const [profile, setProfile] = useState({ ...defaultProfile });
  const [skillInput, setSkillInput] = useState("");
  const [result, setResult] = useState<any>(null);

  const set = (k: string, v: any) => setProfile(p => ({ ...p, [k]: v }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !profile.technicalSkills.includes(s)) {
      setProfile(p => ({ ...p, technicalSkills: [...p.technicalSkills, s] }));
    }
    setSkillInput("");
  };

  const removeSkill = (s: string) => setProfile(p => ({ ...p, technicalSkills: p.technicalSkills.filter(x => x !== s) }));

  const runAnalysis = async () => {
    if (!targetRole.trim()) { toast.error("Enter a target role"); return; }
    if (!profile.currentRole.trim()) { toast.error("Enter current role"); return; }
    const token = getToken();
    if (!token) { toast.error("Please log in first"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/org/quick-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profile, targetRole, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep("result");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [selectedNode, setSelectedNode] = useState<any>(null);

  const verdictIcon = (v: string) => {
    if (v === "Ready") return <CheckCircle2 className="w-6 h-6 text-green-600" />;
    if (v?.includes("months")) return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  const verdictColor = (v: string) =>
    v === "Ready" ? "text-green-600 bg-green-50 border-green-200" :
    v?.includes("months") ? "text-yellow-700 bg-yellow-50 border-yellow-200" :
    "text-red-600 bg-red-50 border-red-200";

  // ReactFlow node component
  function QANode({ data, selected }: any) {
    const isCurrent = data.node_order === 1;
    const riskColor = data.risk_level === "Low" ? "#16a34a" : data.risk_level === "Medium" ? "#d97706" : "#dc2626";
    return (
      <div className="rounded-xl shadow-lg border-2 cursor-pointer hover:scale-105 transition-all" style={{ width: 200, background: isCurrent ? "var(--primary)" : "white", borderColor: selected ? "var(--accent)" : riskColor }}>
        <Handle type="target" position={Position.Top} style={{ background: "var(--primary)", width: 10, height: 10 }} />
        <div className="p-3">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isCurrent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{isCurrent ? "Now" : `+${data.timeline_months}mo`}</span>
            <span className="text-xs font-bold" style={{ color: isCurrent ? "white" : riskColor }}>{data.risk_level}</span>
          </div>
          <p className={`font-serif font-semibold text-sm leading-tight mb-0.5 ${isCurrent ? "text-white" : "text-slate-800"}`}>{data.role_title}</p>
          <p className={`text-xs ${isCurrent ? "text-white/70" : "text-slate-500"}`}>₹{data.salary_estimate_lpa} LPA</p>
          {data.skill_gap?.length > 0 && <p className={`text-xs mt-1 ${isCurrent ? "text-white/60" : "text-red-500"}`}>{data.skill_gap.length} gaps</p>}
          <p className={`text-xs mt-1 font-medium ${isCurrent ? "text-white/80" : "text-[var(--primary)]"}`}>Click for details →</p>
        </div>
        <Handle type="source" position={Position.Bottom} style={{ background: "var(--primary)", width: 10, height: 10 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link href="/company/dashboard" className="text-[var(--muted)] hover:text-[var(--primary)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-semibold text-[var(--dark)] flex items-center gap-2"><Zap className="w-4 h-4 text-[var(--primary)]" /> Quick Analysis</h1>
          <p className="text-xs text-[var(--muted)]">Evaluate a candidate or employee for a specific role — no account needed</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {step === "form" && (
          <div className="space-y-6">
            {/* Purpose toggle */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm font-medium text-[var(--text)] mb-3">Analysis Purpose</p>
              <div className="flex gap-3">
                {(["hiring", "promotion"] as const).map(p => (
                  <button key={p} onClick={() => setPurpose(p)}
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium capitalize transition-all ${purpose === p ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]" : "border-slate-200 text-slate-600 hover:border-[var(--accent)]"}`}>
                    {p === "hiring" ? "New Hire Evaluation" : "Promotion Consideration"}
                  </button>
                ))}
              </div>
            </div>

            {/* Target role */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Target Role *</label>
              <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Senior Product Manager, Lead Data Scientist" className="input-field" />
            </div>

            {/* Basic profile */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-[var(--dark)]">Candidate Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-[var(--text)] mb-1.5">Full Name</label><input type="text" value={profile.fullName} onChange={e => set("fullName", e.target.value)} className="input-field" placeholder="Candidate name" /></div>
                <div><label className="block text-sm font-medium text-[var(--text)] mb-1.5">Current Role *</label><input type="text" value={profile.currentRole} onChange={e => set("currentRole", e.target.value)} className="input-field" placeholder="Software Engineer" /></div>
                <div><label className="block text-sm font-medium text-[var(--text)] mb-1.5">Industry</label><input type="text" value={profile.currentIndustry} onChange={e => set("currentIndustry", e.target.value)} className="input-field" placeholder="FinTech" /></div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Years of Experience</label>
                  <input type="range" min="0" max="30" value={profile.yearsOfExperience} onChange={e => set("yearsOfExperience", Number(e.target.value))} className="w-full accent-[var(--accent)] mt-2" />
                  <p className="text-xs text-[var(--primary)] text-right">{profile.yearsOfExperience} years</p>
                </div>
              </div>

              {/* Technical skills */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Technical Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.technicalSkills.map(s => (
                    <span key={s} className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[var(--primary)]/10 text-[var(--primary)]">
                      {s}<button onClick={() => removeSkill(s)} className="ml-1 text-[var(--primary)]/60 hover:text-[var(--danger)]">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="Add skill... (Enter)" className="input-field flex-1 text-sm" />
                  <button onClick={addSkill} className="px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm border border-slate-200">Add</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Leadership Score</label>
                  <input type="range" min="0" max="10" value={profile.leadershipScore} onChange={e => set("leadershipScore", Number(e.target.value))} className="w-full accent-[var(--accent)]" />
                  <p className="text-xs text-[var(--primary)] text-right">{profile.leadershipScore}/10</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Burnout Level</label>
                  <input type="range" min="1" max="10" value={profile.burnoutLevel} onChange={e => set("burnoutLevel", Number(e.target.value))} className="w-full accent-[var(--accent)]" />
                  <p className="text-xs text-[var(--primary)] text-right">{profile.burnoutLevel}/10</p>
                </div>
              </div>
            </div>

            <button onClick={runAnalysis} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white py-3.5 rounded-xl font-medium hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors text-base">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analysing...</> : <><Zap className="w-5 h-5" /> Run Analysis</>}
            </button>
          </div>
        )}

        {step === "result" && result && (() => {
          const qaNodes = (result.roadmap_nodes ?? []).map((node: any, i: number) => ({
            id: node.node_id ?? `node_${i+1}`,
            position: { x: 80 + (i % 2) * 280, y: i * 200 + 40 },
            data: { ...node },
            type: "qaNode",
          }));
          const qaEdges = (result.roadmap_edges ?? []).map((e: any) => ({
            id: `${e.source}-${e.target}`,
            source: e.source, target: e.target, label: e.label, animated: true,
            style: { stroke: "var(--primary)", strokeWidth: 2 },
            labelStyle: { fill: "var(--text)", fontWeight: 500, fontSize: 11 },
            labelBgStyle: { fill: "white", fillOpacity: 0.9 },
          }));
          const nodeTypes = { qaNode: QANode };
          return (
          <div className="space-y-6">
            {/* Verdict card */}
            <div className={`rounded-2xl border-2 p-6 ${verdictColor(result.verdict)}`}>
              <div className="flex items-center gap-4 flex-wrap">
                {verdictIcon(result.verdict)}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{result.verdict}</h2>
                  <p className="text-sm opacity-80">{purpose === "hiring" ? "Hiring" : "Promotion"} · <strong>{targetRole}</strong></p>
                </div>
                <div className="flex gap-8">
                  <div className="text-center"><p className="text-3xl font-bold">{result.success_probability}%</p><p className="text-xs opacity-70">Probability</p></div>
                  <div className="text-center"><p className="text-3xl font-bold">{result.total_transition_months ?? 0}mo</p><p className="text-xs opacity-70">Timeline</p></div>
                  <div className="text-center"><p className="text-3xl font-bold">{result.skill_gaps?.length ?? 0}</p><p className="text-xs opacity-70">Skill Gaps</p></div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-[var(--dark)] mb-2">AI Assessment</h3>
              <p className="text-[var(--text)] text-sm leading-relaxed">{result.explanation}</p>
            </div>

            {/* ReactFlow roadmap — same as personal */}
            {qaNodes.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--dark)]">Career Transition Map</h3>
                  <p className="text-xs text-[var(--muted)]">Click a node for details</p>
                </div>
                <div style={{ height: 400 }}>
                  <ReactFlow nodes={qaNodes} edges={qaEdges} nodeTypes={nodeTypes}
                    onNodeClick={(_evt, node) => {
                      const full = result.roadmap_nodes?.find((n: any) => (n.node_id ?? `node_${result.roadmap_nodes.indexOf(n)+1}`) === node.id);
                      if (full) setSelectedNode(full);
                    }}
                    fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.3} maxZoom={2}>
                    <Background color="#e2e8f0" gap={20} />
                    <Controls />
                  </ReactFlow>
                </div>
              </div>
            )}

            {/* Selected node detail */}
            {selectedNode && (
              <div className="bg-white rounded-xl border-2 border-[var(--primary)]/30 p-6 relative">
                <button onClick={() => setSelectedNode(null)} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--dark)]"><X className="w-5 h-5" /></button>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide">Step {selectedNode.node_order}</p>
                    <h3 className="text-xl font-serif text-[var(--dark)] mt-0.5">{selectedNode.role_title}</h3>
                    <div className="flex gap-4 mt-1 text-sm text-[var(--muted)]">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />+{selectedNode.timeline_months} months</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />₹{selectedNode.salary_estimate_lpa} LPA</span>
                      <span className={`font-medium ${selectedNode.risk_level === "Low" ? "text-green-600" : selectedNode.risk_level === "Medium" ? "text-yellow-600" : "text-red-600"}`}>{selectedNode.risk_level} Risk</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[var(--text)] mb-4">{selectedNode.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  {selectedNode.skill_gap?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-2"><Wrench className="w-3.5 h-3.5" /> Skills to Build</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.skill_gap.map((s: string) => <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {selectedNode.required_skills?.filter((s: string) => !selectedNode.skill_gap?.includes(s)).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 flex items-center gap-1 mb-2"><CheckCircle2 className="w-3.5 h-3.5" /> Already Have</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.required_skills.filter((s: string) => !selectedNode.skill_gap?.includes(s)).map((s: string) => <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emotional forecast */}
            {result.emotional_forecast?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-[var(--dark)] mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Journey Forecast</h3>
                <div className="space-y-3">
                  {result.emotional_forecast.map((phase: any, i: number) => (
                    <div key={i} className="flex gap-3 pl-3 border-l-2 border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-[var(--primary)] uppercase">{phase.timeline}</p>
                        <p className="text-sm font-medium text-[var(--dark)]">{phase.phase} · <span className={`text-xs ${phase.stress_level === "High" ? "text-red-500" : phase.stress_level === "Medium" ? "text-yellow-600" : "text-green-600"}`}>{phase.stress_level} Stress</span></p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{phase.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative paths */}
            {result.alternative_paths?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-[var(--dark)] mb-4 flex items-center gap-2"><Navigation className="w-4 h-4 text-[var(--primary)]" /> Alternative Paths</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.alternative_paths.map((alt: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between mb-2">
                        <p className="text-sm font-semibold text-[var(--dark)]">{alt.path_name}</p>
                        <span className="text-sm font-bold text-[var(--primary)]">{alt.success_probability}%</span>
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

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => { setStep("form"); setResult(null); setSelectedNode(null); }} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-[var(--text)] hover:bg-slate-50">Run Another Analysis</button>
              {result && (() => {
                const pdfRoadmap = {
                  ...result,
                  roadmapId: "quick-analysis",
                  completedNodes: [],
                  fromCache: false,
                  current_role: profile.currentRole,
                  target_role: targetRole,
                  audit_scores: result.audit_scores ?? [],
                  emotional_forecast: result.emotional_forecast ?? [],
                  alternative_paths: result.alternative_paths ?? [],
                  roadmap_nodes: result.roadmap_nodes ?? [],
                  roadmap_edges: result.roadmap_edges ?? [],
                };
                return (
                  <div className="flex-1">
                    <ExportPDF roadmap={pdfRoadmap} profileName={profile.fullName || "Candidate"} variant="light" />
                  </div>
                );
              })()}
              <Link href="/company/dashboard" className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-medium text-center hover:bg-[var(--secondary)] transition-colors">Back to Dashboard</Link>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
