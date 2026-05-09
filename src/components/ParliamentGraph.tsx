import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCognitionStore } from '../store/useCognitionStore';

interface ParliamentGraphProps {
  query: string;
  isDebating: boolean;
  result?: string;
}

// ─────────────────────────────────────────────────────────────
// Cinematic Layout Offsets (Compact & Centered)
// ─────────────────────────────────────────────────────────────
const AGENTS = [
  { id: 'technocrat', name: 'TECHNOCRAT', color: 'var(--color-logic)', xOff: -180, yOff: 60 },
  { id: 'humanist', name: 'HUMANIST', color: 'var(--color-ethics)', xOff: 180, yOff: 60 },
  { id: 'inquisitor', name: 'INQUISITOR', color: 'var(--color-risk)', xOff: 0, yOff: -190 },
] as const;

// ─────────────────────────────────────────────────────────────
// Logic Components
// ─────────────────────────────────────────────────────────────

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(text);
  const indexRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    textRef.current = text;
    indexRef.current = 0;
    const t0 = setTimeout(() => setDisplayedText(''), 0);

    const animate = () => {
      if (indexRef.current < textRef.current.length) {
        indexRef.current += 1;
        setDisplayedText(textRef.current.substring(0, indexRef.current));
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { 
      clearTimeout(t0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current); 
    };
  }, [text]);

  return <span>{displayedText}</span>;
};

const StatusCycler = ({ statuses, interval = 2000 }: { statuses: string[], interval?: number }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex(prev => (prev + 1) % statuses.length), interval);
    return () => clearInterval(t);
  }, [statuses, interval]);

  return (
    <motion.span
      key={statuses[index]}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="status-text"
    >
      {statuses[index]}
    </motion.span>
  );
};

