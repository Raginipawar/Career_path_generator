"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/store";
import { api } from "@/lib/api";
import { UserProfile } from "@/types";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Plus, X, BrainCircuit, Activity, HeartHandshake, Briefcase, GraduationCap, MapPin, UserCircle2, Upload, Loader2, FileText, Sparkles, Clock, TrendingUp } from "lucide-react";

const emptyProfile: UserProfile = {
  fullName: "", age: 25, gender: "", locationCity: "", locationState: "",
  highestDegree: "", fieldOfStudy: "", institutionTier: "Tier 2",
  currentRole: "", currentIndustry: "", yearsOfExperience: 0, employmentStatus: "Employed Full-Time", currentSalaryLpa: 0,
  technicalSkills: [], softSkills: [], certifications: [],
  interestDomains: [], careerGoal: "", preferredWorkStyle: "Hybrid", willingToRelocate: false, targetTimelineYears: 1,
  lifeStage: "Early Career", burnoutLevel: 1, stressTolerance: 5, hasDependents: false, recentLifeEvent: "None", workLifePriority: "Career Growth", leadershipScore: 5, alignmentCategory: "Moderate"
};

const domains = [
  "AI & ML", "Data Analytics & Business Intelligence", "Cybersecurity", "EdTech & Technical Education", 
  "FinTech & Banking Technology", "Cloud & DevOps", "Full Stack Web Development", "Product Management", 
  "Embedded Systems & IoT", "UI/UX Design", "Healthcare IT", "Consulting & Strategy", "Research & Academia", 
  "Gaming & Interactive Media", "Entrepreneurship & Startups", "Digital Marketing & Growth", 
  "Finance & Investment", "Supply Chain & Operations Tech", "HR Technology & People Analytics", "GCC & Global Delivery Leadership"
];

const techSuggestions = ["Python", "JavaScript", "React", "SQL", "AWS", "Docker", "Java", "C++", "Node.js", "Machine Learning"];
const softSuggestions = ["Leadership", "Communication", "Problem Solving", "Teamwork", "Agile"];

