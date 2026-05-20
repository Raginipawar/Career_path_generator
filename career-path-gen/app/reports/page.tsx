"use client";

import { useAppStore } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ShieldCheck, Info, AlertTriangle, CheckCircle2, Users2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function ReportsPage() {
  const { roadmapResponse, profileData, profileId } = useAppStore();
  const [benchmarks, setBenchmarks] = useState<any>(null);

  useEffect(() => {
    if (!profileId) return;
    api.getBenchmarks(profileId)
      .then(setBenchmarks)
      .catch(() => {}); // silent — benchmarking is optional
  }, [profileId]);

  if (!roadmapResponse) return null; // ProtectedRoute will redirect

  // ── Audit radar (PASSIONIT / PRUTL) ──────────────────────────────────────────
  const scores = roadmapResponse.audit_scores;
  const allDimensions = Array.from(new Set(scores.map(s => s.dimension)));
  const radarData = allDimensions.map(dim => {
    const s = scores.find(score => score.dimension === dim);
    return {
      subject: dim.length > 14 ? dim.slice(0, 12) + '…' : dim,
      PASSIONIT: s?.framework === 'PASSIONIT' ? s.score : null,
      PRUTL:     s?.framework === 'PRUTL'     ? s.score : null,
      fullMark:  10,
    };
  });

  // ── Skill Gap Radar — current skills vs required for target role ──────────────
  const targetNode = roadmapResponse.roadmap_nodes[roadmapResponse.roadmap_nodes.length - 1];
  const userSkills = new Set((profileData?.technicalSkills ?? []).map(s => s.toLowerCase()));
  const skillGapData = (targetNode?.required_skills ?? []).slice(0, 8).map(skill => {
    const have = userSkills.has(skill.toLowerCase()) ? 10 : 0;
    return { subject: skill.length > 12 ? skill.slice(0, 10) + '…' : skill, Current: have, Required: 10, fullMark: 10 };
  });
  const readinessPct = skillGapData.length > 0
    ? Math.round(skillGapData.filter(d => d.Current === 10).length / skillGapData.length * 100)
    : 0;

  return (
    <ProtectedRoute>
      <div className="flex-1 bg-[var(--surface)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h1 className="text-3xl font-serif text-[var(--dark)] mb-2 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-[var(--primary)]" />
              Ethical AI Audit Report
            </h1>
            <p className="text-[var(--muted)] text-lg">
              Profile: <span className="font-semibold text-slate-700">{profileData?.fullName || "User"}</span> | 
              Generated for the transition to <span className="font-semibold text-slate-700">{roadmapResponse.target_role}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Radar Charts column */}
            <div className="lg:col-span-1 space-y-6">

              {/* Skill Gap Radar */}
              {skillGapData.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-serif text-[var(--dark)]">Skill Gap Radar</h2>
                    <span className={`text-sm font-bold ${readinessPct >= 70 ? 'text-green-600' : readinessPct >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>{readinessPct}% ready</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-3">Your skills vs what {targetNode?.role_title} requires</p>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={skillGapData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text)', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar name="Required" dataKey="Required" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.4} />
                        <Radar name="You" dataKey="Current" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.5} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Viability Radar (PASSIONIT / PRUTL) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-serif text-[var(--dark)] mb-4">Ethics Viability Radar</h2>
                <div className="w-full" style={{ height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 500 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: 'var(--primary)', fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }} />
                      <Radar name="PASSIONIT" dataKey="PASSIONIT" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.5} />
                      <Radar name="PRUTL" dataKey="PRUTL" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Framework Explanations */}
              <div className="space-y-4">
                <div className="bg-[var(--primary)]/5 p-5 rounded-2xl border border-[var(--primary)]/20">
                  <h3 className="font-serif text-lg text-[var(--primary)] mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> PASSIONIT Framework
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Evaluates Purpose, Accountability, Safety, Sustainability, Inclusivity, Objectivity, Non-bias, Integrity, and Transparency.
                  </p>
                </div>
                <div className="bg-[var(--accent)]/10 p-5 rounded-2xl border border-[var(--accent)]/30">
                  <h3 className="font-serif text-lg text-[#00bfa5] mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> PRUTL Framework
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Assesses Privacy, Reliability, Usability, Trustworthiness, and Legality of the generated transition plan.
                  </p>
                </div>
              </div>
            </div>  {/* end radar charts column */}

            {/* Score Table Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-xl font-serif text-[var(--dark)]">Detailed Audit Scores</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
                        <th className="p-4">Dimension</th>
                        <th className="p-4">Score</th>
                        <th className="p-4">Risk</th>
                        <th className="p-4">Explanation & Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scores.map((score, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 align-top">
                            <p className="font-bold text-[var(--dark)] mb-1">{score.dimension}</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border
                              ${score.framework === 'PASSIONIT' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' : 
                              'bg-[var(--accent)]/10 text-[#00bfa5] border-[var(--accent)]/30'}`}>
                              {score.framework}
                            </span>
                          </td>
                          <td className="p-4 align-top">
                            <span className="text-2xl font-serif font-bold text-[var(--primary)]">{score.score}</span>
                            <span className="text-xs text-[var(--muted)]">/10</span>
                          </td>
                          <td className="p-4 align-top">
                            <div className={`inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded
                              ${score.risk_level === 'High' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 
                                score.risk_level === 'Medium' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 
                                'bg-[var(--success)]/10 text-[var(--success)]'}`}>
                              {score.risk_level === 'High' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                              {score.risk_level}
                            </div>
                          </td>
                          <td className="p-4 align-top max-w-md">
                            <p className="text-sm text-slate-700 font-medium mb-1">{score.explanation}</p>
                            <p className="text-sm text-[var(--muted)] bg-slate-100 p-2 rounded line-clamp-2 mt-2 border border-slate-200/60">
                              <span className="font-semibold text-slate-600">Action:</span> {score.recommendation}
                            </p>
                            {score.flagged_biases && score.flagged_biases.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {score.flagged_biases.map((bias, bidx) => (
                                  <span key={bidx} className="text-[10px] uppercase font-bold bg-[var(--warning)]/20 text-[var(--warning)] px-2 py-0.5 rounded border border-[var(--warning)]/30">
                                    Flag: {bias}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          {/* Cohort Benchmarking */}
          {benchmarks && !benchmarks.message && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-serif text-[var(--dark)] mb-1 flex items-center gap-3">
                <Users2 className="w-6 h-6 text-[var(--primary)]" /> How You Compare
              </h2>
              <p className="text-[var(--muted)] text-sm mb-6">
                Benchmarked against <strong>{benchmarks.peerCount}</strong> peers in your cohort: <span className="text-[var(--primary)] font-medium">{benchmarks.cohortLabel}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: "Leadership Score", data: benchmarks.percentiles.leadershipScore, unit: "/10" },
                  { label: "Skill Breadth", data: benchmarks.percentiles.skillBreadth, unit: " skills" },
                  { label: "Experience", data: benchmarks.percentiles.experience, unit: "y" },
                ].map(({ label, data }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">{label}</p>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-4xl font-bold text-[var(--primary)]">{data.percentile}</span>
                      <span className="text-lg text-[var(--muted)] mb-1">%ile</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${data.percentile}%` }} />
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      Your score: <strong>{data.yours}</strong> · Peer avg: <strong>{data.peerAvg}</strong>
                    </p>
                    <p className="text-xs mt-1 font-medium" style={{
                      color: data.percentile >= 75 ? "var(--success)" : data.percentile >= 40 ? "var(--warning)" : "var(--danger)"
                    }}>
                      {data.percentile >= 75 ? "Top performer" : data.percentile >= 40 ? "Average range" : "Room to grow"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {benchmarks?.message && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
              <Users2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-[var(--muted)] text-sm">{benchmarks.message}</p>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
