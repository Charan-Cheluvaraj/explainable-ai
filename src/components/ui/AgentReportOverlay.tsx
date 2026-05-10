import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCognitionStore } from '../../store/useCognitionStore';
import { Zap, Heart, ShieldAlert } from 'lucide-react';

const ICONS = {
  technocrat: <Zap size={24} className="text-cyan-400" />,
  humanist: <Heart size={24} className="text-pink-400" />,
  inquisitor: <ShieldAlert size={24} className="text-amber-400" />
};

const AGENT_NAMES = {
  technocrat: 'TECHNOCRAT',
  humanist: 'HUMANIST',
  inquisitor: 'INQUISITOR'
};

export const AgentReportOverlay: React.FC = () => {
  const expandedAgentId = useCognitionStore(s => s.expandedAgentId);
  const agents = useCognitionStore(s => s.agents);
  const toggleAgentExpansion = useCognitionStore(s => s.toggleAgentExpansion);

  const activeAgent = expandedAgentId && (expandedAgentId === 'technocrat' || expandedAgentId === 'humanist' || expandedAgentId === 'inquisitor') 
    ? agents[expandedAgentId as keyof typeof agents] 
    : null;

  return (
    <AnimatePresence>
      {activeAgent && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          onClick={() => toggleAgentExpansion(activeAgent.id)}
        >
          <motion.div
            className="agent-report-panel max-w-2xl w-full p-8 rounded-2xl relative overflow-y-auto max-h-[80vh] pointer-events-auto"
            style={{
              background: 'rgba(10, 10, 10, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 0 50px rgba(0,0,0,0.8)',
              backdropFilter: 'blur(24px)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
              <div className="p-3 bg-white/5 rounded-full">
                {ICONS[activeAgent.id as keyof typeof ICONS]}
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-widest text-white/90">
                  {AGENT_NAMES[activeAgent.id as keyof typeof AGENT_NAMES]}
                </h2>
                <div className="text-xs tracking-widest text-white/40 uppercase">
                  Adversarial Stance Report
                </div>
              </div>
              <button 
                className="ml-auto text-white/40 hover:text-white transition-colors p-2"
                onClick={() => toggleAgentExpansion(activeAgent.id)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-white/40 mb-2">Final Decision</h3>
                <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap">
                  {activeAgent.lastThought || 'No response recorded.'}
                </p>
              </div>

              {activeAgent.internalCritique && (
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-white/40 mb-2">Internal Critique</h3>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-sm text-white/70 italic whitespace-pre-wrap">
                    "{activeAgent.internalCritique}"
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
