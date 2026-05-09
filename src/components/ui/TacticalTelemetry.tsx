import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCognitionStore } from '../../store/useCognitionStore';
import { Activity, Zap, ShieldCheck, AlertCircle } from 'lucide-react';

export const TacticalTelemetry: React.FC = () => {
  const { agents, tensionVariance, visualState, debatePhase } = useCognitionStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Spotlight Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getPhaseColor = () => {
    switch (debatePhase) {
      case 'grounding': return 'var(--color-judge)';
      case 'round1': return 'var(--color-logic)';
      case 'brawl': return 'var(--color-ethics)';
      case 'synthesis': return 'var(--color-risk)';
      default: return 'var(--color-logic)';
    }
  };

  const getAgentColor = (id: string) => {
    switch(id) {
      case 'technocrat': return 'var(--color-logic)';
      case 'humanist': return 'var(--color-ethics)';
      case 'inquisitor': return 'var(--color-risk)';
      default: return 'var(--color-logic)';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed right-6 top-20 w-72 space-y-6 z-[300]"
      style={{
        // Magnetic Spotlight logic via CSS variables
        background: `radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.03), transparent 40%)`
      }}
    >
      {/* System Status Card */}
      <div className="micro-border bg-[var(--surface-elevated)] backdrop-blur-3xl rounded-2xl p-5 shadow-2xl overflow-hidden relative">
        {/* Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">Telemetry</span>
          </div>
          <div 
            className="w-2 h-2 rounded-full animate-pulse" 
            style={{ backgroundColor: getPhaseColor(), boxShadow: `0 0 10px ${getPhaseColor()}` }} 
          />
        </div>

        {/* Tension Gauge with CRT Aberration */}
        <div className="relative h-32 flex flex-col items-center justify-center border-b border-white/5 pb-4 z-10">
          <svg className="w-24 h-24 -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
            <motion.circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke={visualState === 'CRISIS' ? 'var(--color-ethics)' : 'var(--color-logic)'}
              strokeWidth="4"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 - (Math.min(tensionVariance * 10, 1) * 251.2) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <span 
              className="text-2xl font-mono font-bold tracking-tighter"
              style={{ 
                textShadow: visualState === 'CRISIS' ? '2px 0px 0px rgba(255,0,0,0.5), -2px 0px 0px rgba(0,255,255,0.5)' : 'none' 
              }}
            >
              {(tensionVariance * 100).toFixed(1)}
            </span>
            <span className="text-[8px] text-[var(--text-muted)] font-bold tracking-widest uppercase">Variance</span>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="mt-4 space-y-3 z-10 relative">
          <div className="flex justify-between items-center text-[9px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            <span>Process Phase</span>
            <span style={{ color: getPhaseColor(), textShadow: `0 0 10px ${getPhaseColor()}80` }}>{debatePhase}</span>
          </div>
        </div>
      </div>

      {/* Agents Vitality Card */}
      <div className="micro-border bg-[var(--surface-elevated)] backdrop-blur-3xl rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
        
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Zap size={14} className="text-[var(--text-muted)]" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">Node Confidence</span>
        </div>

        <div className="space-y-5 relative z-10">
          {Object.entries(agents).map(([id, agent]) => (
            <div key={id} className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-medium">
                <span className="text-[var(--text-secondary)] uppercase tracking-wider">{id}</span>
                <span className="font-mono text-[var(--text-primary)]">{(agent.confidence * 100).toFixed(0)}%</span>
              </div>
              {/* Holographic SVG Wave */}
              <div className="h-[6px] w-full bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute top-0 left-0 bottom-0"
                  style={{ width: `${agent.confidence * 100}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
                    <motion.path
                      d="M0 5 Q 25 0, 50 5 T 100 5 L100 10 L0 10 Z"
                      fill={getAgentColor(id)}
                      opacity="0.8"
                      animate={{ x: [0, -50] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                    <motion.path
                      d="M0 5 Q 25 10, 50 5 T 100 5 L100 10 L0 10 Z"
                      fill={getAgentColor(id)}
                      opacity="0.4"
                      animate={{ x: [-50, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    />
                  </svg>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constitutional Integrity */}
      <div className={`micro-border bg-[var(--surface-elevated)] backdrop-blur-3xl rounded-2xl p-5 transition-colors duration-[600ms] ease-[var(--spring-snappy)] relative overflow-hidden ${
        visualState === 'CRISIS' ? 'border-[var(--color-ethics)]' : 
        visualState === 'WARNING' ? 'border-[var(--color-risk)]' : ''
      }`}>
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
        
        <div className="flex items-center gap-2 mb-3 relative z-10">
          {visualState === 'STABLE' ? (
            <ShieldCheck size={14} className="text-[var(--color-logic)]" />
          ) : (
            <AlertCircle size={14} style={{ color: visualState === 'CRISIS' ? 'var(--color-ethics)' : 'var(--color-risk)' }} />
          )}
          <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">Protocol {visualState}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-[var(--text-muted)] italic relative z-10">
          {visualState === 'STABLE' ? 'All reasoning clusters within constitutional bounds.' : 
           visualState === 'WARNING' ? 'Tension detected. Constitutional buffers engaged.' : 
           'Critical violation. Divergence detected in logic layer.'}
        </p>
      </div>
    </div>
  );
};
