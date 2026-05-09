import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Database, Cpu, Repeat, ShieldCheck, Activity } from 'lucide-react';
import type { Agent, VisualState, ConstitutionViolation } from '../store/useCognitionStore';

interface MissionControlSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isDebating: boolean;
  tensionVariance: number;
  visualState: VisualState;
  lastQuery: string;
  violations: ConstitutionViolation[];
  agents: Record<string, Agent>;
}

const AGENT_COLORS = {
  technocrat: '#38bdf8',
  humanist: '#f472b6',
  inquisitor: '#facc15',
};

const MISSION_STEPS = [
  { id: '01', title: 'GROUND', desc: 'Query is anchored in real-world citations', color: '#38bdf8' },
  { id: '02', title: 'DEBATE', desc: '3 agents form independent stances', color: '#f472b6' },
  { id: '03', title: 'BRAWL', desc: "Agents attack each other's logic", color: '#facc15' },
  { id: '04', title: 'VERDICT', desc: 'Judge synthesizes a constitutional ruling', color: 'white' },
];

const LAWS = [
  { id: 'LAW_1_ETHICAL_PRIMACY', label: 'LAW I', title: 'Ethical Primacy' },
  { id: 'LAW_2_MINORITY_VISIBILITY', label: 'LAW II', title: 'Minority Visibility' },
  { id: 'LAW_3_EVIDENTIARY_GROUNDING', label: 'LAW III', title: 'Evidentiary Grounding' },
];

