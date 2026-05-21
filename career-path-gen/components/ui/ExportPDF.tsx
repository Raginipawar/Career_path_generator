"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { RoadmapResponse } from "@/types";

interface Props { roadmap: RoadmapResponse; profileName?: string; }

export default function ExportPDF({ roadmap, profileName }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const jsPDF = (await import("jspdf")).default;
      const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const W       = 210;
      const H       = 297;
      const M       = 20;          // margin
      const CW      = W - M * 2;   // content width
      const today   = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

      let y = M;

      // ── helpers ──────────────────────────────────────────────────────────────
      const newPage = () => { pdf.addPage(); y = M; };
      const check   = (need: number) => { if (y + need > H - M) newPage(); };
      const line    = (x1: number, yy: number, x2: number) => {
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        pdf.line(x1, yy, x2, yy);
      };
      const wrap = (text: string, maxW: number, size: number): string[] => {
        pdf.setFontSize(size);
        return pdf.splitTextToSize(text || "", maxW);
      };

      // ── PAGE 1 HEADER ─────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(30, 30, 30);
      pdf.text("SANATAN LABS", M, y);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text("PASSIONIT-PRUTL · KALKI AI DHARMA FRAMEWORK", M, y + 5);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Date: ${today}`, W - M - 40, y);
      pdf.text("Confidential", W - M - 20, y + 5);

      y += 12;
      line(M, y, W - M);
      y += 8;

      // Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Career Transition Roadmap", M, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(70, 70, 70);
      pdf.text(`Prepared for: ${profileName || "Candidate"}`, M, y);
      y += 10;
      line(M, y, W - M);
      y += 10;

      // ── SUMMARY ───────────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text("TRANSITION OVERVIEW", M, y);
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`From:  ${roadmap.current_role}`, M, y);    y += 5;
      pdf.text(`To:      ${roadmap.target_role}`, M, y);   y += 5;
      pdf.text(`Success Probability:  ${roadmap.success_probability}%`, M, y);  y += 5;
      pdf.text(`Total Timeline:       ${roadmap.total_transition_months} months`, M, y);  y += 5;
      pdf.text(`Transition Steps:     ${roadmap.roadmap_nodes.length}`, M, y);  y += 10;

      // Explanation
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text("AI ASSESSMENT", M, y);
      y += 6;
      const expLines = wrap(roadmap.explanation, CW, 9.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(50, 50, 50);
      pdf.text(expLines, M, y);
      y += expLines.length * 4.5 + 10;

      line(M, y, W - M); y += 10;

      // ── ROADMAP STEPS ─────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text("CAREER TRANSITION STEPS", M, y);
      y += 8;

      for (const node of roadmap.roadmap_nodes) {
        const descLines = wrap(node.description, CW, 9);
        const gapText   = node.skill_gap?.slice(0, 5).join(", ") || "";
        const blockH    = 6 + 5 + 5 + (descLines.length * 4) + (gapText ? 5 : 0) + 8;
        check(blockH);

        // Step heading
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Step ${node.node_order}  —  ${node.role_title}`, M, y);
        y += 5;

        // Meta line
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(80, 80, 80);
        const metaParts = [
          node.timeline_months > 0 ? `+${node.timeline_months} months` : "Starting point",
          `₹${node.salary_estimate_lpa} LPA`,
          `${node.risk_level} Risk`,
        ];
        pdf.text(metaParts.join("   |   "), M, y);
        y += 5;

        // Description
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(50, 50, 50);
        pdf.text(descLines, M, y);
        y += descLines.length * 4 + 2;

        // Skills to build
        if (gapText) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Skills to build: ${gapText}`, M, y);
          y += 5;
        }

        // Thin separator
        line(M, y, W - M); y += 6;
      }

      // ── ALTERNATIVE PATHS ─────────────────────────────────────────────────────
      if (roadmap.alternative_paths?.length > 0) {
        check(30);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text("ALTERNATIVE CAREER PATHS", M, y);
        y += 6;

        for (const alt of roadmap.alternative_paths) {
          check(12);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          pdf.setTextColor(40, 40, 40);
          pdf.text(`${alt.path_name}`, M, y);
          pdf.setFontSize(8.5);
          pdf.setTextColor(90, 90, 90);
          pdf.text(`${alt.success_probability}% probability   |   ${alt.total_months} months`, M + 4, y + 4.5);
          y += 11;
        }
        y += 4;
        line(M, y, W - M); y += 8;
      }

      // ── EMOTIONAL FORECAST ────────────────────────────────────────────────────
      if (roadmap.emotional_forecast?.length > 0) {
        check(30);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text("JOURNEY FORECAST", M, y);
        y += 6;

        for (const phase of roadmap.emotional_forecast) {
          const dLines = wrap(phase.description, CW - 4, 9);
          check(dLines.length * 4 + 14);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(30, 30, 30);
          pdf.text(`${phase.phase}  (${phase.timeline})  —  ${phase.stress_level} Stress`, M, y);
          y += 5;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.text(dLines, M + 4, y);
          y += dLines.length * 4 + 5;
        }
        line(M, y, W - M); y += 8;
      }

      // ── AUDIT SCORES ──────────────────────────────────────────────────────────
      if (roadmap.audit_scores?.length > 0) {
        check(40);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text("ETHICAL AI AUDIT  —  PASSIONIT + PRUTL FRAMEWORK", M, y);
        y += 8;

        // Two-column table header
        const col1 = M, col2 = M + 70, col3 = M + 100, col4 = M + 130;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text("DIMENSION", col1, y);
        pdf.text("FRAMEWORK", col2, y);
        pdf.text("SCORE", col3, y);
        pdf.text("RISK", col4, y);
        y += 3;
        line(M, y, W - M); y += 4;

        for (const score of roadmap.audit_scores) {
          const expLines = wrap(score.explanation, CW, 8);
          check(expLines.length * 3.5 + 12);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(20, 20, 20);
          pdf.text(score.dimension, col1, y);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(80, 80, 80);
          pdf.text(score.framework, col2, y);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(20, 20, 20);
          pdf.text(`${score.score}/10`, col3, y);
          pdf.setFont("helvetica", "normal");
          pdf.text(score.risk_level, col4, y);
          y += 4.5;

          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(8);
          pdf.setTextColor(90, 90, 90);
          pdf.text(expLines.slice(0, 2), M + 4, y);
          y += expLines.slice(0, 2).length * 3.5 + 3;
        }
      }

      // ── FOOTER on every page ─────────────────────────────────────────────────
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(150, 150, 150);
        pdf.text("SANATAN LABS — PASSIONIT-PRUTL KALKI AI DHARMA Framework  |  Confidential", M, H - 10);
        pdf.text(`Page ${i} / ${totalPages}`, W - M - 16, H - 10);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(M, H - 13, W - M, H - 13);
      }

      const safeName = (profileName || "candidate").replace(/\s+/g, "-").toLowerCase();
      const safeRole = (roadmap.target_role || "roadmap").replace(/\s+/g, "-").toLowerCase();
      pdf.save(`sanatan-labs-${safeName}-${safeRole}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={exporting}
      className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {exporting
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
        : <><Download className="w-3.5 h-3.5" /> Export PDF</>}
    </button>
  );
}