export default function ProfileWizard() {
  const router = useRouter();
  const { setProfile, setRoadmap, setGenerating, isGenerating, user } = useAppStore();

  useEffect(() => { setGenerating(false); }, []);
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState<UserProfile>(emptyProfile);
  const [techInput, setTechInput] = useState("");
  const [softInput, setSoftInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const [loadingText, setLoadingText] = useState("Analyzing your profile...");

  useEffect(() => {
    if (user?.name) {
      setData(prev => ({ ...prev, fullName: user.name }));
    }
  }, [user]);

  useEffect(() => {
    // Auto calculate alignment category
    let alignment: "Low" | "Moderate" | "High" = "Moderate";
    if (data.burnoutLevel > 7 || data.leadershipScore < 3) alignment = "Low";
    else if (data.burnoutLevel < 4 && data.leadershipScore > 7) alignment = "High";
    
    if (data.alignmentCategory !== alignment) {
      setData(prev => ({ ...prev, alignmentCategory: alignment }));
    }
  }, [data.burnoutLevel, data.leadershipScore, data.alignmentCategory]);

  const handleNext = () => setStep(s => Math.min(6, s + 1));
  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const addTag = (field: "technicalSkills" | "softSkills" | "certifications", value: string, setter: (val: string) => void) => {
    if (value.trim() && !data[field].includes(value.trim())) {
      setData({ ...data, [field]: [...data[field], value.trim()] });
    }
    setter("");
  };

  const removeTag = (field: "technicalSkills" | "softSkills" | "certifications", value: string) => {
    setData({ ...data, [field]: data[field].filter(t => t !== value) });
  };

  const toggleDomain = (domain: string) => {
    if (data.interestDomains.includes(domain)) {
      setData({ ...data, interestDomains: data.interestDomains.filter(d => d !== domain) });
    } else {
      setData({ ...data, interestDomains: [...data.interestDomains, domain] });
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeParsing(true);
    setResumeFileName(file.name);
    try {
      const res = await api.parseResume(file);
      const ex = res.extracted;
      setData(prev => ({
        ...prev,
        fullName:          ex.fullName          || prev.fullName,
        locationCity:      ex.locationCity      || prev.locationCity,
        locationState:     ex.locationState     || prev.locationState,
        highestDegree:     ex.highestDegree     || prev.highestDegree,
        fieldOfStudy:      ex.fieldOfStudy      || prev.fieldOfStudy,
        institutionTier:   ex.institutionTier   || prev.institutionTier,
        currentRole:       ex.currentRole       || prev.currentRole,
        currentIndustry:   ex.currentIndustry   || prev.currentIndustry,
        yearsOfExperience: ex.yearsOfExperience ?? prev.yearsOfExperience,
        employmentStatus:  (ex.employmentStatus as any) || prev.employmentStatus,
        technicalSkills:   ex.technicalSkills?.length ? [...new Set([...prev.technicalSkills, ...ex.technicalSkills])] : prev.technicalSkills,
        softSkills:        ex.softSkills?.length       ? [...new Set([...prev.softSkills,      ...ex.softSkills])]      : prev.softSkills,
        certifications:    ex.certifications?.length   ? [...new Set([...prev.certifications,  ...ex.certifications])]  : prev.certifications,
        careerGoal:        ex.careerGoal        || prev.careerGoal,
      }));
      toast.success("Resume imported! Review and edit the pre-filled fields below.");
    } catch (err: any) {
      toast.error(err.message || "Could not parse resume. Please fill manually.");
      setResumeFileName(null);
    } finally {
      setResumeParsing(false);
      e.target.value = "";
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const saveRes = await api.saveProfile(data);
      if (!saveRes.profileId) throw new Error("Failed to save profile");
      setProfile(saveRes.profileId, data);
      const res = await api.suggestPaths(saveRes.profileId);
      setSuggestions(res.suggestions);
    } catch (err: any) {
      toast.error(err.message || "Could not fetch suggestions");
    } finally {
      setSuggesting(false);
    }
  };

  const handlePickSuggestion = async (suggestion: any) => {
    setData(prev => ({ ...prev, careerGoal: `Transition to ${suggestion.target_role}` }));
    setSuggestions(null);
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setGenerating(true);
    try {
      // 1. Save profile
      const saveRes = await api.saveProfile(data);
      if (!saveRes.profileId) throw new Error("Failed to save profile");
      setProfile(saveRes.profileId, data);

      // Rotating text
      const texts = ["Searching 500+ career paths...", "Consulting AI career advisor...", "Generating your roadmap...", "Running ethical audit..."];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[i % texts.length]);
        i++;
      }, 2500);

      // 2. Generate roadmap
      const roadmapData = await api.generateRoadmap(saveRes.profileId);
      clearInterval(interval);
      
      setRoadmap(roadmapData);
      toast.success("Roadmap generated successfully!");
      router.push("/roadmap");
    } catch (err: any) {
      toast.error(err.message || "An error occurred during generation");
      setGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--surface)] px-4">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)]/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin"></div>
          <BrainCircuit className="absolute inset-0 m-auto w-12 h-12 text-[var(--primary)] animate-pulse" />
        </div>
        <h2 className="text-2xl font-serif text-[var(--dark)] mb-2 animate-pulse">{loadingText}</h2>
        <p className="text-[var(--muted)] text-center max-w-sm">
          Please wait while our RAG engine creates your ethically audited career path...
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 bg-[var(--surface)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header & Progress */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-[var(--dark)] mb-2">Build Your Profile</h1>
          <p className="text-[var(--muted)]">Step {step} of 6</p>
          <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-300 ease-in-out" 
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 sm:p-10">
            {step === 1 && <Step1 data={data} setData={setData} />}
            {/* Resume upload banner — only on Step 1 */}
            {step === 1 && (
              <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-[var(--accent)] bg-[var(--primary)]/5">
                <p className="text-sm font-medium text-[var(--primary)] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Auto-fill from Resume
                </p>
                <label className={`flex items-center gap-3 cursor-pointer w-fit px-4 py-2 rounded-lg text-sm font-medium transition-colors ${resumeParsing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[var(--primary)] text-white hover:bg-[var(--secondary)]'}`}>
                  {resumeParsing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing resume...</>
                    : <><Upload className="w-4 h-4" /> Upload PDF or Image</>
                  }
                  <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleResumeUpload} disabled={resumeParsing} />
                </label>
                {resumeFileName && !resumeParsing && (
                  <p className="mt-2 text-xs text-[var(--success)] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Imported from {resumeFileName} — review fields below
                  </p>
                )}
                <p className="mt-2 text-xs text-[var(--muted)]">Supports PDF, JPG, PNG. Fields are pre-filled and editable.</p>
              </div>
            )}
            {step === 2 && <Step2 data={data} setData={setData} />}
            {step === 3 && <Step3 data={data} setData={setData} />}
            {step === 4 && <Step4 data={data} setData={setData} techInput={techInput} setTechInput={setTechInput} softInput={softInput} setSoftInput={setSoftInput} certInput={certInput} setCertInput={setCertInput} addTag={addTag} removeTag={removeTag} />}

            {step === 5 && <Step5 data={data} setData={setData} toggleDomain={toggleDomain} />}
            {step === 6 && <Step6 data={data} setData={setData} />}
          </div>

          {/* Footer Controls */}
          <div className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center text-[var(--muted)] hover:text-[var(--primary)] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>

            {step < 6 ? (
              <button onClick={handleNext} className="flex items-center bg-[var(--primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--secondary)] transition-colors">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSuggest}
                  disabled={suggesting || isGenerating}
                  className="flex items-center gap-2 border-2 border-[var(--primary)] text-[var(--primary)] px-5 py-2.5 rounded-lg font-medium hover:bg-[var(--primary)]/5 disabled:opacity-50 transition-colors text-sm"
                >
                  {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "✨ Suggest Paths"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isGenerating || suggesting}
                  className="flex items-center bg-[var(--primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors shadow-lg shadow-teal-900/20"
                >
                  <BrainCircuit className="w-4 h-4 mr-2" /> Generate Roadmap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Suggestions modal — inside return fragment */}
    <>
    {suggestions && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif text-[var(--dark)] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--accent)]" /> AI-Suggested Career Paths
              </h2>
              <p className="text-sm text-[var(--muted)] mt-1">Based on your profile, here are 3 recommended transitions. Pick one to generate your full roadmap.</p>
            </div>
            <button onClick={() => setSuggestions(null)} className="text-[var(--muted)] hover:text-[var(--dark)] p-1"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            {suggestions.map((s: any, i: number) => (
              <div key={i} className="border-2 border-slate-200 hover:border-[var(--accent)] rounded-xl p-5 cursor-pointer transition-colors group" onClick={() => handlePickSuggestion(s)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">Option {i + 1}</span>
                    <h3 className="text-lg font-serif text-[var(--dark)] mt-0.5">{s.target_role}</h3>
                  </div>
                  <div className="flex gap-3 text-sm flex-shrink-0 ml-3">
                    <span className={`font-bold ${s.estimated_probability >= 70 ? "text-green-600" : s.estimated_probability >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                      {s.estimated_probability}%
                    </span>
                    <span className="text-[var(--muted)] flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.timeline_months}mo</span>
                    <span className="text-[var(--primary)] font-medium">{s.salary_range_lpa}</span>
                  </div>
                </div>
                <p className="text-sm text-[var(--text)] mb-3">{s.reasoning}</p>
                <div className="flex flex-wrap gap-2">
                  {s.top_skills_needed?.map((skill: string) => (
                    <span key={skill} className="px-2 py-0.5 rounded-full text-xs bg-[var(--primary)]/10 text-[var(--primary)]">{skill}</span>
                  ))}
                </div>
                <p className="text-xs text-[var(--primary)] font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to select this path and generate full roadmap →
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
    </>
  );
}

// ─── Step Components ─────────────────────────────────────────────────────────

function Step1({ data, setData }: any) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-3 text-[var(--primary)] mb-6">
        <UserCircle2 className="w-6 h-6" />
        <h2 className="text-xl font-serif text-[var(--dark)]">Personal Information</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Full Name</label>
          <input type="text" value={data.fullName} onChange={e => setData({...data, fullName: e.target.value})} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Age</label>
            <input type="number" value={data.age} onChange={e => setData({...data, age: Number(e.target.value)})} className="input-field" min="16" max="100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Gender</label>
            <select value={data.gender} onChange={e => setData({...data, gender: e.target.value})} className="input-field">
              <option value="">Select...</option>
              <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">City</label>
          <input type="text" value={data.locationCity} onChange={e => setData({...data, locationCity: e.target.value})} className="input-field" placeholder="e.g. Bangalore" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">State / Region</label>
          <input type="text" value={data.locationState} onChange={e => setData({...data, locationState: e.target.value})} className="input-field" placeholder="e.g. Karnataka" />
        </div>
      </div>
    </div>
  );
}

function Step2({ data, setData }: any) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-3 text-[var(--primary)] mb-6">
        <GraduationCap className="w-6 h-6" />
        <h2 className="text-xl font-serif text-[var(--dark)]">Education & Background</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Highest Degree</label>
          <select value={data.highestDegree} onChange={e => setData({...data, highestDegree: e.target.value})} className="input-field">
            <option value="">Select degree...</option>
            <option>High School</option><option>Diploma</option><option>B.Tech</option>
            <option>B.Sc</option><option>M.Tech</option><option>MBA</option><option>PhD</option><option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Field of Study</label>
          <input type="text" value={data.fieldOfStudy} onChange={e => setData({...data, fieldOfStudy: e.target.value})} className="input-field" placeholder="e.g. Computer Science" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-3">Institution Tier</label>
          <div className="flex gap-4">
            {["Tier 1", "Tier 2", "Tier 3"].map(tier => (
              <label key={tier} className={`flex-1 border rounded-lg p-4 cursor-pointer text-center transition-all ${data.institutionTier === tier ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-semibold' : 'border-slate-200 text-slate-600 hover:border-[var(--accent)]'}`}>
                <input type="radio" name="tier" value={tier} checked={data.institutionTier === tier} onChange={e => setData({...data, institutionTier: e.target.value})} className="hidden" />
                {tier}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3({ data, setData }: any) {
  const isStudent    = data.employmentStatus === "Student";
  const isUnemployed = data.employmentStatus === "Unemployed" || data.employmentStatus === "Career Break";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-3 text-[var(--primary)] mb-6">
        <Briefcase className="w-6 h-6" />
        <h2 className="text-xl font-serif text-[var(--dark)]">
          {isStudent ? "Your Academic Background" : "Current Career"}
        </h2>
      </div>

      {/* Employment status — first, drives everything below */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">I am currently a…</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { value: "Student",           label: "Student" },
            { value: "Employed Full-Time", label: "Working Full-Time" },
            { value: "Employed Part-Time", label: "Working Part-Time" },
            { value: "Self-Employed",      label: "Freelancer / Self-Employed" },
            { value: "Unemployed",         label: "Looking for Work" },
            { value: "Career Break",       label: "Career Break" },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setData({ ...data, employmentStatus: opt.value,
                currentSalaryLpa: opt.value === "Student" || opt.value === "Unemployed" ? 0 : data.currentSalaryLpa,
                yearsOfExperience: opt.value === "Student" ? 0 : data.yearsOfExperience,
              })}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                data.employmentStatus === opt.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                  : "border-slate-200 text-slate-600 hover:border-[var(--accent)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student-specific fields */}
      {isStudent ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Degree & Program</label>
              <input
                type="text"
                value={data.currentRole}
                onChange={e => setData({ ...data, currentRole: e.target.value })}
                className="input-field"
                placeholder="e.g. B.Tech Computer Science"
              />
              <p className="text-xs text-[var(--muted)] mt-1">This tells us your starting point</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">College / University</label>
              <input
                type="text"
                value={data.currentIndustry}
                onChange={e => setData({ ...data, currentIndustry: e.target.value })}
                className="input-field"
                placeholder="e.g. VIT Vellore, BITS Pilani"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Current Year of Study</label>
              <select
                value={data.yearsOfExperience}
                onChange={e => setData({ ...data, yearsOfExperience: Number(e.target.value) })}
                className="input-field"
              >
                <option value={0}>1st Year / Fresher</option>
                <option value={1}>2nd Year</option>
                <option value={2}>3rd Year</option>
                <option value={3}>Final Year</option>
                <option value={4}>Postgraduate / MBA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Target First Job Type</label>
              <select
                value={data.lifeStage}
                onChange={e => setData({ ...data, lifeStage: e.target.value })}
                className="input-field"
              >
                <option value="Early Career">Full-Time Job after graduation</option>
                <option value="Intern">Internship first</option>
                <option value="Fresher">Campus placement</option>
              </select>
            </div>
          </div>
          <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl p-4 text-sm text-[var(--primary)]">
            <strong>Student path:</strong> Your roadmap will show you the exact skills, projects, and milestones to land your first job in your target domain — with realistic timelines from your current year of study.
          </div>
        </div>
      ) : (
        /* Professional / other fields */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Current Role</label>
            <input type="text" value={data.currentRole} onChange={e => setData({...data, currentRole: e.target.value})} className="input-field" placeholder="e.g. Frontend Engineer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Current Industry</label>
            <input type="text" value={data.currentIndustry} onChange={e => setData({...data, currentIndustry: e.target.value})} className="input-field" placeholder="e.g. Fintech" />
          </div>
          <div className="md:col-span-2">
            <label className="flex justify-between text-sm font-medium text-[var(--text)] mb-2">
              <span>Years of Experience</span>
              <span className="text-[var(--primary)] font-bold">{data.yearsOfExperience} years</span>
            </label>
            <input type="range" min="0" max="40" value={data.yearsOfExperience} onChange={e => setData({...data, yearsOfExperience: Number(e.target.value)})} className="w-full accent-[var(--accent)]" />
          </div>
          {!isUnemployed && (
            <div>
              <label className="flex justify-between text-sm font-medium text-[var(--text)] mb-2">
                <span>Current Salary (LPA)</span>
                <span className="text-[var(--primary)] font-bold">₹{data.currentSalaryLpa}</span>
              </label>
              <input type="range" min="0" max="100" value={data.currentSalaryLpa} onChange={e => setData({...data, currentSalaryLpa: Number(e.target.value)})} className="w-full accent-[var(--accent)]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Step4({ data, setData, techInput, setTechInput, softInput, setSoftInput, certInput, setCertInput, addTag, removeTag }: any) {
  const [ghUsername, setGhUsername] = useState("");
  const [ghLoading, setGhLoading] = useState(false);

  const importGithub = async () => {
    if (!ghUsername.trim()) return;
    setGhLoading(true);
    try {
      const res = await api.importGithub(ghUsername.trim());
      // Merge imported skills (deduplicate)
      const merged = [...new Set([...data.technicalSkills, ...res.technicalSkills])];
      const mergedDomains = [...new Set([...data.interestDomains, ...res.suggestedDomains])];
      setData((prev: any) => ({ ...prev, technicalSkills: merged, interestDomains: mergedDomains }));
      toast.success(`Imported ${res.technicalSkills.length} skills from @${ghUsername}`);
    } catch (err: any) {
      toast.error(err.message || "GitHub import failed");
    } finally {
      setGhLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-3 text-[var(--primary)] mb-6">
        <BrainCircuit className="w-6 h-6" />
        <h2 className="text-xl font-serif text-[var(--dark)]">Skills & Certifications</h2>
      </div>

      {/* GitHub optional import */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-medium text-[var(--text)] mb-2">
          Import from GitHub <span className="text-[var(--muted)] font-normal">(optional)</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={ghUsername}
            onChange={e => setGhUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && importGithub()}
            placeholder="Your GitHub username"
            className="input-field flex-1 text-sm"
          />
          <button
            type="button"
            onClick={importGithub}
            disabled={ghLoading || !ghUsername.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--dark)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {ghLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
          </button>
        </div>
        <p className="text-xs text-[var(--muted)] mt-1.5">Pulls languages from your public repos into Technical Skills. No auth needed.</p>
      </div>

      <TagInput 
        label="Technical Skills" 
        value={techInput} 
        setValue={setTechInput} 
        tags={data.technicalSkills} 
        onAdd={(v: string) => addTag("technicalSkills", v, setTechInput)} 
        onRemove={(v: string) => removeTag("technicalSkills", v)} 
        suggestions={techSuggestions}
      />

      <TagInput 
        label="Soft Skills" 
        value={softInput} 
        setValue={setSoftInput} 
        tags={data.softSkills} 
        onAdd={(v: string) => addTag("softSkills", v, setSoftInput)} 
        onRemove={(v: string) => removeTag("softSkills", v)} 
        suggestions={softSuggestions}
      />

      <TagInput 
        label="Certifications (Optional)" 
        value={certInput} 
        setValue={setCertInput} 
        tags={data.certifications} 
        onAdd={(v: string) => addTag("certifications", v, setCertInput)} 
        onRemove={(v: string) => removeTag("certifications", v)} 
        suggestions={["AWS Certified Solutions Architect", "PMP", "Scrum Master"]}
      />
    </div>
  );
}

function TagInput({ label, value, setValue, tags, onAdd, onRemove, suggestions }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text)] mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag: string) => (
          <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[var(--primary)]/10 text-[var(--primary)]">
            {tag}
            <button type="button" onClick={() => onRemove(tag)} className="ml-2 hover:text-[var(--danger)]"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={value} 
          onChange={e => setValue(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd(value))}
          className="input-field flex-1" 
          placeholder={`Add ${label.toLowerCase()}... (Press Enter)`} 
        />
        <button type="button" onClick={() => onAdd(value)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200">
          Add
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="text-xs text-[var(--muted)] py-1">Suggestions:</span>
        {suggestions.map((s: string) => !tags.includes(s) && (
          <button type="button" key={s} onClick={() => onAdd(s)} className="text-xs px-2 py-1 rounded border border-slate-200 hover:border-[var(--accent)] hover:bg-slate-50 text-slate-600 transition-colors">
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step5({ data, setData, toggleDomain }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-3 text-[var(--primary)] mb-6">
        <MapPin className="w-6 h-6" />
        <h2 className="text-xl font-serif text-[var(--dark)]">Goals & Preferences</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-3">Interest Domains</label>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
          {domains.map(d => (
            <button
              key={d}
              onClick={() => toggleDomain(d)}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors border ${data.interestDomains.includes(d) ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-slate-600 border-slate-300 hover:border-[var(--accent)]'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Career Goal (1-2 sentences)</label>
        <textarea 
          value={data.careerGoal} 
          onChange={e => setData({...data, careerGoal: e.target.value})} 
          className="input-field min-h-[80px]" 
          placeholder="E.g., I want to transition into a leadership role within a highly innovative tech company."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-3">Preferred Work Style</label>
          <div className="flex gap-3">
            {["Remote", "Hybrid", "On-site"].map(style => (
              <label key={style} className={`flex-1 border rounded-lg py-2 cursor-pointer text-center text-sm transition-all ${data.preferredWorkStyle === style ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-semibold' : 'border-slate-200 text-slate-600 hover:border-[var(--accent)]'}`}>
                <input type="radio" value={style} checked={data.preferredWorkStyle === style} onChange={e => setData({...data, preferredWorkStyle: e.target.value})} className="hidden" />
                {style}
              </label>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-8 border-t border-slate-100 md:border-t-0 md:pt-0">
          <label className="text-sm font-medium text-[var(--text)]">Willing to Relocate?</label>
          <button 
            type="button" 
            onClick={() => setData({...data, willingToRelocate: !data.willingToRelocate})}
            className={`w-12 h-6 rounded-full relative transition-colors ${data.willingToRelocate ? 'bg-[var(--accent)]' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${data.willingToRelocate ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="md:col-span-2 mt-2">
          <label className="flex justify-between text-sm font-medium text-[var(--text)] mb-2">
            <span>Target Timeline (Years)</span>
            <span className="text-[var(--primary)] font-bold">{data.targetTimelineYears} Years</span>
          </label>
          <input type="range" min="1" max="10" value={data.targetTimelineYears} onChange={e => setData({...data, targetTimelineYears: Number(e.target.value)})} className="w-full accent-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}

function Step6({ data, setData }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-3 text-[var(--primary)] mb-6">
        <Activity className="w-6 h-6" />
        <h2 className="text-xl font-serif text-[var(--dark)]">Life Context & Assessment</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-3">Life Stage</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {["Early Career", "Mid Career", "Late Career", "Career Break", "Re-entering Workforce"].map(stage => (
            <label key={stage} className={`border rounded-lg p-3 cursor-pointer text-center text-sm transition-all ${data.lifeStage === stage ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-semibold' : 'border-slate-200 text-slate-600 hover:border-[var(--accent)]'}`}>
              <input type="radio" value={stage} checked={data.lifeStage === stage} onChange={e => setData({...data, lifeStage: e.target.value})} className="hidden" />
              {stage}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="flex justify-between text-sm font-medium text-[var(--text)] mb-2">
            <span>Burnout Level</span>
            <span className={data.burnoutLevel > 7 ? 'text-[var(--danger)] font-bold' : 'text-[var(--primary)] font-bold'}>{data.burnoutLevel}/10</span>
          </label>
          <input type="range" min="1" max="10" value={data.burnoutLevel} onChange={e => setData({...data, burnoutLevel: Number(e.target.value)})} className={`w-full ${data.burnoutLevel > 7 ? 'accent-[var(--danger)]' : 'accent-[var(--accent)]'}`} />
          <p className="text-xs text-[var(--muted)] mt-1 flex justify-between"><span>1: Thriving</span> <span>10: Completely burnt out</span></p>
        </div>

        <div>
          <label className="flex justify-between text-sm font-medium text-[var(--text)] mb-2">
            <span>Stress Tolerance</span>
            <span className="text-[var(--primary)] font-bold">{data.stressTolerance}/10</span>
          </label>
          <input type="range" min="1" max="10" value={data.stressTolerance} onChange={e => setData({...data, stressTolerance: Number(e.target.value)})} className="w-full accent-[var(--accent)]" />
        </div>
        
        <div>
          <label className="flex justify-between text-sm font-medium text-[var(--text)] mb-2">
            <span>Leadership Ability</span>
            <span className="text-[var(--primary)] font-bold">{data.leadershipScore}/10</span>
          </label>
          <input type="range" min="0" max="10" value={data.leadershipScore} onChange={e => setData({...data, leadershipScore: Number(e.target.value)})} className="w-full accent-[var(--accent)]" />
        </div>

        <div className="flex flex-col justify-center">
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Alignment Assessment (Auto)</label>
          <div className="flex gap-2 items-center">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold 
              ${data.alignmentCategory === 'Low' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 
                data.alignmentCategory === 'High' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 
                'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>
              {data.alignmentCategory} Alignment
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Recent Life Event</label>
          <select value={data.recentLifeEvent} onChange={e => setData({...data, recentLifeEvent: e.target.value})} className="input-field">
            <option>None</option><option>New Parent</option><option>Relocation</option><option>Health Issue</option><option>Marriage</option><option>Divorce</option><option>Bereavement</option><option>Returning from break</option><option>Other</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between pt-8">
          <label className="text-sm font-medium text-[var(--text)]">Do you have dependents?</label>
          <button 
            type="button" 
            onClick={() => setData({...data, hasDependents: !data.hasDependents})}
            className={`w-12 h-6 rounded-full relative transition-colors ${data.hasDependents ? 'bg-[var(--accent)]' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${data.hasDependents ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className="pt-2">
        <label className="block text-sm font-medium text-[var(--text)] mb-3">Work-Life Priority</label>
        <div className="grid grid-cols-2 gap-3">
          {["Career Growth", "Work-Life Balance", "Financial Stability", "Personal Fulfilment"].map(priority => (
            <label key={priority} className={`border rounded-lg p-3 cursor-pointer text-center text-sm transition-all ${data.workLifePriority === priority ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-semibold' : 'border-slate-200 text-slate-600 hover:border-[var(--accent)]'}`}>
              <input type="radio" value={priority} checked={data.workLifePriority === priority} onChange={e => setData({...data, workLifePriority: e.target.value})} className="hidden" />
              {priority}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
