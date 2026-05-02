"use client";

import { useAppStore } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Zap, Clock, TrendingUp, AlertTriangle, ShieldCheck, CheckCircle2, Navigation, Target } from "lucide-react";
import ReactFlow, { Background, Controls, MiniMap, Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import Link from "next/link";
import { useMemo } from "react";

export default function RoadmapDashboard() {
  const { roadmapResponse } = useAppStore();

  const nodes = useMemo(() => {
    if (!roadmapResponse) return [];
    return roadmapResponse.roadmap_nodes.map((node, i) => ({
      id: node.node_id,
      position: { x: 250, y: i * 200 + 50 },
      data: { ...node },
      type: "careerNode",
    }));
  }, [roadmapResponse]);

  const edges = useMemo(() => {
    if (!roadmapResponse) return [];
    return roadmapResponse.roadmap_edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 2, strokeDasharray: "5,5" },
      labelStyle: { fill: "var(--text)", fontWeight: 500, fontSize: 12 },
      labelBgStyle: { fill: "var(--surface)", fillOpacity: 0.8 },
    }));
  }, [roadmapResponse]);

  const nodeTypes = useMemo(() => ({ careerNode: CareerNode }), []);

  if (!roadmapResponse) return null; // Handled by ProtectedRoute

  return (
    <ProtectedRoute>
      <div className="flex-1 bg-[var(--surface)] text-[var(--text)] pb-24">
        
        {/* Section 1: Overview Header */}
        <div className="bg-[var(--dark)] text-white pt-12 pb-24 px-6 lg:px-12 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/10 z-0" />
          
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-white/10 text-white px-3 py-1 rounded-full text-sm font-medium border border-white/20 flex items-center gap-1.5">
                    {roadmapResponse.fromCache ? <><Clock className="w-3.5 h-3.5" /> Cached Result</> : <><Zap className="w-3.5 h-3.5 text-[var(--accent)]" /> Generated Fresh</>}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight mb-3">
                  <span className="text-white/70">{roadmapResponse.current_role}</span>
                  <br />
                  <span className="text-[var(--accent)] flex items-center gap-3 mt-2">
                    <Target className="w-8 h-8" />
                    {roadmapResponse.target_role}
                  </span>
                </h1>
              </div>
              
              <div className="flex gap-4 sm:gap-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div>
                  <p className="text-white/60 text-sm font-medium mb-1 uppercase tracking-wider">Probability</p>
                  <p className="text-4xl font-serif text-[var(--accent)]">{roadmapResponse.success_probability}%</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-white/60 text-sm font-medium mb-1 uppercase tracking-wider">Timeline</p>
                  <p className="text-4xl font-serif text-white">{roadmapResponse.total_transition_months} <span className="text-lg">mo</span></p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-white/90 text-lg leading-relaxed max-w-4xl">
              <p>{roadmapResponse.explanation}</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 space-y-8">
          
          {/* Section 2: Interactive React Flow Roadmap */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-lg font-serif text-[var(--dark)] font-medium">Career Transition Path</h2>
            </div>
            <div className="flex-1">
              <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.5}
                maxZoom={1.5}
              >
                <Background color="#ccc" gap={16} />
                <Controls className="!bg-white !border-slate-200 !shadow-sm" />
                <MiniMap 
                  className="!bg-white !border-slate-200 !shadow-sm sm:block hidden" 
                  nodeColor={(n: any) => n.data.risk_level === 'High' ? 'var(--danger)' : n.data.risk_level === 'Medium' ? 'var(--warning)' : 'var(--primary)'}
                />
              </ReactFlow>
            </div>
          </div>

          {/* Section 3: Emotional & Alternative */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Emotional Forecast */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-xl font-serif text-[var(--dark)] mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--primary)]" /> Journey Forecast
              </h2>
              <div className="space-y-6">
                {roadmapResponse.emotional_forecast.map((phase, idx) => (
                  <div key={idx} className="relative pl-6 border-l-2 border-slate-100 pb-2 last:pb-0">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white 
                      ${phase.stress_level.toLowerCase() === 'high' ? 'bg-[var(--danger)]' : 
                        phase.stress_level.toLowerCase() === 'medium' ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}`} 
                    />
                    <p className="text-sm font-bold text-[var(--primary)] uppercase tracking-wider mb-1">{phase.timeline}</p>
                    <h3 className="text-lg font-medium text-[var(--dark)] mb-2">{phase.phase}</h3>
                    <p className="text-[var(--muted)] text-sm">{phase.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Alternative Paths */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-xl font-serif text-[var(--dark)] mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[var(--primary)]" /> Alternative Paths
              </h2>
              <div className="space-y-4">
                {roadmapResponse.alternative_paths.map((alt, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-[var(--accent)] transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-[var(--dark)] text-lg">{alt.path_name}</h3>
                      <div className="flex items-center gap-1.5 bg-[var(--surface)] text-[var(--primary)] px-2.5 py-1 rounded border border-slate-200 font-bold text-sm">
                        <Target className="w-3.5 h-3.5" /> {alt.success_probability}%
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)] mb-4">
                      {alt.roles.map((role, ridx) => (
                        <div key={ridx} className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">{role}</span>
                          {ridx < alt.roles.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded border border-slate-100 w-fit">
                      <Clock className="w-3 h-3" /> Est. {alt.total_months} months
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Quick Audit Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-lg font-serif text-[var(--dark)] font-medium">Ethical Impact Audit</h2>
              </div>
              <Link href="/reports" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                See Full Report <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {roadmapResponse.audit_scores.slice(0, 4).map((score, idx) => (
                <div key={idx} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <p className="font-semibold text-[var(--dark)]">{score.dimension}</p>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border
                      ${score.risk_level === 'High' ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20' : 
                        score.risk_level === 'Medium' ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20' : 
                        'bg-[var(--success)]/10 text-[var(--primary)] border-[var(--success)]/20'}`}>
                      {score.risk_level} Risk
                    </span>
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-3xl font-serif text-[var(--primary)] leading-none">{score.score}</span>
                    <span className="text-sm text-[var(--muted)] font-medium">/10</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] line-clamp-2" title={score.explanation}>{score.explanation}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}

// Custom React Flow Node Component
function CareerNode({ data }: any) {
  const isHighRisk = data.risk_level === 'High';
  const isMedRisk = data.risk_level === 'Medium';
  const isCurrent = data.node_order === 1;

  return (
    <div className={`w-[280px] rounded-xl shadow-lg border p-4 transition-transform hover:-translate-y-1 
      ${isCurrent ? 'bg-[var(--primary)] text-white border-[var(--secondary)]' : 'bg-white text-[var(--text)] border-slate-200'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`text-xs font-bold uppercase px-2 py-1 rounded 
          ${isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
          Month {data.timeline_months}
        </div>
        <div className={`text-xs font-bold px-2 py-1 rounded border
          ${isHighRisk ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20' : 
            isMedRisk ? (isCurrent ? 'bg-orange-500/20 text-orange-200 border-orange-500/30' : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20') : 
            (isCurrent ? 'bg-white/20 text-white border-white/30' : 'bg-[var(--success)]/10 text-[var(--primary)] border-[var(--success)]/20')}`}>
          {data.risk_level} Risk
        </div>
      </div>
      
      <h3 className={`font-serif text-lg leading-tight mb-2 ${isCurrent ? 'text-white' : 'text-[var(--dark)]'}`}>
        {data.role_title}
      </h3>
      
      <p className={`text-xs mb-4 line-clamp-3 ${isCurrent ? 'text-emerald-50' : 'text-[var(--muted)]'}`}>
        {data.description}
      </p>

      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-[var(--primary)] !rounded-full !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-[var(--primary)] !rounded-full !border-2 !border-white" />
    </div>
  );
}

// ArrowRight mock component if not imported from lucide
function ArrowRight({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}
