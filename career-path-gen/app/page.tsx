import Link from "next/link";
import { ArrowRight, BrainCircuit, Target, ShieldCheck, Compass, CheckCircle2 } from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: <BrainCircuit className="w-8 h-8 text-[var(--accent)]" />,
      title: "RAG-Powered Insights",
      description: "Our Llama 3 engine analyzes millions of curated curriculum documents and career paths to synthesize accurate, personalized roadmaps."
    },
    {
      icon: <Target className="w-8 h-8 text-[var(--danger)]" />,
      title: "Actionable Timeline",
      description: "Stop guessing. Get detailed, month-by-month transition steps, skill gaps, and probability scores to reach your target role."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-[var(--success)]" />,
      title: "Ethically Audited",
      description: "Paths are continuously assessed against PASSIONIT and PRUTL AI ethics frameworks to guarantee non-bias, inclusivity, and viability."
    }
  ];

  const domains = [
    "AI & Machine Learning", "Cybersecurity", "FinTech", "Cloud Architecture", 
    "Product Management", "Data Analytics", "Full Stack Development", "UI/UX Design", 
    "IoT & Embedded", "Healthcare IT"
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-[var(--dark)] text-white pt-24 pb-32 px-6 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/40 to-transparent z-0" />
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-[var(--accent)] font-medium text-sm mb-8">
            <Compass className="w-4 h-4" /> Next-generation Career Navigation
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight mb-8 text-white">
            Your Future,<br/>
            Engineered by <span className="text-[var(--accent)]">Intelligence</span>
          </h1>
          
          <p className="text-xl text-emerald-50 max-w-2xl mb-12 leading-relaxed">
            Generate precise, ethically-audited career transition roadmaps in seconds using advanced Retrieval-Augmented Generation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/auth/register" 
              className="bg-[var(--primary)] hover:bg-[var(--secondary)] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Start Generating <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/auth/login" 
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features / How It Works */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-widest text-[var(--muted)] uppercase mb-3">The Platform</h2>
            <h3 className="text-4xl font-serif text-[var(--dark)]">Data-Driven Career Transitions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-[var(--primary)]/30 transition-colors">
                <div className="w-16 h-16 rounded-xl bg-[var(--dark)] flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-[var(--dark)] mb-3">{feature.title}</h4>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domains Section */}
      <section className="py-24 px-6 lg:px-12 bg-[var(--surface)] border-t border-slate-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-[var(--dark)] mb-6">Optimized for High-Growth Sectors</h2>
          <p className="text-lg text-[var(--muted)] mb-12 max-w-2xl mx-auto">
            Our RAG database aggregates the latest industry requirements across the most competitive technological and strategic domains.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3">
            {domains.map((domain, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                {domain}
              </div>
            ))}
            <div className="flex items-center gap-2 bg-[var(--primary)]/5 px-5 py-2.5 rounded-full border border-[var(--primary)]/20 text-[var(--primary)] font-medium">
              And 50+ more...
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <footer className="bg-[var(--dark)] py-20 px-6 text-center border-t border-white/10">
        <h2 className="text-3xl font-serif text-white mb-8">Ready to navigate your next move?</h2>
        <Link 
          href="/auth/register" 
          className="inline-block bg-white text-[var(--dark)] px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors shadow-xl"
        >
          Create Free Profile
        </Link>
      </footer>
    </div>
  );
}
