import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParliamentCanvasProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

export const ParliamentCanvas: React.FC<ParliamentCanvasProps> = ({ isVisible, onAnimationComplete }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setPhase(1);
      
      const t1 = setTimeout(() => setPhase(2), 700);
      const t2 = setTimeout(() => setPhase(3), 1100);
      const t3 = setTimeout(() => {
        setPhase(4);
        onAnimationComplete?.();
      }, 1700);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setPhase(0);
    }
  }, [isVisible, onAnimationComplete]);

  if (!isVisible) return null;

  return (
    <div className="canvas-root" key="parliament-canvas-v2">
      <svg className="canvas-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Phase 3 & 4: Connecting Lines */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.line
                x1="50" y1="50" x2="25" y2="30"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <motion.line
                x1="50" y1="50" x2="75" y2="30"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <motion.line
                x1="50" y1="50" x2="50" y2="75"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Phase 1: The Travelling Orb (Curved path via keyframes) */}
      <AnimatePresence>
        {phase === 1 && (
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

      {/* Phase 2+: The Judge Node */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            className="node judge-node"
            initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            style={{ left: '50%', top: '50%' }}
          >
            <div className="node-glass" />
            <span className="node-label">JUDGE</span>
            
            {phase === 2 && (
              <motion.div
                className="burst-ring"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}

            {phase >= 4 && (
              <div className="node-status">ANALYSING...</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3+: Agent Nodes */}
      <AnimatePresence>
        {phase >= 3 && (
          <>
            <motion.div
              className="node agent-node"
              initial={{ left: '50%', top: '50%', scale: 0, x: '-50%', y: '-50%' }}
              animate={{ left: '25%', top: '30%', scale: 1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="node-glass" style={{ borderColor: '#38bdf8' }} />
              <div className="agent-glow" style={{ background: '#38bdf8' }} />
              <span className="node-label">TECHNOCRAT</span>
              {phase >= 4 && <div className="spinner" />}
            </motion.div>

            <motion.div
              className="node agent-node"
              initial={{ left: '50%', top: '50%', scale: 0, x: '-50%', y: '-50%' }}
              animate={{ left: '75%', top: '30%', scale: 1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="node-glass" style={{ borderColor: '#fb7185' }} />
              <div className="agent-glow" style={{ background: '#fb7185' }} />
              <span className="node-label">HUMANIST</span>
              {phase >= 4 && <div className="spinner" />}
            </motion.div>

            <motion.div
              className="node agent-node"
              initial={{ left: '50%', top: '50%', scale: 0, x: '-50%', y: '-50%' }}
              animate={{ left: '50%', top: '75%', scale: 1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="node-glass" style={{ borderColor: '#fbbf24' }} />
              <div className="agent-glow" style={{ background: '#fbbf24' }} />
              <span className="node-label">INQUISITOR</span>
              {phase >= 4 && <div className="spinner" />}
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
        .node-status {
          position: absolute;
          bottom: -44px;
          font-size: 8px;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.3em;
          animation: pulse-text 2s infinite;
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
          opacity: 0.2;
          filter: blur(12px);
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
