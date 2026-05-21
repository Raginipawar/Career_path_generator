"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, TrendingUp, Upload, Search, ChevronRight, LogOut, Zap, BarChart3, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getCompanyToken() {
  try { return localStorage.getItem("company-token"); } catch { return null; }
}
function getCompanyUser() {
  try { return JSON.parse(localStorage.getItem("company-user") || "null"); } catch { return null; }
}

interface Employee {
  id: string; name: string; email: string; currentRole: string;
  alignment: string; probability: number | null; targetRole: string | null;
  profileId: string | null; latestRoadmapId: string | null;
  domains: string[]; experience: number;
}

interface DashboardStats {
  org: { name: string; industry: string };
  totalEmployees: number; totalRoadmaps: number;
  alignmentDistribution: { High: number; Moderate: number; Low: number };
  topSkillsInOrg: { skill: string; count: number }[];
  avgLeadershipScore: number;
}

export default function CompanyDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getCompanyToken();
    if (!token) { router.push("/company/login"); return; }
    fetchAll(token);
  }, []);

  const fetchAll = async (token: string) => {
    setLoading(true);
    try {
      const [empRes, statsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/org/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/org/dashboard`,  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!empRes.ok || !statsRes.ok) throw new Error("Failed to load data");
      const empData  = await empRes.json();
      const statsData = await statsRes.json();
      setEmployees(empData.employees);
      setStats(statsData);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const token = getCompanyToken()!;
    const form = new FormData();
    form.append("employees", file);
    try {
      const res = await fetch(`${BASE_URL}/api/org/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.created > 0) {
        toast.success(`${data.created} employee${data.created !== 1 ? 's' : ''} added. Roadmaps generating in background.`);
      }
      if (data.skipped > 0) {
        toast(`${data.skipped} rows skipped (already exist)`, { icon: 'ℹ️' });
      }
      if (data.errors?.length) {
        const firstErr = data.errorDetails?.[0] ?? data.errors[0];
        toast.error(`${data.errors.length} rows failed. First error: ${firstErr}`, { duration: 8000 });
      }
      if (data.created === 0 && data.errors?.length === 0 && data.skipped > 0) {
        toast('All employees already exist — nothing new to add.', { icon: 'ℹ️' });
      }
      fetchAll(token);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const logout = () => {
    localStorage.removeItem("company-token");
    localStorage.removeItem("company-user");
    router.push("/company/login");
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.currentRole.toLowerCase().includes(search.toLowerCase())
  );

  const user = getCompanyUser();

  const alignColor = (a: string) =>
    a === "High" ? "bg-green-100 text-green-700" : a === "Moderate" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
        <p className="text-[var(--muted)]">Loading organisation dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Top Nav */}
      <nav className="bg-[var(--primary)] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          <div>
            <p className="font-semibold">{stats?.org.name || "Organisation"}</p>
            <p className="text-white/70 text-xs">{stats?.org.industry}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/company/quick-analysis" className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
            <Zap className="w-4 h-4" /> Quick Analysis
          </Link>
          <span className="text-white/70 text-sm">{user?.name}</span>
          <button onClick={logout} className="text-white/70 hover:text-white"><LogOut className="w-4 h-4" /></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-[var(--muted)] text-sm">Total Employees</p>
              <p className="text-3xl font-bold text-[var(--dark)] mt-1">{stats.totalEmployees}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-[var(--muted)] text-sm">Roadmaps Generated</p>
              <p className="text-3xl font-bold text-[var(--dark)] mt-1">{stats.totalRoadmaps}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-[var(--muted)] text-sm">Avg Leadership Score</p>
              <p className="text-3xl font-bold text-[var(--primary)] mt-1">{stats.avgLeadershipScore}/10</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-[var(--muted)] text-sm">High Alignment</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.alignmentDistribution.High}</p>
              <p className="text-xs text-[var(--muted)]">of {stats.totalEmployees} employees</p>
            </div>
          </div>
        )}

        {/* Alignment + Top Skills */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-[var(--dark)] mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[var(--primary)]" /> Alignment Distribution</h3>
              {(["High", "Moderate", "Low"] as const).map(level => {
                const count = stats.alignmentDistribution[level];
                const pct = stats.totalEmployees ? Math.round(count / stats.totalEmployees * 100) : 0;
                return (
                  <div key={level} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text)]">{level}</span>
                      <span className="text-[var(--muted)]">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${level === "High" ? "bg-green-500" : level === "Moderate" ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-[var(--dark)] mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Top Skills in Org</h3>
              <div className="flex flex-wrap gap-2">
                {stats.topSkillsInOrg.map(({ skill, count }) => (
                  <span key={skill} className="px-3 py-1 rounded-full text-sm bg-[var(--primary)]/10 text-[var(--primary)] font-medium">{skill} <span className="text-[var(--muted)] font-normal">×{count}</span></span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Employee Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-[var(--dark)] flex items-center gap-2"><Users className="w-4 h-4 text-[var(--primary)]" /> Employees ({filtered.length})</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--accent)] w-56" />
              </div>
              <label className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg cursor-pointer font-medium transition-colors ${uploading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[var(--primary)] text-white hover:bg-[var(--secondary)]"}`}>
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Excel</>}
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleExcelUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-[var(--muted)]">{employees.length === 0 ? "No employees yet. Upload an Excel file to get started." : "No employees match your search."}</p>
              {employees.length === 0 && (
                <a href="/employee-template.xlsx" download className="mt-3 inline-block text-sm text-[var(--primary)] hover:underline">Download Excel template</a>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Employee", "Current Role", "Alignment", "Target Role", "Probability", "Action"].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-[var(--dark)]">{emp.name}</p>
                        <p className="text-[var(--muted)] text-xs">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4 text-[var(--text)]">{emp.currentRole || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${alignColor(emp.alignment)}`}>{emp.alignment}</span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted)]">{emp.targetRole || "Not generated"}</td>
                      <td className="px-6 py-4">
                        {emp.probability !== null ? (
                          <span className={`font-semibold ${emp.probability >= 70 ? "text-green-600" : emp.probability >= 50 ? "text-yellow-600" : "text-red-500"}`}>{emp.probability}%</span>
                        ) : <span className="text-[var(--muted)]">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/company/employee/${emp.id}`} className="flex items-center gap-1 text-[var(--primary)] hover:text-[var(--secondary)] font-medium text-xs">
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
