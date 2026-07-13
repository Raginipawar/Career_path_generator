"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    // Wait for page content to render, then observe cards and sections
    const timer = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(
        "main > *, .reveal-on-scroll"
      ).forEach((el) => {
        observer.observe(el);
      });

      // Also observe grid children and standalone cards
      document.querySelectorAll<HTMLElement>(
        "[class*='grid'] > *, section > *"
      ).forEach((el) => {
        // Skip navbar, toasters, and already-visible fixed elements
        if (el.closest("nav") || el.closest("[data-no-reveal]")) return;
        el.style.opacity = "0";
        el.style.transform = "translateY(18px)";
        el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        observer.observe(el);
      });
    }, 80);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
