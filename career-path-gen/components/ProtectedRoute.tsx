"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/store";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, roadmapResponse } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Check Auth Token
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // 2. Check Generation state constraint (cannot access /roadmap or /reports without roadmapResponse)
    const requiresRoadmap = pathname === "/roadmap" || pathname === "/reports";
    if (requiresRoadmap && !roadmapResponse) {
      router.push("/profile");
      return;
    }
  }, [token, roadmapResponse, pathname, router]);

  // If rendering but will redirect, we can just return children anyway,
  // the useEffect redirect will flash quickly, or we can return null if no token.
  if (!token) return null;

  return <>{children}</>;
}
