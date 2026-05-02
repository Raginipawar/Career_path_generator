"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, UserCircle2, LogOut } from "lucide-react";
import { useAppStore } from "@/store/store";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAppStore();

  const isAuthPage = pathname.startsWith('/auth');
  if (isAuthPage) return null;

  return (
    <nav className="w-full h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 text-[var(--primary)] hover:opacity-90 transition-opacity">
        <Compass className="w-6 h-6 text-[var(--accent)]" />
        <span className="font-serif text-xl font-bold tracking-tight">CareerPath AI</span>
      </Link>

      <div className="flex items-center gap-8">
        {user ? (
          <>
            <div className="hidden md:flex items-center gap-6">
              <NavLink href="/profile" active={pathname === '/profile'}>Profile</NavLink>
              <NavLink href="/roadmap" active={pathname === '/roadmap'}>Roadmap</NavLink>
              <NavLink href="/reports" active={pathname === '/reports'}>Reports</NavLink>
              <NavLink href="/history" active={pathname === '/history'}>History</NavLink>
            </div>
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <UserCircle2 className="w-5 h-5 text-[var(--muted)]" />
                <span className="hidden sm:inline-block">{user.name}</span>
              </div>
              <button 
                onClick={logout}
                className="text-[var(--muted)] hover:text-[var(--danger)] p-2 transition-colors rounded-full hover:bg-slate-50"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-[var(--primary)] transition-colors">
              Log in
            </Link>
            <Link href="/auth/register" className="text-sm font-medium bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`text-sm font-medium transition-colors relative py-1 ${
        active ? "text-[var(--primary)] border-b-2 border-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--primary)]"
      }`}
    >
      {children}
    </Link>
  );
}
