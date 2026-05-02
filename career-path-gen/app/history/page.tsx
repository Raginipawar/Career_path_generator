"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { History, Clock, Target, ArrowRight, BrainCircuit } from "lucide-react";
import { api } from "@/lib/api";
import { RoadmapResponse } from "@/types";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const { user } = useAppStore();
  const [history, setHistory] = useState<RoadmapResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const data = await api.getHistory(user.id);
        setHistory(data);
      } catch (err) {
        toast.error("Failed to load history");
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="flex-1 bg-[var(--surface)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8">
            <h1 className="text-3xl font-serif text-[var(--dark)] mb-2 flex items-center gap-3">
              <History className="w-8 h-8 text-[var(--primary)]" />
              Your Career Journey
            </h1>
            <p className="text-[var(--muted)] text-lg">
              Review your past generated roadmaps and ethical audits.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <BrainCircuit className="w-12 h-12 text-[var(--primary)] animate-pulse" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
              <Clock className="w-16 h-16 text-slate-300 mb-4" />
              <h2 className="text-xl font-serif text-[var(--dark)] mb-2">No History Yet</h2>
              <p className="text-[var(--muted)] max-w-sm">
                You haven't generated any career roadmaps. Complete your profile to get start exploring paths.
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
                  
                  <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-6 md:p-8 flex flex-col justify-center items-start md:items-end min-w-[200px]">
                    <div className="mb-4 w-full">
                      <p className="text-sm font-medium text-[var(--muted)] mb-2">Audit Risk Profile</p>
                      <div className="flex gap-1 h-3 w-full rounded-full overflow-hidden bg-slate-200">
                        {roadmap.audit_scores.map((score, sIdx) => (
                          <div 
                            key={sIdx} 
                            style={{ flex: 1 }} 
                            className={score.risk_level === 'High' ? 'bg-[var(--danger)]' : score.risk_level === 'Medium' ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}
                            title={`${score.dimension}: ${score.risk_level} Risk`}
                          />
                        ))}
                      </div>
                    </div>
                    {/* The design doesn't specifically demand re-loading old roadmaps into the dashboard yet, but typically you'd add a "View" button here */}
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
