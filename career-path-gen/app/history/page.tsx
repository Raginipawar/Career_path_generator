"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { History, Clock, Target, ArrowRight, BrainCircuit, Trash2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { RoadmapResponse } from "@/types";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const { user, clearRoadmap } = useAppStore();
  const [history, setHistory] = useState<RoadmapResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const data = await api.getHistory(user.id);
        setHistory(data);
      } catch {
        toast.error("Failed to load history");
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  const handleDelete = async (roadmapId: string) => {
    if (!roadmapId) return;
    setDeletingId(roadmapId);
    try {
      await api.deleteRoadmap(roadmapId);
      setHistory(prev => prev.filter(r => r.roadmapId !== roadmapId));
      toast.success("Roadmap deleted");
    } catch {
      toast.error("Could not delete roadmap");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await api.deleteAllData();
      setHistory([]);
      clearRoadmap();
      toast.success(`Cleared ${res.roadmapsDeleted} roadmap${res.roadmapsDeleted !== 1 ? "s" : ""} and all profiles. Fresh start!`);
    } catch {
      toast.error("Could not clear data");
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex-1 bg-[var(--surface)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-serif text-[var(--dark)] mb-2 flex items-center gap-3">
                <History className="w-8 h-8 text-[var(--primary)]" />
                Your Career Journey
              </h1>
              <p className="text-[var(--muted)] text-lg">
                Review and manage your past generated roadmaps.
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Clear All Data
              </button>
            )}
          </div>

          {/* Confirm clear dialog */}
          {showClearConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
              <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                  <AlertTriangle className="w-7 h-7" />
                  <h2 className="text-xl font-semibold">Delete All Data?</h2>
                </div>
                <p className="text-[var(--text)] mb-6 text-sm leading-relaxed">
                  This will permanently delete <strong>all your roadmaps, profiles, and audit history</strong>.
                  The new AI engine will generate fresh, more accurate results when you create a new profile.
                  This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-[var(--text)] hover:bg-slate-50">
                    Cancel
                  </button>
                  <button onClick={handleClearAll} disabled={clearing} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {clearing ? "Clearing..." : "Yes, Delete All"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <BrainCircuit className="w-12 h-12 text-[var(--primary)] animate-pulse" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
              <Clock className="w-16 h-16 text-slate-300 mb-4" />
              <h2 className="text-xl font-serif text-[var(--dark)] mb-2">No History Yet</h2>
              <p className="text-[var(--muted)] max-w-sm">
                You haven't generated any career roadmaps. Complete your profile to start exploring paths.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((roadmap, idx) => (
                <div key={roadmap.roadmapId || idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-[var(--primary)]/30 transition-colors overflow-hidden flex flex-col md:flex-row">
                  <div className="p-6 md:p-8 flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded">
                        Generation #{history.length - idx}
                      </span>
                    </div>

                    <h3 className="text-2xl font-serif text-[var(--dark)] mb-2 flex items-center gap-2">
                      {roadmap.current_role} <ArrowRight className="w-5 h-5 text-slate-400" /> {roadmap.target_role}
                    </h3>

                    <p className="text-[var(--muted)] text-sm mb-6 line-clamp-2">
                      {roadmap.explanation}
                    </p>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-[var(--accent)]" />
                        <div>
                          <p className="text-xs text-[var(--muted)] font-medium uppercase">Probability</p>
                          <p className="font-bold text-[var(--dark)]">{roadmap.success_probability}%</p>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs text-[var(--muted)] font-medium uppercase">Timeline</p>
                          <p className="font-bold text-[var(--dark)]">{roadmap.total_transition_months} Months</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-6 md:p-8 flex flex-col justify-between items-start md:items-end min-w-[200px]">
                    <div className="mb-4 w-full">
                      <p className="text-sm font-medium text-[var(--muted)] mb-2">Audit Risk Profile</p>
                      <div className="flex gap-1 h-3 w-full rounded-full overflow-hidden bg-slate-200">
                        {roadmap.audit_scores?.map((score, sIdx) => (
                          <div
                            key={sIdx}
                            style={{ flex: 1 }}
                            className={score.risk_level === 'High' ? 'bg-[var(--danger)]' : score.risk_level === 'Medium' ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}
                            title={`${score.dimension}: ${score.risk_level} Risk`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => roadmap.roadmapId && handleDelete(roadmap.roadmapId)}
                      disabled={deletingId === roadmap.roadmapId}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingId === roadmap.roadmapId ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
