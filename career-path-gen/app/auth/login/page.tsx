"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/store";
import { Compass } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const { setAuth } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setAuth(res.user, res.token);
      toast.success("Welcome back!");
      router.push("/profile");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--surface)]">
      {/* Left side brand gradient */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white p-12">
        <Compass className="w-24 h-24 text-[var(--accent)] mb-8" />
        <h1 className="font-serif text-5xl mb-4 text-center">Your AI-Powered Career Compass</h1>
        <p className="text-emerald-50 text-xl text-center max-w-md">
          Navigate your professional journey with data-driven insights and ethical guidance.
        </p>
      </div>

      {/* Right side form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8 sm:p-12">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-center mb-8 lg:hidden">
            <Compass className="w-12 h-12 text-[var(--primary)] mx-auto mb-4" />
            <h1 className="font-serif text-3xl text-[var(--dark)]">CareerPath AI</h1>
          </div>
          
          <h2 className="font-serif text-3xl text-[var(--dark)] mb-2">Welcome Back</h2>
          <p className="text-[var(--muted)] mb-8">Sign in to continue your career journey.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--primary)] text-white font-medium py-3 rounded-lg hover:bg-[var(--secondary)] transition-colors mt-6 flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--muted)] mt-8">
            Don't have an account?{" "}
            <Link href="/auth/register" className="text-[var(--primary)] font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
