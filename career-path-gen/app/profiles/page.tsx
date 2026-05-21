"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/store";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast from "react-hot-toast";
import {
  Plus, BrainCircuit, Pencil, Check, X, Clock,
  ChevronRight, Loader2, User2, Target, Layers
} from "lucide-react";
import Link from "next/link";

export default function ProfilesPage() {
  const router = useRouter();
  const { setRoadmap, setProfile, setGenerating } = useAppStore();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    api.getProfiles()
      .then(d => setProfiles(d.profiles))
      .catch(() => toast.error("Could not load profiles"))
      .finally(() => setLoading(false));
  }, []);

  const startRename = (p: any) => {
    setEditingId(p.id);
    setEditLabel(p.label || p.careerGoal?.slice(0, 40) || "My Profile");
  };

  const saveLabel = async (profileId: string) => {
    try {
      await api.renameProfile(profileId, editLabel);
      setProfiles(ps => ps.map(p => p.id === profileId ? { ...p, label: editLabel } : p));
      toast.success("Profile renamed");
    } catch {
      toast.error("Could not rename profile");
    } finally {
      setEditingId(null);
    }
  };

  const generateFrom = async (profile: any) => {
    setGeneratingId(profile.id);
    setGenerating(true);
    try {
      const roadmap = await api.generateRoadmapFromProfile(profile.id);
      setProfile(profile.id, profile);
      setRoadmap(roadmap);
      toast.success("Roadmap generated!");
      router.push("/roadmap");
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
      setGenerating(false);
    } finally {
      setGeneratingId(null);
    }
  };

  const alignColor = (a: string) =>
    a === "High" ? "bg-green-100 text-green-700 border-green-200"
    : a === "Moderate" ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-red-100 text-red-700 border-red-200";

  return (
    <ProtectedRoute>
      <div className="flex-1 bg-[var(--surface)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-serif text-[var(--dark)] flex items-center gap-3">
                <Layers className="w-7 h-7 text-[var(--primary)]" /> My Profiles
              </h1>
              <p className="text-[var(--muted)] mt-1">
                Each profile is a snapshot of your career situation. Create multiple to compare different paths.
              </p>
            </div>
            <Link href="/profile" className="flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[var(--secondary)] transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Profile
            </Link>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <User2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-[var(--muted)] text-lg mb-2">No profiles yet</p>
              <p className="text-[var(--muted)] text-sm mb-6">Create your first profile to generate a career roadmap.</p>
              <Link href="/profile" className="inline-flex items-center gap-2 bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-medium hover:bg-[var(--secondary)] transition-colors">
                <Plus className="w-4 h-4" /> Create Profile
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile, idx) => {
                const label = profile.label || profile.careerGoal?.slice(0, 50) || `Profile ${idx + 1}`;
                const isGenerating = generatingId === profile.id;
                const isEditing = editingId === profile.id;

                return (
                  <div key={profile.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-[var(--accent)] transition-colors">
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">

                        {/* Label + meta */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                autoFocus
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && saveLabel(profile.id)}
                                className="flex-1 px-3 py-1.5 text-sm border border-[var(--accent)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                                placeholder="e.g. Optimistic path, Conservative move"
                                maxLength={60}
                              />
                              <button onClick={() => saveLabel(profile.id)} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-2">
                              <h2 className="text-lg font-semibold text-[var(--dark)] truncate">{label}</h2>
                              <button onClick={() => startRename(profile)} className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors flex-shrink-0">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Stats row */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                            <span className="flex items-center gap-1">
                              <User2 className="w-3.5 h-3.5" /> {profile.currentRole || "No role set"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" /> {profile.yearsOfExperience}y exp
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${alignColor(profile.alignmentCategory)}`}>
                              {profile.alignmentCategory} Alignment
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <Clock className="w-3 h-3" />
                              {new Date(profile.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>

                          {/* Skills preview */}
                          {profile.technicalSkills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {profile.technicalSkills.slice(0, 5).map((s: string) => (
                                <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-[var(--primary)]/10 text-[var(--primary)]">{s}</span>
                              ))}
                              {profile.technicalSkills.length > 5 && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">+{profile.technicalSkills.length - 5} more</span>
                              )}
                            </div>
                          )}

                          {/* Career goal */}
                          {profile.careerGoal && (
                            <p className="text-xs text-[var(--muted)] mt-2 line-clamp-1 italic">"{profile.careerGoal}"</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => generateFrom(profile)}
                            disabled={!!generatingId}
                            className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {isGenerating
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                              : <><BrainCircuit className="w-4 h-4" /> Generate Roadmap</>
                            }
                          </button>
                          <Link
                            href={`/history`}
                            className="flex items-center justify-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                          >
                            View history <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
