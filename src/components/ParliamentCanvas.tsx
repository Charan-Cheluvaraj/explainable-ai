import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCognitionStore } from '../store/useCognitionStore';

interface ParliamentCanvasProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

// ── Critique Packet Component ────────────────────────────────
const CritiquePacket = ({ from, to, color, delay }: { from: {x: number, y: number}, to: {x: number, y: number}, color: string, delay: number }) => (
  <motion.div
    className="absolute w-1.5 h-1.5 rounded-full z-50"
    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
    initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 0 }}
    animate={{ 
      left: [`${from.x}%`, `${to.x}%`],
      top: [`${from.y}%`, `${to.y}%`],
      opacity: [0, 1, 1, 0],
      scale: [0.5, 1, 1, 0.5]
    }}
    transition={{ 
      duration: 1.2, 
      delay, 
      repeat: Infinity, 
      ease: "easeInOut",
      repeatDelay: Math.random() * 2
    }}
  />
);

export const ParliamentCanvas: React.FC<ParliamentCanvasProps> = ({ isVisible, onAnimationComplete }) => {
  const { debatePhase, visualState, tensionVariance } = useCognitionStore();
  
  // Local phase for initial intro
  const [introPhase, setIntroPhase] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setIntroPhase(1);
      const t1 = setTimeout(() => setIntroPhase(2), 700);
      const t2 = setTimeout(() => setIntroPhase(3), 1100);
      const t3 = setTimeout(() => {
        setIntroPhase(4);
        onAnimationComplete?.();
      }, 1700);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setIntroPhase(0);
    }
  }, [isVisible, onAnimationComplete]);

  // Positions for nodes (%)
  const positions = {
    judge: { x: 50, y: 50 },
    technocrat: { x: 25, y: 30 },
    humanist: { x: 75, y: 30 },
    inquisitor: { x: 50, y: 75 },
  };

  const packets = useMemo(() => [
    { from: positions.technocrat, to: positions.humanist, color: '#38bdf8', delay: 0 },
    { from: positions.humanist, to: positions.inquisitor, color: '#fb7185', delay: 0.4 },
    { from: positions.inquisitor, to: positions.technocrat, color: '#fbbf24', delay: 0.8 },
    { from: positions.technocrat, to: positions.inquisitor, color: '#38bdf8', delay: 1.2 },
    { from: positions.humanist, to: positions.technocrat, color: '#fb7185', delay: 1.6 },
  ], []);

  if (!isVisible) return null;

  const isBrawling = debatePhase === 'brawl';

  return (
    <div className="canvas-root" key="parliament-canvas-v3">
      <svg className="canvas-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Connecting Lines */}
        <AnimatePresence>
          {introPhase >= 3 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.line
                x1="50" y1="50" x2="25" y2="30"
                stroke={isBrawling ? "rgba(56, 189, 248, 0.4)" : "rgba(255,255,255,0.2)"}
                strokeWidth={isBrawling ? "0.6" : "0.4"}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <motion.line
                x1="50" y1="50" x2="75" y2="30"
                stroke={isBrawling ? "rgba(251, 113, 133, 0.4)" : "rgba(255,255,255,0.2)"}
                strokeWidth={isBrawling ? "0.6" : "0.4"}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <motion.line
                x1="50" y1="50" x2="50" y2="75"
                stroke={isBrawling ? "rgba(251, 191, 36, 0.4)" : "rgba(255,255,255,0.2)"}
                strokeWidth={isBrawling ? "0.6" : "0.4"}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Intro Travel Orb */}
      <AnimatePresence>
        {introPhase === 1 && (
          <motion.div
            className="travel-orb"
            initial={{ left: '50%', top: '90%', scale: 0 }}
            animate={{ 
              left: ['50%', '40%', '50%'],
              top: ['90%', '70%', '50%'],
              scale: [0.5, 1.5, 1],
              opacity: [0, 1, 1]
            }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Brawl Critique Packets */}
      <AnimatePresence>
        {isBrawling && packets.map((p, i) => (
          <CritiquePacket key={i} {...p} />
        ))}
      </AnimatePresence>

      {/* The Judge Node */}
      <AnimatePresence>
        {introPhase >= 2 && (
          <motion.div
            className={`node judge-node ${visualState.toLowerCase()}`}
            initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            style={{ left: '50%', top: '50%' }}
          >
            <div className="node-glass" />
            <span className="node-label">JUDGE</span>
            
            {(introPhase === 2 || debatePhase === 'synthesis') && (
              <motion.div
                className="burst-ring"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.8, repeat: debatePhase === 'synthesis' ? Infinity : 0 }}
              />
            )}

            {introPhase >= 4 && (
              <div className="node-status">
                {debatePhase === 'grounding' ? 'GROUNDING...' :
                 debatePhase === 'round1' ? 'DELIBERATING...' :
                 debatePhase === 'brawl' ? 'THE BRAWL...' :
                 debatePhase === 'synthesis' ? 'SYNTHESIZING...' : 'FINALIZING...'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Nodes */}
      <AnimatePresence>
        {introPhase >= 3 && (
          <>
            <motion.div
              className={`node agent-node ${debatePhase === 'round1' || isBrawling ? 'active' : ''}`}
              initial={{ left: '50%', top: '50%', scale: 0, x: '-50%', y: '-50%' }}
              animate={{ left: '25%', top: '30%', scale: 1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="node-glass" style={{ borderColor: '#38bdf8' }} />
              <div className="agent-glow" style={{ background: '#38bdf8' }} />
              <span className="node-label">TECHNOCRAT</span>
              {(introPhase >= 4 && debatePhase !== 'reveal') && <div className="spinner" />}
            </motion.div>

            <motion.div
              className={`node agent-node ${debatePhase === 'round1' || isBrawling ? 'active' : ''}`}
              initial={{ left: '50%', top: '50%', scale: 0, x: '-50%', y: '-50%' }}
              animate={{ left: '75%', top: '30%', scale: 1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="node-glass" style={{ borderColor: '#fb7185' }} />
              <div className="agent-glow" style={{ background: '#fb7185' }} />
              <span className="node-label">HUMANIST</span>
              {(introPhase >= 4 && debatePhase !== 'reveal') && <div className="spinner" />}
            </motion.div>

            <motion.div
              className={`node agent-node ${debatePhase === 'round1' || isBrawling ? 'active' : ''}`}
              initial={{ left: '50%', top: '50%', scale: 0, x: '-50%', y: '-50%' }}
              animate={{ left: '50%', top: '75%', scale: 1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="node-glass" style={{ borderColor: '#fbbf24' }} />
              <div className="agent-glow" style={{ background: '#fbbf24' }} />
              <span className="node-label">INQUISITOR</span>
              {(introPhase >= 4 && debatePhase !== 'reveal') && <div className="spinner" />}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .canvas-root {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 200;
        }
        .canvas-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .node {
          position: absolute;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.5s ease;
        }
        .node-glass {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .node-label {
          position: absolute;
          bottom: -28px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: white;
          text-transform: uppercase;
          white-space: nowrap;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .judge-node {
          width: 90px;
          height: 90px;
        }
        .judge-node.warning .node-glass { border-color: #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); }
        .judge-node.crisis .node-glass { border-color: #fb7185; box-shadow: 0 0 30px rgba(251, 113, 133, 0.3); }
        
        .node-status {
          position: absolute;
          bottom: -44px;
          font-size: 8px;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.3em;
          animation: pulse-text 2s infinite;
          white-space: nowrap;
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .travel-orb {
          position: absolute;
          width: 18px;
          height: 18px;
          background: #f59e0b;
          border-radius: 50%;
          box-shadow: 0 0 25px #f59e0b, 0 0 50px rgba(245, 158, 11, 0.6);
          z-index: 210;
        }
        .burst-ring {
          position: absolute;
          inset: -10px;
          border: 1.5px solid white;
          border-radius: 50%;
        }
        .agent-glow {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          opacity: 0;
          filter: blur(12px);
          transition: opacity 0.5s ease;
        }
        .agent-node.active .agent-glow {
          opacity: 0.2;
        }
        .agent-node {
          width: 55px;
          height: 55px;
        }
        .spinner {
          position: absolute;
          inset: -4px;
          border: 1.5px solid transparent;
          border-top-color: rgba(255,255,255,0.5);
          border-radius: 50%;
          animation: spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