export const MissionControlSidebar: React.FC<MissionControlSidebarProps> = ({
  isOpen,
  setIsOpen,
  isDebating,
  tensionVariance,
  visualState,
  lastQuery,
  violations,
  agents,
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const getStatusBadge = (agentId: string) => {
    const isActive = isDebating && agents[agentId]?.status !== 'idle';
    return (
      <div 
        className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
        style={{ 
          borderColor: isActive ? `${AGENT_COLORS[agentId as keyof typeof AGENT_COLORS]}44` : 'rgba(255,255,255,0.1)',
          color: isActive ? AGENT_COLORS[agentId as keyof typeof AGENT_COLORS] : 'rgba(255,255,255,0.3)',
          background: isActive ? `${AGENT_COLORS[agentId as keyof typeof AGENT_COLORS]}11` : 'transparent'
        }}
      >
        {isActive ? 'ACTIVE' : 'STANDBY'}
      </div>
    );
  };

  const isLawViolated = (lawId: string) => {
    return violations.some(v => v.law === lawId);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] flex items-center justify-center transition-all duration-300"
        style={{
          width: '28px',
          height: '64px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          cursor: 'pointer',
          left: isOpen ? (isMobile ? 'calc(100% - 28px)' : '300px') : '0',
          backdropFilter: 'blur(10px)',
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ChevronRight size={16} className="text-white/40" />
        </motion.div>
      </button>

      {/* Sidebar Panel */}
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="fixed left-0 top-0 h-screen z-50 flex flex-col"
        style={{
          width: isMobile ? '100%' : '300px',
          background: 'rgba(10,10,10,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          padding: '24px 20px',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="text-[11px] font-mono tracking-[0.2em] text-white/30 uppercase">SYNAPSE 2D</div>
          <div className="text-[9px] font-mono text-white/15 uppercase mt-1">MISSION CONTROL</div>
          <div className="h-[1px] w-full bg-white/10 mt-4" />
        </div>

        <div className="flex-1 space-y-8 pb-12">
          {/* Section 1: PARLIAMENT STATUS */}
          <section>
            <div className="text-[9px] font-mono text-white/30 tracking-widest uppercase mb-4">PARLIAMENT STATUS</div>
            <div className="space-y-3">
              {['technocrat', 'humanist', 'inquisitor'].map((id) => (
                <div key={id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-1.5 h-1.5 rounded-full ${isDebating ? 'animate-pulse' : ''}`}
                      style={{ background: AGENT_COLORS[id as keyof typeof AGENT_COLORS] }}
                    />
                    <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">{id}</span>
                  </div>
                  {getStatusBadge(id)}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-baseline">
              <span className="text-[9px] font-mono text-white/20 tracking-wider">TENSION σ²</span>
              <span className="text-[11px] font-mono text-white/60">{tensionVariance.toFixed(4)}</span>
            </div>
          </section>

          {/* Section 2: SYSTEM INFO */}
          <section>
            <div className="text-[9px] font-mono text-white/30 tracking-widest uppercase mb-4">SYSTEM</div>
            <div className="space-y-0">
              {[
                { label: 'MODEL', value: 'Gemini 2.0 Flash', icon: <Cpu size={10} /> },
                { label: 'JUDGE', value: 'Groq / LLaMA 3 70B', icon: <Database size={10} /> },
                { label: 'ROUNDS', value: '3+1 Debate', icon: <Repeat size={10} /> },
                { label: 'MEMORY', value: 'Grounding Active', icon: <Activity size={10} /> },
                { label: 'CONSTITUTION', value: 'v1.3 Loaded', icon: <ShieldCheck size={10} /> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="text-white/20">{row.icon}</span>
                    <span className="text-[10px] font-mono text-white/35 uppercase">{row.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/70">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: HOW IT WORKS */}
          <section>
            <div className="text-[9px] font-mono text-white/30 tracking-widest uppercase mb-4">HOW IT WORKS</div>
            <div className="space-y-2">
              {MISSION_STEPS.map((step) => (
                <div key={step.id} className="bg-white/5 rounded-lg p-3 micro-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold" style={{ color: step.color }}>{step.id}</span>
                    <span className="text-[11px] font-bold text-white tracking-wide">{step.title}</span>
                  </div>
                  <p className="text-[9px] text-white/40 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: LAST SESSION */}
          {lastQuery && (
            <section>
              <div className="text-[9px] font-mono text-white/30 tracking-widest uppercase mb-4">LAST SESSION</div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-white/20">LAST QUERY</span>
                  <p className="text-[10px] text-white/60 line-clamp-2 leading-snug">
                    "{lastQuery.length > 40 ? lastQuery.substring(0, 40) + '...' : lastQuery}"
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono text-white/20">VISUAL STATE</span>
                  <div 
                    className="text-[9px] font-mono px-2 py-0.5 rounded border"
                    style={{ 
                      color: visualState === 'STABLE' ? '#22d3ee' : visualState === 'WARNING' ? '#fbbf24' : '#f472b6',
                      borderColor: visualState === 'STABLE' ? '#22d3ee44' : visualState === 'WARNING' ? '#fbbf2444' : '#f472b644',
                      background: visualState === 'STABLE' ? '#22d3ee11' : visualState === 'WARNING' ? '#fbbf2411' : '#f472b611',
                    }}
                  >
                    {visualState}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono text-white/20">TENSION</span>
                  <span className="text-[10px] font-mono text-white/60">{tensionVariance.toFixed(4)}</span>
                </div>
              </div>
            </section>
          )}

          {/* Section 5: CONSTITUTION LAWS */}
          <section>
            <div className="text-[9px] font-mono text-white/30 tracking-widest uppercase mb-4">ACTIVE LAWS</div>
            <div className="flex flex-col gap-2">
              {LAWS.map((law) => {
                const violated = isLawViolated(law.id);
                return (
                  <div key={law.id} className="bg-white/5 rounded-full px-3 py-1.5 flex items-center gap-2.5 micro-border">
                    <div 
                      className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px]`}
                      style={{ 
                        background: violated ? '#ef4444' : '#22c55e',
                        boxShadow: `0 0 8px ${violated ? '#ef444466' : '#22c55e66'}`
                      }}
                    />
                    <span className="text-[9px] font-mono text-white/80 whitespace-nowrap">{law.label}</span>
                    <span className="text-[9px] text-white/40 border-l border-white/10 pl-2 truncate">{law.title}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 text-center">
          <div className="text-[8px] font-mono text-white/10 uppercase tracking-[0.2em]">
            BUILD FOR NMIT HACKS 2025
          </div>
        </div>
      </motion.aside>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
    </>
  );
};
