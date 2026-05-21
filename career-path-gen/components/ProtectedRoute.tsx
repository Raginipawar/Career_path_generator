"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/store";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, roadmapResponse } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If there's an active company session but no personal token, redirect to company dashboard
    const companyToken = typeof window !== 'undefined'
      ? localStorage.getItem('company-token')
      : null;

    if (!token && companyToken) {
      router.push('/company/dashboard');
      return;
    }

    // No auth at all
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Personal routes that require a generated roadmap
    const requiresRoadmap = pathname === '/roadmap' || pathname === '/reports';
    if (requiresRoadmap && !roadmapResponse) {
      router.push('/profile');
      return;
    }
  }, [token, roadmapResponse, pathname, router]);

  if (!token) return null;

  return <>{children}</>;
}