const Equalizer = () => (
  <div className="equalizer">
    {[0.2, 0.5, 0.3].map((delay, i) => (
      <motion.div
        key={i}
        className="eq-bar"
        animate={{ height: [4, 12, 4] }}
        transition={{ duration: 0.6, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const TensionMeter = ({ active, isResolved }: { active: boolean; isResolved?: boolean }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active || isResolved) return;
    const t = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 2, 100));
    }, 150);
    return () => clearInterval(t);
  }, [active, isResolved]);

  const getColor = () => {
    if (isResolved) return 'rgba(251, 191, 36, 0.8)';
    if (progress < 40) return 'var(--color-logic)';
    if (progress < 75) return 'var(--color-risk)';
    return 'var(--color-ethics)';
  };

  return (
    <div className={`tension-container ${isResolved ? 'resolved' : ''}`}>
      <div className="tension-header">
        <span>{isResolved ? 'RESOLVED σ²' : 'TENSION σ²'}</span>
        <span>{isResolved ? 'STABLE' : `${Math.floor(progress)}%`}</span>
      </div>
      <div className="tension-bar-bg">
        <motion.div 
          className="tension-bar-fill"
          animate={{ width: isResolved ? '100%' : `${progress}%`, backgroundColor: getColor() }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};

const RadialBurst = () => (
  <div className="radial-burst">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="burst-line"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: [0, 1.5, 0], opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.8, delay: 0.6 + (i * 0.05), ease: "easeOut" }}
        style={{ rotate: i * 60 }}
      />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const ParliamentGraph: React.FC<ParliamentGraphProps> = ({ query, isDebating, result }) => {
  const [phase, setPhase] = useState(1);
  const [dim] = useState({ w: window.innerWidth, h: window.innerHeight });
  const resetStore = useCognitionStore(s => s.reset);

  useEffect(() => {
    if (isDebating) {
      const t0 = setTimeout(() => setPhase(1), 0);
      const t1 = setTimeout(() => setPhase(2), 600); 
      const t2 = setTimeout(() => setPhase(3), 1200); 
      const t3 = setTimeout(() => setPhase(4), 1800);
      return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isDebating]);

  useEffect(() => {
    // Phase 5 trigger: debate must be finished with a result
    if (!isDebating && result && result.length > 0) {
      const t = setTimeout(() => setPhase(5), 0);
      return () => clearTimeout(t);
    }
  }, [isDebating, result]);

  // Center points (JS for SVG sync)
  const cx = dim.w * 0.5;
  const cy = (dim.h * 0.5) - 2; // Judge nudge: 2px up

  return (
    <div className="graph-root">
      {/* 1. Ambient Layer */}
      <motion.div 
        className="ambient-breath"
        animate={{ 
          scale: [1, 1.15, 1], 
          opacity: phase === 5 ? [0.4, 0.7, 0.4] : [0.3, 0.6, 0.3],
          background: phase === 5 
            ? 'radial-gradient(circle at center, rgba(251, 191, 36, 0.04) 0%, transparent 70%)'
            : 'radial-gradient(circle at center, rgba(56, 189, 248, 0.05) 0%, transparent 70%)'
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 2. SVG Line Layer (JS-Synced Coordinates) */}
      <svg className="graph-lines-svg">
        {/* Transition Beams */}
        {phase === 1 && (
          <motion.line
            stroke="white" strokeWidth="2" strokeDasharray="10 5"
            x1={cx} y1={dim.h} x2={cx} y2={cy}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0] }}
            transition={{ duration: 0.6 }}
          />
        )}
        
        {phase === 2 && AGENTS.map(agent => (
          <motion.line
            key={`beam-${agent.id}`}
            stroke={agent.color} strokeWidth="2" strokeDasharray="10 5"
            x1={cx} y1={cy} x2={cx + agent.xOff} y2={cy + agent.yOff}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0] }}
            transition={{ duration: 0.6 }}
          />
        ))}

        {/* Persistent Connection Lines */}
        {phase >= 4 && (
          <g>
            {AGENTS.map(agent => (
              <motion.line
                key={`line-${agent.id}`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
                x1={cx} y1={cy} x2={cx + agent.xOff} y2={cy + agent.yOff}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: phase === 5 ? 0 : 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            ))}
          </g>
        )}

        {/* Data Flow Dots */}
        {phase === 4 && AGENTS.map(agent => (
          <g key={`dots-${agent.id}`}>
            {/* Agent -> Judge */}
            <motion.circle
              r="3" fill={agent.color}
              animate={{ 
                cx: [cx + agent.xOff, cx],
                cy: [cy + agent.yOff, cy],
                opacity: [0, 0.7, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            {/* Judge -> Agent */}
            <motion.circle
              r="3" fill={agent.color}
              animate={{ 
                cx: [cx, cx + agent.xOff],
                cy: [cy, cy + agent.yOff],
                opacity: [0, 0.7, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </g>
        ))}
      </svg>

      {/* 3. HTML Nodes Layer (Percentage-Synced to SVG Grid) */}
      <div className="nodes-container">
        {/* Judge Node */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className={`p-node judge-node ${phase === 5 ? 'expanded' : ''}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: phase === 5 ? 1.3 : 1, 
                opacity: 1,
                boxShadow: phase === 5 
                  ? ['0 0 0px white', '0 0 60px white', '0 0 0px white']
                  : '0 0 0px white'
              }}
              transition={{ 
                scale: { type: 'spring', stiffness: 180, damping: 14, delay: 0.6 },
                boxShadow: { duration: 0.6, times: [0, 0.5, 1] }
              }}
              style={{ 
                left: "50%", 
                top: "50%",
                translateX: "-50%",
                translateY: "calc(-50% - 2px)"
              }}
            >
              {phase === 4 && <div className="rotating-arc-border" />}
              {phase === 5 && <div className="solid-glow-border" />}
              {phase === 5 && <RadialBurst />}
              
              <div className="node-core">
                {phase === 4 && <Equalizer />}
                {phase === 5 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="verdict-icon"
                  >
                    §
                  </motion.div>
                )}
                
                <motion.span 
                  className="node-label judge-label"
                  animate={{ opacity: phase === 5 ? 0 : 1 }}
                >
                  JUDGE
                </motion.span>
                
                {phase === 5 && (
                  <motion.span 
                    className="node-label verdict-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    VERDICT
                  </motion.span>
                )}

                {phase === 4 && (
                  <div className="node-status-sub">
                    <StatusCycler statuses={["Collecting...", "Cross-examining...", "Deliberating..."]} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Nodes */}
        <AnimatePresence>
          {phase >= 3 && AGENTS.map((agent, i) => (
            <motion.div
              key={agent.id}
              className="p-node agent-node"
              initial={{ 
                left: "50%", top: "50%", 
                translateX: "-50%", translateY: "calc(-50% - 2px)",
                scale: 0, opacity: 0 
              }}
              animate={{ 
                x: phase === 5 ? 0 : agent.xOff, 
                y: phase === 5 ? 0 : agent.yOff,
                scale: phase === 5 ? 0 : 1, 
                opacity: phase === 5 ? 0 : 1,
                boxShadow: (phase === 4) ? [
                  `0 0 0px ${agent.color}00`,
                  `0 0 18px ${agent.color}`,
                  `0 0 0px ${agent.color}00`
                ] : 'none'
              }}
              transition={{ 
                type: 'spring', damping: 18,
                x: { duration: phase === 5 ? 0.6 : 0.8 },
                y: { duration: phase === 5 ? 0.6 : 0.8 },
                scale: { duration: phase === 5 ? 0.4 : 0.8 },
                opacity: { duration: phase === 5 ? 0.4 : 0.8 },
                boxShadow: {
                  duration: i === 0 ? 1.8 : i === 1 ? 2.1 : 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              style={{ 
                left: "50%",
                top: "50%",
                translateX: "-50%",
                translateY: "calc(-50% - 2px)"
              }}
            >
              <div className="node-core">
                <span className="node-label" style={{ color: agent.color }}>{agent.name}</span>
                {phase === 4 && (
                  <div className="agent-status-pill">
                    <StatusCycler 
                      statuses={
                        agent.id === 'technocrat' ? ["Parsing logic...", "Running models...", "Scoring confidence..."] :
                        agent.id === 'humanist' ? ["Reading ethics...", "Weighing impact...", "Forming opinion..."] :
                        ["Questioning premise...", "Probing risks...", "Finding gaps..."]
                      } 
                      interval={2500}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 4. Overlay UI */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div 
            className={`top-query-pill ${phase === 5 ? 'resolved' : ''}`}
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              x: "-50%",
              boxShadow: phase === 5 ? '0 0 12px rgba(251,191,36,0.2)' : 'none'
            }}
            style={{ left: "50%" }}
          >
            <span className="query-pill-label">QUERY</span>
            <span className="query-pill-text">{query}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase >= 4 && (
          <motion.div 
            className="tension-meter-overlay"
            initial={{ opacity: 0, x: "-50%" }}
            animate={{ opacity: 1, x: "-50%" }}
            style={{ left: "50%" }}
          >
            <TensionMeter active={true} isResolved={phase === 5} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 5 && result && (
          <>
            <motion.div
              className="verdict-card"
              initial={{ opacity: 0, y: 40, scale: 0.96, x: '-50%' }}
              animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
              transition={{ 
                duration: 0.7, 
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1]
              }}
              style={{ left: '50%', top: "calc(45% + 60px)" }}
            >
              <div className="verdict-top-accent" />
              <div className="res-header">PARLIAMENTARY SYNTHESIS</div>
              <div className="res-body">
                <TypewriterText text={result} />
                
                <div className="attribution-chips">
                  {AGENTS.map((agent, i) => (
                    <motion.div
                      key={agent.id}
                      className="attribution-pill"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 + (i * 0.1) }}
                      style={{ 
                        color: agent.color,
                        background: `${agent.color}15`,
                        border: `1px solid ${agent.color}30`
                      }}
                    >
                      {agent.id === 'technocrat' ? '⚙' : agent.id === 'humanist' ? '♥' : '?'} {agent.name}
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="res-footer">SESSION CONCLUDED</div>
            </motion.div>

            <motion.button
              className="reset-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={resetStore}
            >
              [ NEW QUERY ]
            </motion.button>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .graph-root {
          position: relative;
          width: 100%;
          height: 100vh;
          background: #0a0a0a;
          overflow: hidden;
          color: white;
          font-family: var(--font-ui);
        }

        .ambient-breath {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(56, 189, 248, 0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .graph-lines-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
          overflow: visible;
        }

        .nodes-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 20;
        }

        .p-node {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          pointer-events: auto;
        }

        .judge-node {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          z-index: 30;
        }

        .agent-node {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          z-index: 25;
        }

        .node-core {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .node-label {
          position: absolute;
          bottom: -28px;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .judge-label { color: var(--color-judge); }

        .rotating-arc-border {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: white;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .equalizer {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .eq-bar { width: 2px; background: white; border-radius: 1px; }

        .node-status-sub {
          position: absolute;
          bottom: -44px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          white-space: nowrap;
        }

        .agent-status-pill {
          position: absolute;
          bottom: -52px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 99px;
          font-size: 10px;
          white-space: nowrap;
          color: rgba(255,255,255,0.8);
        }

        .top-query-pill {
          position: absolute;
          top: 32px;
          left: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 99px;
          padding: 8px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          backdrop-filter: blur(8px);
          z-index: 100;
        }

        .query-pill-label {
          font-size: 9px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.1em;
        }

        .query-pill-text { font-size: 13px; color: white; }

        .tension-meter-overlay {
          position: absolute;
          top: 88px;
          left: 50%;
          width: 320px;
          z-index: 100;
        }

        .tension-container { width: 100%; display: flex; flex-direction: column; gap: 4px; }
        .tension-header { display: flex; justify-content: space-between; font-size: 8px; color: rgba(255,255,255,0.5); }
        .tension-bar-bg { width: 100%; height: 2px; background: rgba(255,255,255,0.1); border-radius: 1px; }
        .tension-bar-fill { height: 100%; border-radius: 1px; }

        .judge-node.expanded {
          background: rgba(255, 255, 255, 0.12);
        }

        .solid-glow-border {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 15px white;
        }

        .verdict-icon {
          font-family: var(--font-serif);
          font-size: 32px;
          color: white;
          font-weight: 300;
        }

        .verdict-label {
          color: white;
          opacity: 1;
        }

        .radial-burst {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .burst-line {
          position: absolute;
          width: 1px;
          height: 100px;
          background: linear-gradient(to top, transparent, white, transparent);
          transform-origin: center;
        }

        .top-query-pill.resolved {
          border-color: rgba(251, 191, 36, 0.3);
        }

        .verdict-card {
          position: absolute;
          width: 560px;
          max-width: 88vw;
          padding: 28px 32px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 20px;
          z-index: 200;
          overflow: hidden;
        }

        .verdict-top-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #38bdf8;
        }

        .res-header {
          font-size: 8px;
          font-family: var(--font-mono);
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.3em;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 8px;
        }

        .res-body { 
          font-size: 14px; 
          line-height: 1.8; 
          color: white;
          font-family: var(--font-mono);
        }

        .attribution-chips {
          display: flex;
          gap: 8px;
          margin-top: 24px;
        }

        .attribution-pill {
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          backdrop-filter: blur(8px);
        }

        .res-footer {
          margin-top: 24px;
          font-size: 8px;
          font-family: var(--font-mono);
          color: rgba(255,255,255,0.3);
          text-align: right;
          letter-spacing: 0.2em;
        }

        .reset-btn {
          position: absolute;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: white;
          font-size: 10px;
          font-variant: all-small-caps;
          letter-spacing: 0.2em;
          padding: 6px 16px;
          border-radius: 99px;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 300;
          pointer-events: auto;
        }

        .reset-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.3);
        }
      `}} />
    </div>
  );
};
