"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

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

  const verdictIcon = (v: string) => {
    if (v === "Ready") return <CheckCircle2 className="w-6 h-6 text-green-600" />;
    if (v?.includes("months")) return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  const verdictColor = (v: string) =>
    v === "Ready" ? "text-green-600 bg-green-50 border-green-200" :
    v?.includes("months") ? "text-yellow-700 bg-yellow-50 border-yellow-200" :
    "text-red-600 bg-red-50 border-red-200";

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

        {step === "result" && result && (
          <div className="space-y-6">
            {/* Verdict card */}
            <div className={`rounded-2xl border-2 p-8 text-center ${verdictColor(result.verdict)}`}>
              <div className="flex justify-center mb-3">{verdictIcon(result.verdict)}</div>
              <h2 className="text-2xl font-bold mb-1">{result.verdict}</h2>
              <p className="text-sm opacity-80">{purpose === "hiring" ? "Hiring" : "Promotion"} evaluation for <strong>{targetRole}</strong></p>
              <div className="flex justify-center gap-8 mt-5">
                <div><p className="text-3xl font-bold">{result.success_probability}%</p><p className="text-xs opacity-70 mt-0.5">Success Probability</p></div>
                <div><p className="text-3xl font-bold">{result.roadmap_nodes?.length ?? 0}</p><p className="text-xs opacity-70 mt-0.5">Transition Steps</p></div>
                <div><p className="text-3xl font-bold">{result.skill_gaps?.length ?? 0}</p><p className="text-xs opacity-70 mt-0.5">Skill Gaps</p></div>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-[var(--dark)] mb-3">AI Assessment</h3>
              <p className="text-[var(--text)] text-sm leading-relaxed">{result.explanation}</p>
            </div>

            {/* Skill gaps */}
            {result.skill_gaps?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-[var(--dark)] mb-3">Skills to Develop</h3>
                <div className="flex flex-wrap gap-2">
                  {result.skill_gaps.map((s: string) => (
                    <span key={s} className="px-3 py-1.5 rounded-full text-sm bg-red-50 text-red-700 border border-red-200">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Transition path */}
            {result.roadmap_nodes?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-[var(--dark)] mb-4">Transition Path</h3>
                <div className="space-y-3">
                  {result.roadmap_nodes.map((node: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--dark)] text-sm">{node.role_title}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">+{node.timeline_months} months · ₹{node.salary_estimate_lpa} LPA</p>
                        {node.skill_gap?.length > 0 && <p className="text-xs text-red-600 mt-1">Gap: {node.skill_gap.join(", ")}</p>}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${node.risk_level === "Low" ? "bg-green-100 text-green-700" : node.risk_level === "Medium" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{node.risk_level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setStep("form"); setResult(null); }} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-[var(--text)] hover:bg-slate-50">Run Another Analysis</button>
              <Link href="/company/dashboard" className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-medium text-center hover:bg-[var(--secondary)] transition-colors">Back to Dashboard</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
