"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, UserCircle2, LogOut, Building2 } from "lucide-react";
import { useAppStore } from "@/store/store";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAppStore();
  const [companyUser, setCompanyUser] = useState<any>(null);

  // Check for company session on mount and route change
  useEffect(() => {
    try {
      const raw = localStorage.getItem('company-user');
      setCompanyUser(raw ? JSON.parse(raw) : null);
    } catch { setCompanyUser(null); }
  }, [pathname]);

  const isAuthPage    = pathname.startsWith('/auth') || pathname.startsWith('/company/login') || pathname.startsWith('/company/register');
  const isCompanyPage = pathname.startsWith('/company');

  if (isAuthPage) return null;

  const handlePersonalLogout = () => {
    logout();
    router.push('/');
  };

  const handleCompanyLogout = () => {
    localStorage.removeItem('company-token');
    localStorage.removeItem('company-user');
    localStorage.removeItem('company-org');
    setCompanyUser(null);
    router.push('/company/login');
  };

  // Company dashboard nav
  if (companyUser || isCompanyPage) {
    return (
      <nav className="w-full h-14 bg-[var(--primary)] text-white flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <Link href="/company/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Building2 className="w-5 h-5 text-[var(--accent)]" />
          <span className="font-serif text-lg font-bold">CareerPath — Company</span>
        </Link>
        <div className="flex items-center gap-6">
          <NavLinkWhite href="/company/dashboard" active={pathname === '/company/dashboard'}>Dashboard</NavLinkWhite>
          <NavLinkWhite href="/company/quick-analysis" active={pathname === '/company/quick-analysis'}>Quick Analysis</NavLinkWhite>
          <div className="flex items-center gap-3 pl-4 border-l border-white/20">
            <span className="text-sm text-white/80">{companyUser?.name}</span>
            <button onClick={handleCompanyLogout} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // Personal nav
  return (
    <nav className="w-full h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 text-[var(--primary)] hover:opacity-90 transition-opacity">
        <Compass className="w-6 h-6 text-[var(--accent)]" />
        <span className="font-serif text-xl font-bold tracking-tight">CareerPath AI</span>
      </Link>

      <div className="flex items-center gap-8">
        {user ? (
          <>
            <div className="hidden md:flex items-center gap-5">
              <NavLink href="/dashboard"  active={pathname === '/dashboard'}>Dashboard</NavLink>
              <NavLink href="/profiles"   active={pathname === '/profiles'}>My Profiles</NavLink>
              <NavLink href="/roadmap"    active={pathname === '/roadmap'}>Roadmap</NavLink>
              <NavLink href="/reports"    active={pathname === '/reports'}>Reports</NavLink>
              <NavLink href="/trends"     active={pathname === '/trends'}>Trends</NavLink>
              <NavLink href="/history"    active={pathname === '/history'}>History</NavLink>
            </div>
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <UserCircle2 className="w-5 h-5 text-[var(--muted)]" />
                <span className="hidden sm:inline-block">{user.name}</span>
              </div>
              <button onClick={handlePersonalLogout} className="text-[var(--muted)] hover:text-[var(--danger)] p-2 transition-colors rounded-full hover:bg-slate-50" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-[var(--primary)] transition-colors">Log in</Link>
            <Link href="/auth/register" className="text-sm font-medium bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm">Sign up</Link>
            <Link href="/company/login" className="text-sm font-medium border border-[var(--primary)] text-[var(--primary)] px-4 py-2 rounded-lg hover:bg-[var(--primary)]/5 transition-colors">For Companies</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`text-sm font-medium transition-colors relative py-1 ${active ? 'text-[var(--primary)] border-b-2 border-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--primary)]'}`}>
      {children}
    </Link>
  );
}

function NavLinkWhite({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`text-sm font-medium transition-colors ${active ? 'text-white border-b-2 border-[var(--accent)] pb-0.5' : 'text-white/70 hover:text-white'}`}>
      {children}
    </Link>
  );
}
