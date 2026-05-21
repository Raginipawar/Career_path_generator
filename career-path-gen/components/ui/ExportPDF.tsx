"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { RoadmapResponse } from "@/types";

interface Props { roadmap: RoadmapResponse; profileName?: string; }

// jsPDF standard fonts don't support Unicode (rupee sign, etc.)
// Replace all problem characters before passing to PDF
function clean(text: string): string {
  return (text || "")
    .replace(/₹/g, "Rs.")
    .replace(/[^\x00-\x7E]/g, " ")  // strip non-ASCII entirely
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function ExportPDF({ roadmap, profileName }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const jsPDF = (await import("jspdf")).default;
      const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const W  = 210;
      const H  = 297;
      const M  = 20;
      const CW = W - M * 2;   // 170 mm usable width
      const today = new Date().toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
      });

      let y = M;
      const newPage = () => { pdf.addPage(); y = M; };
      const check   = (need: number) => { if (y + need > H - M - 5) newPage(); };

      // Controlled text wrap — always within CW, never overflows
      const lines = (text: string, maxW: number, size: number, maxLines = 99): string[] => {
        pdf.setFontSize(size);
        const wrapped = pdf.splitTextToSize(clean(text), maxW);
        return wrapped.slice(0, maxLines);
      };

      const hline = () => {
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        pdf.line(M, y, W - M, y);
      };

      // ── HEADER ────────────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(20, 20, 20);
      pdf.text("SANATAN LABS", M, y);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 100, 100);
      pdf.text("PASSIONIT-PRUTL  |  KALKI AI DHARMA FRAMEWORK", M, y + 5);
      pdf.text(`Date: ${today}   |   Confidential`, W - M - 55, y);
      y += 12;
      hline(); y += 8;

      // ── TITLE ─────────────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Career Transition Roadmap", M, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10.5);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`Prepared for: ${clean(profileName || "Candidate")}`, M, y);
      y += 10;
      hline(); y += 10;

      // ── SUMMARY ───────────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(20, 20, 20);
      pdf.text("TRANSITION OVERVIEW", M, y);
      y += 6;

      const summaryRows = [
        ["From", clean(roadmap.current_role)],
        ["To", clean(roadmap.target_role)],
        ["Success Probability", `${roadmap.success_probability}%`],
        ["Total Timeline", `${roadmap.total_transition_months} months`],
        ["Transition Steps", `${roadmap.roadmap_nodes.length}`],
      ];
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      for (const [label, value] of summaryRows) {
        check(6);
        pdf.setTextColor(90, 90, 90);
        pdf.text(`${label}:`, M, y);
        pdf.setTextColor(20, 20, 20);
        pdf.text(value, M + 48, y);
        y += 5.5;
      }
      y += 5;

      // ── AI ASSESSMENT ─────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(20, 20, 20);
      pdf.text("AI ASSESSMENT", M, y);
      y += 5;
      const expL = lines(roadmap.explanation, CW, 9.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(50, 50, 50);
      pdf.text(expL, M, y);
      y += expL.length * 4.5 + 10;
      hline(); y += 10;

      // ── ROADMAP STEPS ─────────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(20, 20, 20);
      pdf.text("CAREER TRANSITION STEPS", M, y);
      y += 8;

      for (const node of roadmap.roadmap_nodes) {
        const descL = lines(node.description, CW, 9, 3);
        const gapL  = lines(
          node.skill_gap?.length ? `Skills to build: ${node.skill_gap.slice(0, 5).join(", ")}` : "",
          CW, 8.5, 1,
        );
        const blockH = 5 + 5 + descL.length * 4.5 + (gapL.length ? 5 : 0) + 6;
        check(blockH);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Step ${node.node_order}  -  ${clean(node.role_title)}`, M, y);
        y += 5;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(80, 80, 80);
        const meta = [
          node.timeline_months > 0 ? `+${node.timeline_months} months` : "Starting point",
          `Rs. ${node.salary_estimate_lpa} LPA`,
          `${node.risk_level} Risk`,
        ].join("   |   ");
        pdf.text(meta, M, y);
        y += 5;

        pdf.setFontSize(9);
        pdf.setTextColor(50, 50, 50);
        pdf.text(descL, M, y);
        y += descL.length * 4.5 + 2;

        if (gapL.length) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 100, 100);
          pdf.text(gapL, M, y);
          y += 5;
        }

        hline(); y += 6;
      }

      // ── ALTERNATIVE PATHS ─────────────────────────────────────────────────────
      if (roadmap.alternative_paths?.length > 0) {
        check(30);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(20, 20, 20);
        pdf.text("ALTERNATIVE CAREER PATHS", M, y);
        y += 6;
        for (const alt of roadmap.alternative_paths) {
          check(10);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          pdf.setTextColor(30, 30, 30);
          pdf.text(clean(alt.path_name), M, y);
          pdf.setFontSize(8.5);
          pdf.setTextColor(90, 90, 90);
          pdf.text(`${alt.success_probability}% probability   |   ${alt.total_months} months`, M + 4, y + 4.5);
          y += 11;
        }
        y += 3; hline(); y += 8;
      }

      // ── EMOTIONAL FORECAST ────────────────────────────────────────────────────
      if (roadmap.emotional_forecast?.length > 0) {
        check(30);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(20, 20, 20);
        pdf.text("JOURNEY FORECAST", M, y);
        y += 6;
        for (const phase of roadmap.emotional_forecast) {
          const dL = lines(phase.description, CW - 4, 9, 2);
          check(dL.length * 4.5 + 12);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(30, 30, 30);
          pdf.text(`${clean(phase.phase)}  (${clean(phase.timeline)})  -  ${phase.stress_level} Stress`, M, y);
          y += 5;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.text(dL, M + 4, y);
          y += dL.length * 4.5 + 4;
        }
        hline(); y += 8;
      }

      // ── ETHICAL AUDIT ─────────────────────────────────────────────────────────
      if (roadmap.audit_scores?.length > 0) {
        check(40);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(20, 20, 20);
        pdf.text("ETHICAL AI AUDIT  -  PASSIONIT + PRUTL FRAMEWORK", M, y);
        y += 8;

        // Fixed column positions — all within CW
        // DIMENSION(0-74) | FRAMEWORK(76-109) | SCORE(111-129) | RISK(131-170)
        const C1 = M;         // Dimension starts at left margin
        const C2 = M + 76;    // Framework
        const C3 = M + 111;   // Score
        const C4 = M + 131;   // Risk

        // Column headers
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 100, 100);
        pdf.text("DIMENSION",  C1, y);
        pdf.text("FRAMEWORK",  C2, y);
        pdf.text("SCORE",      C3, y);
        pdf.text("RISK",       C4, y);
        y += 3; hline(); y += 5;

        for (const score of roadmap.audit_scores) {
          // Explanation must fit strictly within CW (170mm from M)
          // Max explanation width = CW to avoid any overflow
          const expL = lines(score.explanation, CW, 8, 2);
          const blockH = 7 + expL.length * 3.5 + 5;
          check(blockH);

          // Row 1: dimension | framework | score | risk — all within defined cols
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(15, 23, 42);
          // Dimension is max 70mm wide before framework column
          const dimLines = pdf.splitTextToSize(score.dimension, 70);
          pdf.text(dimLines[0], C1, y);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(80, 80, 80);
          pdf.text(clean(score.framework), C2, y);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(20, 20, 20);
          pdf.text(`${score.score}/10`, C3, y);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.text(clean(score.risk_level), C4, y);
          y += 5;

          // Row 2: explanation — indented, strictly within CW
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(8);
          pdf.setTextColor(90, 90, 90);
          pdf.text(expL, M + 4, y);
          y += expL.length * 3.5 + 5;
        }
      }

      // ── FOOTER on every page ──────────────────────────────────────────────────
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        pdf.line(M, H - 13, W - M, H - 13);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(140, 140, 140);
        pdf.text(
          "SANATAN LABS  |  PASSIONIT-PRUTL KALKI AI DHARMA Framework  |  Confidential",
          M, H - 8,
        );
        pdf.text(`Page ${i} / ${totalPages}`, W - M - 16, H - 8);
      }

      const safeName = clean(profileName || "candidate").replace(/\s+/g, "-").toLowerCase();
      const safeRole = clean(roadmap.target_role || "roadmap").replace(/\s+/g, "-").toLowerCase();
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
