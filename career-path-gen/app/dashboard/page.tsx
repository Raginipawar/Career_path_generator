"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BrainCircuit, TrendingUp, Users, BarChart2, Zap, ArrowRight, Loader2 } from "lucide-react";

const ALIGNMENT_COLORS = { High: "#16a34a", Moderate: "#d97706", Low: "#dc2626" };

export default function DashboardPage() {
  const { user, roadmapResponse } = useAppStore();
  const [analytics, setAnalytics]   = useState<any>(null);
  const [clusters, setClusters]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getClusters()])
      .then(([a, c]) => { setAnalytics(a); setClusters(c.clusters?.slice(0, 10) ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pieData = analytics?.alignmentDistribution
    ? Object.entries(analytics.alignmentDistribution).map(([name, count]) => ({ name, value: count as number }))
    : [];

  const barData = clusters.map((c: any) => ({ name: c.name.split(' ')[0], score: c.demandScore }));

  return (
    <ProtectedRoute>
      <div className="flex-1 bg-[var(--surface)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Welcome header */}
          <div className="bg-[var(--dark)] text-white rounded-2xl p-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-[var(--accent)]">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="text-white/70 mt-1">Your career intelligence command centre.</p>
            </div>
            <div className="flex gap-3">
              {roadmapResponse ? (
                <Link href="/roadmap" className="flex items-center gap-2 bg-[var(--accent)] text-[var(--dark)] px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
                  View Roadmap <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link href="/profile" className="flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[var(--secondary)] transition-colors">
                  <BrainCircuit className="w-4 h-4" /> Generate My Roadmap
                </Link>
              )}
              <Link href="/trends" className="flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/20 transition-colors">
                <TrendingUp className="w-4 h-4" /> Market Trends
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" /></div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Profiles Created",    value: analytics?.totalProfiles ?? 0,     icon: <Users className="w-5 h-5" /> },
                  { label: "Roadmaps Generated",  value: analytics?.totalRoadmaps ?? 0,     icon: <BrainCircuit className="w-5 h-5" /> },
                  { label: "Latest Probability",  value: analytics?.latestProbability != null ? `${Math.round(analytics.latestProbability * 100)}%` : "—", icon: <Zap className="w-5 h-5" /> },
                  { label: "Top Clusters",        value: clusters.length,                    icon: <BarChart2 className="w-5 h-5" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-[var(--muted)] mb-2">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
                    <p className="text-3xl font-bold text-[var(--dark)]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alignment distribution pie */}
                {pieData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="font-semibold text-[var(--dark)] mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[var(--primary)]" /> Your Alignment Distribution</h2>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={ALIGNMENT_COLORS[entry.name as keyof typeof ALIGNMENT_COLORS] ?? "#94a3b8"} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Demand scores bar chart */}
                {barData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-[var(--dark)] flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Top Career Cluster Demand</h2>
                      <Link href="/trends" className="text-xs text-[var(--primary)] hover:underline">Full trends →</Link>
                    </div>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="score" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Audit dimension breakdown */}
              {analytics?.alignmentDistribution && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="font-semibold text-[var(--dark)] mb-4">Alignment Breakdown</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {(["High", "Moderate", "Low"] as const).map(level => {
                      const count = analytics.alignmentDistribution[level] ?? 0;
                      const total = (analytics.alignmentDistribution.High ?? 0) + (analytics.alignmentDistribution.Moderate ?? 0) + (analytics.alignmentDistribution.Low ?? 0);
                      const pct = total > 0 ? Math.round(count / total * 100) : 0;
                      return (
                        <div key={level} className="text-center p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <p className="text-3xl font-bold" style={{ color: ALIGNMENT_COLORS[level] }}>{count}</p>
                          <p className="text-sm font-medium text-[var(--text)] mt-1">{level} Alignment</p>
                          <p className="text-xs text-[var(--muted)] mt-0.5">{pct}% of total</p>
                          <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ALIGNMENT_COLORS[level] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
