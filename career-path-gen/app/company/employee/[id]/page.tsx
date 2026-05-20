"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, BrainCircuit, Loader2, Target, Clock, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import toast from "react-hot-toast";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() { try { return localStorage.getItem("company-token"); } catch { return null; } }

const riskColor = (r: string) =>
  r === "Low" ? "#16a34a" : r === "Medium" ? "#d97706" : "#dc2626";

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [careerGoal, setCareerGoal] = useState("");
  const [showGoalInput, setShowGoalInput] = useState(false);

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
      <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
    </div>
  );

  const roadmap = data?.roadmap;
  const profile = data?.profile;
  const employee = data?.employee;

  // Build React Flow nodes + edges
  const nodes = roadmap?.roadmap_nodes?.map((node: any, i: number) => ({
    id: node.node_id || `${i}`,
    position: { x: i * 240, y: 120 },
    data: {
      label: (
        <div className="text-left p-1">
          <p className="font-semibold text-sm text-[var(--dark)]">{node.role_title}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">+{node.timeline_months}mo · ₹{node.salary_estimate_lpa}LPA</p>
          <span className="text-xs font-medium mt-1 inline-block" style={{ color: riskColor(node.risk_level) }}>● {node.risk_level} Risk</span>
        </div>
      ),
    },
    style: { background: "#fff", border: `2px solid ${riskColor(node.risk_level)}`, borderRadius: 12, padding: 8, minWidth: 180 },
  })) ?? [];

  const edges = roadmap?.roadmap_edges?.map((e: any, i: number) => ({
    id: `e${i}`, source: e.source, target: e.target, label: e.label,
    style: { stroke: "var(--accent)" }, animated: true,
  })) ?? [];

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/company/dashboard" className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-[var(--dark)]">{employee?.name}</h1>
            <p className="text-xs text-[var(--muted)]">{employee?.email} · {profile?.currentRole || "No role"}</p>
          </div>
        </div>
        <button
          onClick={() => setShowGoalInput(!showGoalInput)}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--secondary)] transition-colors"
        >
          <BrainCircuit className="w-4 h-4" />
          {roadmap ? "Regenerate Roadmap" : "Generate Roadmap"}
        </button>
      </div>

      {/* Career goal input */}
      {showGoalInput && (
        <div className="bg-[var(--primary)]/5 border-b border-[var(--accent)]/30 px-6 py-4">
          <p className="text-sm font-medium text-[var(--primary)] mb-2">Set career goal for {employee?.name}</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={careerGoal}
              onChange={e => setCareerGoal(e.target.value)}
              placeholder="e.g. Transition to Senior Data Scientist in 18 months"
              className="flex-1 input-field text-sm"
            />
            <button onClick={generateRoadmap} disabled={generating} className="flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : "Generate"}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Profile Summary */}
        {profile && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-[var(--muted)] uppercase tracking-wide">Experience</p><p className="font-semibold text-[var(--dark)] mt-1">{profile.yearsOfExperience} years</p></div>
            <div><p className="text-xs text-[var(--muted)] uppercase tracking-wide">Alignment</p><p className={`font-semibold mt-1 ${profile.alignmentCategory === "High" ? "text-green-600" : profile.alignmentCategory === "Moderate" ? "text-yellow-600" : "text-red-500"}`}>{profile.alignmentCategory}</p></div>
            <div><p className="text-xs text-[var(--muted)] uppercase tracking-wide">Burnout Level</p><p className={`font-semibold mt-1 ${profile.burnoutLevel > 7 ? "text-red-500" : "text-[var(--dark)]"}`}>{profile.burnoutLevel}/10</p></div>
            <div><p className="text-xs text-[var(--muted)] uppercase tracking-wide">Leadership</p><p className="font-semibold text-[var(--dark)] mt-1">{profile.leadershipScore}/10</p></div>
          </div>
        )}

        {!roadmap && !generating && (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <BrainCircuit className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-[var(--muted)]">No roadmap generated yet.</p>
            <p className="text-sm text-[var(--muted)] mt-1">Click "Generate Roadmap" above and set a career goal.</p>
          </div>
        )}

        {generating && (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin mx-auto mb-4" />
            <p className="text-[var(--muted)]">Generating roadmap via AI...</p>
          </div>
        )}

        {roadmap && !generating && (
          <>
            {/* Roadmap Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Success Probability</p>
                <p className={`text-3xl font-bold ${roadmap.success_probability >= 70 ? "text-green-600" : roadmap.success_probability >= 50 ? "text-yellow-600" : "text-red-500"}`}>{roadmap.success_probability}%</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Timeline</p>
                <p className="text-3xl font-bold text-[var(--primary)]">{roadmap.total_transition_months}<span className="text-base font-normal text-[var(--muted)]"> mo</span></p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Target Role</p>
                <p className="text-lg font-bold text-[var(--dark)] leading-tight">{roadmap.target_role}</p>
              </div>
            </div>

            {/* React Flow */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: 320 }}>
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background gap={16} color="#f1f5f9" />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>

            {/* Explanation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-[var(--dark)] mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[var(--primary)]" /> AI Assessment</h3>
              <p className="text-[var(--text)] text-sm leading-relaxed">{roadmap.explanation}</p>
            </div>

            {/* Audit scores preview */}
            {roadmap.audit_scores?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-[var(--dark)] mb-4">Ethical Audit (Top concerns)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roadmap.audit_scores.slice(0, 4).map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${s.risk_level === "Low" ? "bg-green-500" : s.risk_level === "Medium" ? "bg-yellow-500" : "bg-red-500"}`} />
                      <div>
                        <p className="text-sm font-medium text-[var(--dark)]">{s.dimension} <span className="text-xs text-[var(--muted)]">({s.score}/10)</span></p>
                        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{s.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
