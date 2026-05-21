"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/store";
import { Building2, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function CompanyLogin() {
  const router = useRouter();
  const { logout } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/org/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      // Clear any personal session before starting company session
      logout();
      localStorage.setItem("company-token", data.token);
      localStorage.setItem("company-user", JSON.stringify(data.user));
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push("/company/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--primary)] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--primary)] rounded-2xl mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-serif text-[var(--dark)]">Company Sign In</h1>
          <p className="text-[var(--muted)] mt-2">Access your organisation dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" className="input-field pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input type="password" required value={form.password} onChange={set("password")} placeholder="Your password" className="input-field pl-10" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white py-3 rounded-xl font-medium hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors">
            {loading ? "Signing in..." : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-center text-sm text-[var(--muted)]">
            New organisation? <Link href="/company/register" className="text-[var(--primary)] font-medium hover:underline">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
