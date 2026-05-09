import React from 'react';
import { motion } from 'framer-motion';
import { useCognitionStore } from '../../store/useCognitionStore';
import { Activity, Zap, ShieldCheck, AlertCircle } from 'lucide-react';

export const TacticalTelemetry: React.FC = () => {
  const { agents, tensionVariance, visualState, debatePhase } = useCognitionStore();

  const getPhaseColor = () => {
    switch (debatePhase) {
      case 'grounding': return '#C4B5FD';
      case 'round1': return '#38bdf8';
      case 'brawl': return '#fb7185';
      case 'synthesis': return '#fbbf24';
      default: return '#38bdf8';
    }
  };

  return (
    <div className="fixed right-6 top-20 w-72 space-y-6 z-[300]">
      {/* System Status Card */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-white/40" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Telemetry</span>
          </div>
          <div 
            className="w-2 h-2 rounded-full animate-pulse" 
            style={{ backgroundColor: getPhaseColor() }} 
          />
        </div>

        {/* Tension Gauge */}
        <div className="relative h-32 flex flex-col items-center justify-center border-b border-white/5 pb-4">
          <svg className="w-24 h-24 -rotate-90">
            <circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="4"
            />
            <motion.circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke={visualState === 'CRISIS' ? '#fb7185' : '#38bdf8'}
              strokeWidth="4"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 - (Math.min(tensionVariance * 10, 1) * 251.2) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <span className="text-2xl font-mono font-bold tracking-tighter">
              {(tensionVariance * 100).toFixed(1)}
            </span>
            <span className="text-[8px] text-white/40 font-bold tracking-widest uppercase">Variance</span>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="mt-4 space-y-3">
          <div className="flex justify-between items-center text-[9px] font-bold tracking-widest text-white/30 uppercase">
            <span>Process Phase</span>
            <span style={{ color: getPhaseColor() }}>{debatePhase}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full"
              style={{ backgroundColor: getPhaseColor() }}
              initial={{ width: '0%' }}
              animate={{ 
                width: 
                  debatePhase === 'grounding' ? '25%' :
                  debatePhase === 'round1' ? '50%' :
                  debatePhase === 'brawl' ? '75%' :
                  debatePhase === 'synthesis' ? '90%' :
                  debatePhase === 'reveal' ? '100%' : '0%'
              }}
            />
          </div>
        </div>
      </div>

      {/* Agents Vitality Card */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-white/40" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Node Confidence</span>
        </div>

        <div className="space-y-4">
          {Object.entries(agents).map(([id, agent]) => (
            <div key={id} className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-medium">
                <span className="text-white/60 uppercase tracking-wider">{id}</span>
                <span className="font-mono text-white/80">{(agent.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full"
                  style={{ 
                    backgroundColor: 
                      id === 'technocrat' ? '#38bdf8' :
                      id === 'humanist' ? '#fb7185' : '#fbbf24'
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.confidence * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constitutional Integrity */}
      <div className={`bg-black/40 backdrop-blur-xl border rounded-2xl p-5 transition-colors duration-500 ${
        visualState === 'CRISIS' ? 'border-rose-500/30' : 
        visualState === 'WARNING' ? 'border-yellow-500/30' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {visualState === 'STABLE' ? (
            <ShieldCheck size={14} className="text-emerald-400" />
          ) : (
            <AlertCircle size={14} className={visualState === 'CRISIS' ? 'text-rose-500' : 'text-yellow-500'} />
          )}
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Protocol {visualState}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-white/40 italic">
          {visualState === 'STABLE' ? 'All reasoning clusters within constitutional bounds.' : 
           visualState === 'WARNING' ? 'Tension detected. Constitutional buffers engaged.' : 
           'Critical violation. Divergence detected in logic layer.'}
        </p>
      </div>
    </div>
  );
};
