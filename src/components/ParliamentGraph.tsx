import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParliamentGraphProps {
  query: string;
  isDebating: boolean;
  result?: string;
}

const AGENTS = [
  { id: 'technocrat', name: 'TECHNOCRAT', color: 'var(--color-logic)', x: -200, y: 0 },
  { id: 'humanist', name: 'HUMANIST', color: 'var(--color-ethics)', x: 200, y: -80 },
  { id: 'inquisitor', name: 'INQUISITOR', color: 'var(--color-risk)', x: 200, y: 80 },
];

const JUDGE_TOP = '200px';

// rAF-synchronized Typewriter
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(text);
  const indexRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    textRef.current = text;
    indexRef.current = 0;
    setDisplayedText('');

    const animate = () => {
      if (indexRef.current < textRef.current.length) {
        indexRef.current += 1; // Adjust speed by incrementing more if needed
        setDisplayedText(textRef.current.substring(0, indexRef.current));
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text]);

  return <span>{displayedText}</span>;
};

export const ParliamentGraph: React.FC<ParliamentGraphProps> = ({ query, isDebating, result }) => {
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 600); 
    const t2 = setTimeout(() => setPhase(3), 1200); 
    const t3 = setTimeout(() => setPhase(4), 1800);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (!isDebating && result && phase === 4) {
      setPhase(5);
    }
  }, [isDebating, result, phase]);

  return (
    <div className="graph-container">
      {/* Persistent Query Pill at top */}
      <motion.div
        className="query-pill micro-border"
        initial={{ opacity: 0, top: '50%', x: '-50%', y: '-50%' }}
        animate={{ 
          top: '40px', 
          opacity: phase >= 2 ? 1 : 0,
          scale: 0.85
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // Spring Snappy
      >
        <span className="query-label text-[var(--text-muted)]">QUERY</span>
        <span className="query-text text-[var(--text-primary)]">{query}</span>
      </motion.div>

      {/* BRANCHING BEAMS LAYER */}
      <div className="animation-layer" style={{ zIndex: 1000 }}>
        <svg className="graph-svg">
          {phase === 1 && (
            <motion.line
              x1="50%" y1="calc(100% - 100px)" x2="50%" y2={JUDGE_TOP}
              stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeDasharray="12 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 12px white)" }}
            />
          )}

          {phase === 2 && (
            <>
              {AGENTS.map((agent) => (
                <motion.line
                  key={`split-beam-${agent.id}`}
                  x1="50%" y1={JUDGE_TOP}
                  x2={`calc(50% + ${agent.x}px)`} y2={`calc(${JUDGE_TOP} + ${agent.y}px)`}
                  stroke={agent.color} strokeWidth="3" strokeDasharray="12 6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 12px ${agent.color})` }}
                />
              ))}
            </>
          )}
        </svg>
      </div>

      <div className="graph-stage">
        <svg className="graph-svg">
          <AnimatePresence>
            {phase >= 4 && phase < 5 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {AGENTS.map((agent) => (
                  <motion.line
                    key={agent.id}
                    x1="50%" y1={JUDGE_TOP}
                    x2={`calc(50% + ${agent.x}px)`} y2={`calc(${JUDGE_TOP} + ${agent.y}px)`}
                    stroke="var(--surface-border)" strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        <div className="nodes-layer">
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                className={`node judge-node ${phase === 5 ? 'expanded' : ''}`}
                initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }} // Elastic String-like resonance
                style={{ left: '50%', top: JUDGE_TOP }}
              >
                <div className="node-ring micro-border" style={{ boxShadow: 'inset 0 0 20px var(--color-judge)' }} />
                <div className="node-content">
                  <span className="node-label text-[var(--color-judge)]">JUDGE</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase >= 3 && phase < 5 && (
              <>
                {AGENTS.map((agent) => (
                  <motion.div
                    key={agent.id}
                    className="node agent-node"
                    initial={{ left: '50%', top: JUDGE_TOP, scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                    animate={{ 
                      left: `calc(50% + ${agent.x}px)`, 
                      top: `calc(${JUDGE_TOP} + ${agent.y}px)`, 
                      scale: 1, opacity: 1, x: '-50%', y: '-50%'
                    }}
                    exit={{ left: '50%', top: JUDGE_TOP, scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                    transition={{ type: 'spring', bounce: 0.5, duration: 0.9, delay: phase === 3 ? 0.4 : 0 }}
                  >
                    <motion.div 
                      className="node-ring micro-border"
                      animate={{
                        boxShadow: [
                          `inset 0 0 10px transparent, 0 0 0px transparent`,
                          `inset 0 0 30px ${agent.color}, 0 0 20px ${agent.color}40`,
                          `inset 0 0 10px transparent, 0 0 0px transparent`
                        ],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                    <div className="node-content">
                      <span className="node-label" style={{ color: agent.color }}>{agent.name}</span>
                    </div>
                    
                    <div className="typing-dots">
                      <span style={{ backgroundColor: agent.color }} />
                      <span style={{ backgroundColor: agent.color }} />
                      <span style={{ backgroundColor: agent.color }} />
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 5 && result && (
              <motion.div
                className="result-card micro-border"
                initial={{ opacity: 0, y: 30, x: '-50%', scale: 0.95 }}
                animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                style={{ top: '340px', left: '50%' }}
              >
                <div className="result-header">
                  <span className="result-title text-[var(--color-logic)]">PARLIAMENTARY SYNTHESIS</span>
                </div>
                <p className="result-text"><TypewriterText text={result} /></p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .graph-container {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 100;
          contain: layout paint;
        }

        .animation-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 200;
        }

        .query-pill {
          position: fixed;
          padding: 8px 20px;
          background: var(--surface-elevated);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
          pointer-events: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          z-index: 300;
          will-change: transform, opacity;
        }

        .query-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .query-text {
          font-size: 13px;
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .graph-stage {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .graph-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .nodes-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .node {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        .node-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(10,10,10,0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .judge-node {
          width: 80px;
          height: 80px;
          z-index: 10;
        }

        .judge-node.expanded {
          top: 15% !important;
          transition: all 0.8s var(--spring-snappy);
        }

        .agent-node {
          width: 64px;
          height: 64px;
          z-index: 5;
        }

        .node-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          position: absolute;
          bottom: -28px;
          white-space: nowrap;
          text-shadow: 0 0 10px currentColor;
        }

        .typing-dots {
          position: absolute;
          right: -36px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 4px;
        }

        .typing-dots span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          animation: bounce 1s infinite;
        }

        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }

        .result-card {
          position: absolute;
          width: 560px;
          padding: 32px;
          background: var(--surface-elevated);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border-radius: 24px;
          pointer-events: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1);
          z-index: 200;
          will-change: transform, opacity;
        }

        .result-header {
          margin-bottom: 16px;
          border-bottom: 1px solid var(--surface-border);
          padding-bottom: 12px;
        }

        .result-title {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3em;
        }

        .result-text {
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-primary);
        }
      `}} />
    </div>
  );
};
