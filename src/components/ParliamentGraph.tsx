import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParliamentGraphProps {
  query: string;
  isDebating: boolean;
  result?: string;
  onComplete?: () => void;
}

const AGENTS = [
  { id: 'technocrat', name: 'TECHNOCRAT', color: '#38bdf8', x: -200, y: 0 },
  { id: 'humanist', name: 'HUMANIST', color: '#f472b6', x: 200, y: -80 },
  { id: 'inquisitor', name: 'INQUISITOR', color: '#facc15', x: 200, y: 80 },
];

const JUDGE_TOP = '200px';

export const ParliamentGraph: React.FC<ParliamentGraphProps> = ({ query, isDebating, result }) => {
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    // 0-600ms: Single beam from bottom to Judge
    const t1 = setTimeout(() => setPhase(2), 600); 
    // 600-1200ms: Three beams from Judge to Agents
    const t2 = setTimeout(() => setPhase(3), 1200); 
    // 1200ms+: Agents materialise
    const t3 = setTimeout(() => setPhase(4), 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
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
        className="query-pill"
        initial={{ opacity: 0, top: '50%', x: '-50%', y: '-50%' }}
        animate={{ 
          top: '40px', 
          opacity: phase >= 2 ? 1 : 0,
          scale: 0.85
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <span className="query-label">QUERY</span>
        <span className="query-text">{query}</span>
      </motion.div>

      {/* BRANCHING BEAMS LAYER */}
      <div className="animation-layer" style={{ zIndex: 1000 }}>
        <svg className="graph-svg">
          {/* Stage 1: Single Beam (Bottom -> Judge) */}
          {phase === 1 && (
            <motion.line
              x1="50%"
              y1="calc(100% - 100px)"
              x2="50%"
              y2={JUDGE_TOP}
              stroke="white"
              strokeWidth="3"
              strokeDasharray="12 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 12px white)" }}
            />
          )}

          {/* Stage 2: Split Beams (Judge -> Agents) */}
          {phase === 2 && (
            <>
              {AGENTS.map((agent) => (
                <motion.line
                  key={`split-beam-${agent.id}`}
                  x1="50%"
                  y1={JUDGE_TOP}
                  x2={`calc(50% + ${agent.x}px)`}
                  y2={`calc(${JUDGE_TOP} + ${agent.y}px)`}
                  stroke={agent.color}
                  strokeWidth="3"
                  strokeDasharray="12 6"
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
                    x2={`calc(50% + ${agent.x}px)`}
                    y2={`calc(${JUDGE_TOP} + ${agent.y}px)`}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6 }}
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
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                style={{ left: '50%', top: JUDGE_TOP }}
              >
                <div className="node-ring" />
                <div className="node-content">
                  <span className="node-label">JUDGE</span>
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
                      scale: 1, 
                      opacity: 1,
                      x: '-50%',
                      y: '-50%'
                    }}
                    exit={{ left: '50%', top: JUDGE_TOP, scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: phase === 3 ? 0.4 : 0 }}
                  >
                    <motion.div 
                      className="node-ring"
                      animate={{
                        boxShadow: [
                          `0 0 0px ${agent.color}00`,
                          `0 0 20px ${agent.color}40`,
                          `0 0 0px ${agent.color}00`
                        ],
                        scale: [1, 1.08, 1]
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
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
            {phase === 5 && (
              <motion.div
                className="result-card"
                initial={{ opacity: 0, y: 20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                transition={{ delay: 0.4 }}
                style={{ top: '380px', left: '50%' }}
              >
                <div className="result-header">
                  <span className="result-title">PARLIAMENTARY SYNTHESIS</span>
                </div>
                <p className="result-text">{result}</p>
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
        }

        .animation-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 200;
        }

        .firecracker-main {
          position: absolute;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 20px white, 0 0 40px rgba(255,255,255,0.5);
        }

        .fire-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
          filter: blur(10px);
        }

        .judge-blast {
          position: absolute;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, white 0%, transparent 60%);
          border: 2px solid white;
          border-radius: 50%;
        }

        .agent-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 15px currentColor;
        }

        .query-pill {
          position: fixed;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
          pointer-events: auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          z-index: 300;
        }

        .query-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
        }

        .query-text {
          font-size: 13px;
          color: white;
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
        }

        .node-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 0 15px rgba(255,255,255,0.05);
        }

        .judge-node {
          width: 72px;
          height: 72px;
          z-index: 10;
        }

        .judge-node.expanded {
          top: 15% !important;
          transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .agent-node {
          width: 56px;
          height: 56px;
          z-index: 5;
        }

        .node-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          position: absolute;
          bottom: -24px;
          white-space: nowrap;
          color: white;
        }

        .rotating-arc {
          position: absolute;
          inset: -4px;
          border: 1.5px solid transparent;
          border-top-color: rgba(255,255,255,0.4);
          border-radius: 50%;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .typing-dots {
          position: absolute;
          right: -30px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 3px;
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
          width: 520px;
          padding: 24px;
          background: rgba(15, 15, 15, 0.7);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          pointer-events: auto;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          z-index: 200;
        }

        .result-header {
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
        }

        .result-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.4);
        }

        .result-text {
          font-size: 14px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
        }
      `}} />
    </div>
  );
};
