import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, BrainCircuit, BarChart2, Building2, Users, Zap, ChevronRight } from "lucide-react";

export default function Home() {
  const stats = [
    { value: "25+", label: "Career Domains" },
    { value: "14", label: "Ethical Audit Dimensions" },
    { value: "526+", label: "Knowledge Base Documents" },
    { value: "4-week", label: "Demand Forecast" },
  ];

  const features = [
    {
      icon: <BrainCircuit className="w-6 h-6" />,
      title: "Neural Career Intelligence",
      desc: "NetworkX knowledge graph with 120+ real roles, PyTorch probability engine, and sentence-transformer skill matching — not a prompt wrapper.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "PASSIONIT-PRUTL Audit",
      desc: "14 ethical dimensions evaluated on every roadmap: Purpose, Safety, Sustainability, Non-bias, Privacy, Trustworthiness, and more.",
    },
    {
      icon: <BarChart2 className="w-6 h-6" />,
      title: "Market Demand Forecasting",
      desc: "Holt exponential smoothing on 8 weeks of career cluster demand data. 4-week forward forecast with confidence intervals.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Company Mode",
      desc: "Bulk Excel upload, per-employee roadmap generation, cohort analytics, and quick hiring/promotion evaluation — all in one dashboard.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Any Career Goal",
      desc: "Groq LLaMA 3.3 reads your goal in plain English first — psychologist, chef, GCC leader — then the system builds the precise path.",
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "GCC & Global Delivery",
      desc: "Dedicated Micro-GCC capability track aligned with the Punarvasu GCC Architecture across 4 operational tracks.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--dark)] text-white relative overflow-hidden">
        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-20 relative z-10">

          {/* Logo + brand */}
          <div className="flex items-center gap-4 mb-14">
            <Image src="/logo.png" alt="Sanatan Labs" width={56} height={56} className="rounded-xl object-contain" />
            <div>
              <p className="text-white font-bold text-xl tracking-tight leading-none">SANATAN LABS</p>
              <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mt-1">
                PASSIONIT-PRUTL · KALKI AI DHARMA FRAMEWORK
              </p>
            </div>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.05] mb-6 max-w-4xl">
            Every career goal.<br />
            <span className="text-[var(--accent)]">One ethical AI.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mb-12 leading-relaxed">
            KALKI AI builds personalised, ethically audited career roadmaps for individuals and organisations
            — powered by a neural knowledge graph, not a chatbot.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--dark)] px-8 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg">
              Start My Roadmap <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/company/register"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/10 transition-colors">
              <Building2 className="w-4 h-4" /> Company Dashboard
            </Link>
            <Link href="/auth/login"
              className="inline-flex items-center justify-center gap-2 text-white/60 hover:text-white px-6 py-4 text-base transition-colors">
              Sign in <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-20 pt-10 border-t border-white/10">
            {stats.map(s => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-[var(--accent)]">{s.value}</p>
                <p className="text-white/60 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-xs font-bold tracking-widest text-[var(--muted)] uppercase mb-3">The Engine</p>
            <h2 className="text-4xl font-serif text-[var(--dark)] max-w-xl">
              Built differently. Audited ethically.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-slate-200 hover:border-[var(--primary)]/40 hover:shadow-sm transition-all">
                <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] mb-5">
                  {f.icon}
                </div>
                <h3 className="font-bold text-[var(--dark)] text-lg mb-2">{f.title}</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest text-[var(--muted)] uppercase mb-3">How It Works</p>
          <h2 className="text-4xl font-serif text-[var(--dark)] mb-14">Three steps to clarity</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { n: "01", title: "Fill your profile", desc: "6-step wizard. Upload your resume or import from GitHub to auto-fill. Students get a tailored starting-point flow." },
              { n: "02", title: "AI builds your roadmap", desc: "Neural engine classifies your goal, maps it to real roles, computes skill gaps with embeddings, and sets realistic timelines." },
              { n: "03", title: "Navigate with confidence", desc: "Interactive step-by-step graph, real course links, AI chat advisor, ethical audit scores, and PDF export." },
            ].map(s => (
              <div key={s.n} className="flex gap-5">
                <span className="text-4xl font-serif font-bold text-[var(--primary)]/20 leading-none flex-shrink-0">{s.n}</span>
                <div>
                  <h3 className="font-bold text-[var(--dark)] text-lg mb-2">{s.title}</h3>
                  <p className="text-[var(--muted)] text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FRAMEWORK CALLOUT ─────────────────────────────────────────────────── */}
      <section className="bg-[var(--primary)] py-20 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1">
            <p className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase mb-3">Ethical AI</p>
            <h2 className="text-4xl font-serif text-white mb-4">
              PASSIONIT-PRUTL<br />DHARMA Framework
            </h2>
            <p className="text-white/70 text-base leading-relaxed max-w-lg">
              Every roadmap is audited across 14 dimensions — Purpose, Accountability, Safety, Sustainability,
              Inclusivity, Objectivity, Non-bias, Integrity, Transparency, Privacy, Reliability, Usability,
              Trustworthiness, and Legality. Not marketing. Deterministic scores from your real data.
            </p>
          </div>
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 text-sm">
            {["Purpose", "Safety", "Inclusivity", "Non-bias", "Privacy", "Trustworthiness", "Sustainability", "Legality"].map(d => (
              <div key={d} className="bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-lg font-medium text-center">
                {d}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center bg-[var(--surface)] border-t border-slate-100">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/logo.png" alt="Sanatan Labs" width={40} height={40} className="rounded-lg object-contain" />
          <span className="font-serif font-bold text-2xl text-[var(--dark)]">SANATAN LABS</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-serif text-[var(--dark)] mb-4">
          Ready to navigate your next move?
        </h2>
        <p className="text-[var(--muted)] mb-10 max-w-md mx-auto">
          Free to use. No credit card. Start with your profile in 3 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register"
            className="inline-flex items-center justify-center gap-2 bg-[var(--primary)] text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-[var(--secondary)] transition-colors shadow-lg">
            Create Free Profile <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/company/login"
            className="inline-flex items-center justify-center gap-2 border border-slate-300 text-[var(--text)] px-8 py-4 rounded-xl font-semibold text-base hover:bg-slate-50 transition-colors">
            Company Sign In
          </Link>
        </div>
      </section>

    </div>
  );
}
