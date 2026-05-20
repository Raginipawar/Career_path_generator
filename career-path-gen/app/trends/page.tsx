"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { TrendingUp, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#00695c", "#0288d1", "#7b1fa2", "#f57c00",
  "#c62828", "#2e7d32", "#4527a0", "#558b2f",
];

export default function TrendsPage() {
  const { user } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDemandTrends()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex-1 bg-[var(--surface)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h1 className="text-3xl font-serif text-[var(--dark)] mb-2 flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-[var(--primary)]" /> Market Trend Analysis
            </h1>
            <p className="text-[var(--muted)]">
              Demand scores for the top career clusters over the past 8 weeks. Rising clusters indicate growing job market demand.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            </div>
          ) : !data?.chartData?.length ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-[var(--muted)]">No trend data yet. Come back soon.</p>
            </div>
          ) : (
            <>
              {/* Main line chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h2 className="font-semibold text-[var(--dark)] mb-6">Demand Score Trends (Top 8 Domains)</h2>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                      <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(v: any) => [`${v}`, ""]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                      {data.clusterNames.map((name: string, i: number) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Latest snapshot table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-[var(--dark)]">Latest Demand Scores</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Domain</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Current Score</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">8-week Change</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.clusterNames.map((name: string, i: number) => {
                        const rows = data.chartData;
                        const first = rows[0]?.[name] as number ?? 0;
                        const last  = rows[rows.length - 1]?.[name] as number ?? 0;
                        const change = Math.round((last - first) * 10) / 10;
                        return (
                          <tr key={name} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-[var(--dark)] flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                              {name}
                            </td>
                            <td className="px-6 py-4 font-bold text-[var(--primary)]">{last}</td>
                            <td className="px-6 py-4">
                              <span className={`font-semibold ${change > 0 ? "text-green-600" : change < 0 ? "text-red-500" : "text-slate-500"}`}>
                                {change > 0 ? "+" : ""}{change}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                change > 2 ? "bg-green-100 text-green-700" :
                                change < -2 ? "bg-red-100 text-red-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {change > 2 ? "Rising" : change < -2 ? "Declining" : "Stable"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
