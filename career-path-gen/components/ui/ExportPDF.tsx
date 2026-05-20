"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { RoadmapResponse } from "@/types";

interface Props {
  roadmap: RoadmapResponse;
  profileName?: string;
}

export default function ExportPDF({ roadmap, profileName }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Dynamically import to avoid SSR issues
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 20;

      // ── Header ──
      pdf.setFillColor(0, 77, 64);
      pdf.rect(0, 0, pageW, 40, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Career Path Generator", margin, 16);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Roadmap for ${profileName || "User"}`, margin, 25);
      pdf.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, margin, 32);

      y = 50;
      pdf.setTextColor(30, 30, 30);

      // ── Transition overview ──
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${roadmap.current_role}  →  ${roadmap.target_role}`, margin, y);
      y += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Success Probability: ${roadmap.success_probability}%   |   Timeline: ${roadmap.total_transition_months} months`, margin, y);
      y += 10;

      // ── Explanation ──
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(10);
      const explanationLines = pdf.splitTextToSize(roadmap.explanation, contentW);
      pdf.text(explanationLines, margin, y);
      y += explanationLines.length * 5 + 8;

      // ── Divider ──
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      // ── Roadmap nodes ──
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("Career Transition Steps", margin, y);
      y += 8;

      for (const node of roadmap.roadmap_nodes) {
        if (y > 260) { pdf.addPage(); y = 20; }

        // Node box
        const riskColor = node.risk_level === "Low" ? [22, 163, 74] : node.risk_level === "Medium" ? [217, 119, 6] : [220, 38, 38];
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(...riskColor as [number, number, number]);
        pdf.roundedRect(margin, y, contentW, 32, 3, 3, "FD");

        pdf.setTextColor(30, 30, 30);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Step ${node.node_order}: ${node.role_title}`, margin + 4, y + 8);

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Timeline: +${node.timeline_months} months  |  Salary: ₹${node.salary_estimate_lpa} LPA  |  Risk: ${node.risk_level}`, margin + 4, y + 15);

        const descLines = pdf.splitTextToSize(node.description, contentW - 8);
        pdf.text(descLines.slice(0, 2), margin + 4, y + 21);

        if (node.skill_gap.length > 0) {
          pdf.setTextColor(220, 38, 38);
          pdf.text(`Gap: ${node.skill_gap.slice(0, 4).join(", ")}${node.skill_gap.length > 4 ? "..." : ""}`, margin + 4, y + 29);
        }

        y += 38;
      }

      // ── Audit scores ──
      if (roadmap.audit_scores?.length > 0) {
        if (y > 240) { pdf.addPage(); y = 20; }
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, y, pageW - margin, y);
        y += 8;
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 30, 30);
        pdf.text("Ethical Audit Summary", margin, y);
        y += 8;

        for (const score of roadmap.audit_scores.slice(0, 8)) {
          if (y > 270) { pdf.addPage(); y = 20; }
          const scoreColor = score.risk_level === "Low" ? [22, 163, 74] : score.risk_level === "Medium" ? [217, 119, 6] : [220, 38, 38];
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(30, 30, 30);
          pdf.text(`${score.dimension} (${score.framework})`, margin, y);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...scoreColor as [number, number, number]);
          pdf.text(`${score.score}/10 — ${score.risk_level} Risk`, margin + 80, y);
          pdf.setTextColor(80, 80, 80);
          pdf.setFontSize(9);
          const expLines = pdf.splitTextToSize(score.explanation, contentW);
          pdf.text(expLines.slice(0, 1), margin, y + 4);
          y += 10;
        }
      }

      // ── Footer ──
      const pageCount = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text("Generated by Career Path Generator · Powered by LLaMA 3.3", margin, 292);
        pdf.text(`Page ${i} of ${pageCount}`, pageW - margin - 20, 292);
      }

      pdf.save(`career-roadmap-${roadmap.target_role.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {exporting
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
        : <><Download className="w-3.5 h-3.5" /> Export PDF</>
      }
    </button>
  );
}
