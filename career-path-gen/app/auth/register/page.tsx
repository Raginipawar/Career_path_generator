"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/store";
import { Compass, Check } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const { setAuth } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validate passwords: min 8 chars, 1 uppercase, 1 number
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isValid = hasMinLength && hasUppercase && hasNumber;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error("Please ensure your password meets all requirements.");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await api.register({ name, email, password });
      
      // The spec says "Auto-login after register"
      // Assuming the register endpoint responds with {token, user} like login:
      if (res.token && res.user) {
        setAuth(res.user, res.token);
      } else {
        // Fallback: manually login if register doesn't return token
        const loginRes = await api.login({ email, password });
        setAuth(loginRes.user, loginRes.token);
      }
      
      toast.success("Account created successfully!");
      router.push("/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to register account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--surface)]">
      {/* Left side brand gradient */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white p-12">
        <Compass className="w-24 h-24 text-[var(--accent)] mb-8" />
        <h1 className="font-serif text-5xl mb-4 text-center">Start Your Journey</h1>
        <p className="text-emerald-50 text-xl text-center max-w-md">
          Join thousands of professionals discovering optimal paths with our ethically-audited AI.
        </p>
      </div>

      {/* Right side form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100 my-auto">
          <div className="text-center mb-8 lg:hidden">
            <Compass className="w-12 h-12 text-[var(--primary)] mx-auto mb-4" />
            <h1 className="font-serif text-3xl text-[var(--dark)]">CareerPath AI</h1>
          </div>
          
          <h2 className="font-serif text-3xl text-[var(--dark)] mb-2">Create Account</h2>
          <p className="text-[var(--muted)] mb-8">Begin generating data-driven career roadmaps.</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>
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
              
              {/* Password Validation Inline */}
              <div className="mt-3 space-y-1">
                <div className={`flex items-center text-xs ${hasMinLength ? 'text-[var(--success)]' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3 mr-1" /> 8+ characters
                </div>
                <div className={`flex items-center text-xs ${hasUppercase ? 'text-[var(--success)]' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3 mr-1" /> 1 uppercase letter
                </div>
                <div className={`flex items-center text-xs ${hasNumber ? 'text-[var(--success)]' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3 mr-1" /> 1 number
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isValid}
              className="w-full bg-[var(--primary)] text-white font-medium py-3 rounded-lg hover:bg-[var(--secondary)] transition-colors mt-6 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--muted)] mt-8">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[var(--primary)] font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
