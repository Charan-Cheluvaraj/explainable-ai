import React, { useEffect, useRef } from 'react';
import { useCognitionStore } from './store/useCognitionStore';
import { 
  Activity, 
  ShieldAlert, 
  MessageSquare, 
  Terminal,
  Cpu,
  Heart,
  Search,
  Scale,
  AlertTriangle
} from 'lucide-react';
import gsap from 'gsap';

// ─────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────

const AGENT_CONFIG = {
  technocrat: {
    name: 'TECHNOCRAT',
    icon: Cpu,
    color: '#00F2FF',
    glow: 'glow-logic',
    description: 'Algorithmic Optimization & Logic'
  },
  humanist: {
    name: 'HUMANIST',
    icon: Heart,
    color: '#FF4D8D',
    glow: 'glow-ethics',
    description: 'Social Impact & Ethical Alignment'
  },
  inquisitor: {
    name: 'INQUISITOR',
    icon: Search,
    color: '#FFD700',
    glow: 'glow-risk',
    description: 'Risk Assessment & Edge-Case Analysis'
  }
};

function AgentCard({ id }: { id: keyof typeof AGENT_CONFIG }) {
  const agent = useCognitionStore((s) => s.agents[id]);
  const violations = useCognitionStore((s) => s.violations.filter(v => v.agentId.toLowerCase().includes(id)));
  const config = AGENT_CONFIG[id];
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (agent.status === 'thinking') {
      gsap.to(cardRef.current, {
        scale: 1.02,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    } else {
      gsap.to(cardRef.current, { scale: 1, duration: 0.5 });
    }
  }, [agent.status]);

  useEffect(() => {
    if (agent.status === 'speaking' && textRef.current) {
      gsap.fromTo(textRef.current, 
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 1, ease: "power4.out" }
      );
    }
  }, [agent.status, agent.lastThought]);

  return (
    <div 
      ref={cardRef}
      className={`relative w-80 h-[30rem] glass rounded-xl flex flex-col p-6 transition-all duration-500 border-2 ${agent.status !== 'idle' ? config.glow : ''}`}
      style={{ borderColor: agent.status !== 'idle' ? config.color : 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <config.icon size={24} style={{ color: config.color }} />
        <div className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase">{config.name}</div>
      </div>

      {violations.length > 0 && (
        <div className="mb-4 animate-in fade-in zoom-in duration-300">
          {violations.map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-ethics/10 border border-ethics/30 rounded px-2 py-1 mb-1">
              <AlertTriangle size={10} className="text-ethics" />
              <span className="text-[8px] font-bold text-ethics uppercase tracking-tighter">{v.law}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center items-center text-center overflow-hidden">
        {agent.status === 'thinking' ? (
          <div className="space-y-4">
            <div className="flex justify-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-xs text-secondary italic">Synthesizing response...</p>
          </div>
        ) : agent.status === 'speaking' ? (
          <div className="w-full h-full flex flex-col justify-center">
            <p ref={textRef} className="text-sm leading-relaxed text-primary custom-scrollbar overflow-y-auto max-h-full py-4 px-2">
              {agent.lastThought || 'Deliberation finalized.'}
            </p>
          </div>
        ) : (
          <div className="opacity-20 flex flex-col items-center">
            <Terminal size={48} className="mb-4" />
            <p className="text-[10px] uppercase tracking-widest">Station Idle</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-[9px] text-muted uppercase tracking-tighter">Confidence</span>
          <span className="text-xs font-mono" style={{ color: config.color }}>{(agent.confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-1000 ease-out"
            style={{ width: `${agent.confidence * 100}%`, backgroundColor: config.color }}
          />
        </div>
      </div>
    </div>
  );
}

function CommandCenter() {
  const visualState = useCognitionStore((s) => s.visualState);
  const variance = useCognitionStore((s) => s.tensionVariance);
  const isDebating = useCognitionStore((s) => s.isDebating);

  return (
    <header className="fixed top-0 left-0 w-full h-20 glass border-b border-white/5 px-8 flex items-center justify-between z-50">
      <div className="flex items-center gap-8">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tighter">SYNAPSE</span>
            <span className="text-lg font-bold text-logic">2D</span>
          </div>
          <div className="text-[9px] text-muted tracking-[0.3em] uppercase">Cognitive Parliament</div>
        </div>

        <div className="h-8 w-px bg-white/10" />

        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] text-muted uppercase tracking-widest">Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isDebating ? 'bg-logic animate-pulse' : 'bg-white/20'}`} />
              <span className="text-xs font-mono uppercase">{isDebating ? 'Active Deliberation' : 'Standby'}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-muted uppercase tracking-widest">Tension σ²</span>
            <span className={`text-xs font-mono ${variance > 0.1 ? 'text-ethics' : 'text-logic'}`}>
              {variance.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-3 px-4 py-2 rounded border-2 transition-all duration-500 ${
        visualState === 'CRISIS' ? 'border-ethics bg-ethics/10 glow-ethics' :
        visualState === 'WARNING' ? 'border-risk bg-risk/10 glow-risk' :
        'border-logic/30 bg-logic/5 glow-logic'
      }`}>
        <ShieldAlert size={16} className={visualState === 'CRISIS' ? 'text-ethics' : 'text-logic'} />
        <span className="text-xs font-bold tracking-widest uppercase">{visualState}</span>
      </div>
    </header>
  );
}

function PromptWell() {
  const [query, setQuery] = React.useState('');
  const startDebate = useCognitionStore((s) => s.startDebate);
  const isDebating = useCognitionStore((s) => s.isDebating);
  const lastQuery = useCognitionStore((s) => s.lastQuery);

  const handleSubmit = () => {
    if (!query.trim() || isDebating) return;
    startDebate(query);
    setQuery('');
  };

  return (
    <footer className="fixed bottom-0 left-0 w-full p-8 z-50">
      <div className="max-w-4xl mx-auto space-y-4">
        {lastQuery && (
          <div className="glass rounded-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} className="text-muted" />
              <span className="text-[10px] text-muted uppercase tracking-widest">Active Prompt</span>
            </div>
            <p className="text-sm text-secondary font-medium italic">"{lastQuery}"</p>
          </div>
        )}

        <div className="relative group">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter a strategic query for the Parliament..."
            className="w-full h-14 bg-black/40 glass border-white/10 rounded-xl px-6 pr-32 text-sm focus:outline-none focus:border-logic/50 transition-all placeholder:text-muted"
          />
          <button 
            onClick={handleSubmit}
            disabled={isDebating || !query.trim()}
            className="absolute right-2 top-2 h-10 px-6 rounded-lg bg-logic text-black text-[11px] font-bold tracking-widest uppercase hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-[0_0_15px_rgba(0,242,255,0.4)]"
          >
            {isDebating ? 'Conveying...' : 'Convene'}
          </button>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="synapse-root min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
      <CommandCenter />
      
      <main className="flex gap-12 items-center justify-center p-8 mt-12 mb-32 w-full max-w-7xl mx-auto">
        <AgentCard id="technocrat" />
        <AgentCard id="humanist" />
        <AgentCard id="inquisitor" />
      </main>

      <PromptWell />

      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-gradient-to-b from-logic/5 to-transparent pointer-events-none opacity-20 blur-3xl" />
    </div>
  );
}
