/**
 * NeuralSplit.tsx — The Cinematic "Neural Split" Animation Component
 *
 * Implements the 3-phase injection sequence:
 *   Phase 1 "Injection"  : Animated beam traces from the prompt bar to the Logic Core
 *   Phase 2 "Split"      : Logic Core morphs and splits into 3 agent + 1 judge nodes
 *   Phase 3 "Resonance"  : Agent nodes micro-vibrate while Ollama is reasoning
 *
 * Design tokens: OKLCH-based color palette for premium rendering
 * Animation engine: Framer Motion (layout + SVG motion paths + spring physics)
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// OKLCH Design Tokens (Taste-inspired premium palette)
// ─────────────────────────────────────────────────────────────
const TOKENS = {
  // Primary logic blue — OKLCH(0.65 0.18 245)
  logicCore:    'oklch(0.65 0.18 245)',
  logicGlow:    'oklch(0.65 0.18 245 / 0.35)',
  // Agent colors
  technocrat:   'oklch(0.72 0.16 210)',  // Cool blue
  humanist:     'oklch(0.72 0.16 340)',  // Rose
  inquisitor:   'oklch(0.72 0.16 60)',   // Amber
  judge:        'oklch(0.92 0.02 0)',    // Near-white
  // Beam
  beamColor:    'oklch(0.85 0.12 245)',
  beamGlow:     'oklch(0.85 0.12 245 / 0.6)',
  // Surfaces
  nodeBg:       'oklch(0.12 0.02 245 / 0.85)',
  nodeBorder:   'oklch(0.35 0.08 245 / 0.5)',
};

const AGENT_CONFIG = [
  { id: 'technocrat',  label: 'TECHNOCRAT',  color: TOKENS.technocrat,  icon: '⚙', x: -180, y: 80 },
  { id: 'humanist',    label: 'HUMANIST',    color: TOKENS.humanist,    icon: '♡', x:  180, y: 80 },
  { id: 'inquisitor',  label: 'INQUISITOR',  color: TOKENS.inquisitor,  icon: '?', x:  0,   y: -200 },
] as const;

// ─────────────────────────────────────────────────────────────
// Animated Beam — SVG motion path from source to target
// ─────────────────────────────────────────────────────────────

interface BeamProps {
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLElement | null>;
  active: boolean;
  onComplete: () => void;
}

export const AnimatedBeam: React.FC<BeamProps> = ({ fromRef, toRef, active, onComplete }) => {
  const [path, setPath] = useState('');
  const [dotPos, setDotPos] = useState({ x: 0, y: 0 });
  const progress = useMotionValue(0);
  const smoothProgress = useSpring(progress, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (!active || !fromRef.current || !toRef.current) return;

    const fromRect = fromRef.current.getBoundingClientRect();
    const toRect   = toRef.current.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2;
    const y1 = fromRect.top  + fromRect.height / 2;
    const x2 = toRect.left   + toRect.width  / 2;
    const y2 = toRect.top    + toRect.height / 2;

    // Cubic bezier: control point lifts up for an arc feel
    const cp1x = x1;
    const cp1y = y1 - (Math.abs(y2 - y1) * 0.5);
    const cp2x = x2;
    const cp2y = y2 + (Math.abs(y2 - y1) * 0.2);

    setPath(`M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);

    // Animate the "data packet" dot along the path
    let start: number | null = null;
    const duration = 1200;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(elapsed / duration, 1);

      // Cubic ease-in-out
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Evaluate cubic bezier position
      const mt = 1 - eased;
      const px = mt*mt*mt*x1 + 3*mt*mt*eased*cp1x + 3*mt*eased*eased*cp2x + eased*eased*eased*x2;
      const py = mt*mt*mt*y1 + 3*mt*mt*eased*cp1y + 3*mt*eased*eased*cp2y + eased*eased*eased*y2;
      setDotPos({ x: px, y: py });

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [active]);

  if (!active || !path) return null;

  return (
    <svg
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'visible',
      }}
    >
      {/* Beam trail */}
      <motion.path
        d={path}
        fill="none"
        stroke={TOKENS.beamColor}
        strokeWidth="2"
        strokeDasharray="8 6"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.8, 0.4] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 6px ${TOKENS.beamGlow})` }}
      />
      {/* Data packet dot */}
      <motion.circle
        cx={dotPos.x}
        cy={dotPos.y}
        r={5}
        fill={TOKENS.beamColor}
        style={{ filter: `drop-shadow(0 0 10px ${TOKENS.beamColor})` }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.5, 1] }}
        transition={{ duration: 0.2 }}
      />
      {/* Trailing glow */}
      <motion.circle
        cx={dotPos.x}
        cy={dotPos.y}
        r={12}
        fill={`${TOKENS.beamGlow}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Micro-Vibration Hook (for "Thinking" agent nodes)
// ─────────────────────────────────────────────────────────────

function useVibration(active: boolean) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (!active) {
      x.set(0);
      y.set(0);
      return;
    }

    let raf: number;
    let t = 0;
    const amp = 1.2;
    const freq = 28; // Hz — high-frequency micro-vibration

    const tick = () => {
      t += 0.016;
      x.set(Math.sin(t * freq) * amp);
      y.set(Math.cos(t * freq * 1.3) * amp * 0.6);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, x, y]);

  return { x, y };
}

// ─────────────────────────────────────────────────────────────
// Agent Node with Micro-Vibration
// ─────────────────────────────────────────────────────────────

interface AgentNodeProps {
  id: string;
  label: string;
  color: string;
  icon: string;
  xOff: number;
  yOff: number;
  isThinking: boolean;
  phase: number;
}

const AgentNode: React.FC<AgentNodeProps> = ({ label, color, icon, xOff, yOff, isThinking, phase }) => {
  const { x: vx, y: vy } = useVibration(isThinking);

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        x: vx,
        y: vy,
        translateX: `calc(-50% + ${xOff}px)`,
        translateY: `calc(-50% + ${yOff}px)`,
      }}
      initial={{ scale: 0, opacity: 0, translateX: '-50%', translateY: '-50%' }}
      animate={{
        scale: phase === 5 ? 0 : 1,
        opacity: phase === 5 ? 0 : 1,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
    >
      {/* Scanning ring when thinking */}
      {isThinking && (
        <motion.div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            opacity: 0.6,
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Node circle */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: TOKENS.nodeBg,
          border: `1.5px solid ${color}40`,
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isThinking
            ? `0 0 20px ${color}50, inset 0 0 10px ${color}10`
            : `0 0 8px ${color}20`,
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      </div>

      {/* Scanline overlay when thinking (holographic HUD effect) */}
      {isThinking && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              ${color}08 3px,
              ${color}08 4px
            )`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: -26,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: color,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono, monospace)',
          textShadow: `0 0 8px ${color}60`,
        }}
      >
        {label}
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Logic Core — The central morphing node
// ─────────────────────────────────────────────────────────────

const LogicCore: React.FC<{
  coreRef: React.RefObject<HTMLDivElement | null>;
  phase: number;
  isSplit: boolean;
}> = ({ coreRef, phase, isSplit }) => (
  <motion.div
    ref={coreRef as React.RefObject<HTMLDivElement>}
    style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      translateX: '-50%',
      translateY: 'calc(-50% - 2px)',
      width: isSplit ? 80 : 56,
      height: isSplit ? 80 : 56,
      borderRadius: '50%',
      background: TOKENS.nodeBg,
      border: `1.5px solid ${isSplit ? TOKENS.judge : TOKENS.logicCore}60`,
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 30,
      boxShadow: isSplit
        ? `0 0 40px ${TOKENS.judge}25, 0 0 80px ${TOKENS.judge}10`
        : `0 0 20px ${TOKENS.logicGlow}, 0 0 60px ${TOKENS.logicGlow}`,
    }}
    animate={{
      scale: phase === 1 ? [1, 1.08, 1] : phase === 5 ? 1.3 : 1,
    }}
    transition={{
      scale: phase === 1
        ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
        : { type: 'spring', stiffness: 200, damping: 18 },
    }}
  >
    {/* Rotating arc border when judge is active */}
    {isSplit && phase === 4 && (
      <div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'rgba(255,255,255,0.8)',
          animation: 'neural-spin 1.8s linear infinite',
        }}
      />
    )}

    {/* Solid glow border at verdict */}
    {phase === 5 && (
      <div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 20px rgba(255,255,255,0.5)',
        }}
      />
    )}

    {/* Core icon */}
    <motion.div
      style={{ fontSize: phase === 5 ? 32 : 18, color: 'white' }}
      animate={{ opacity: 1 }}
    >
      {phase === 5 ? '§' : phase >= 2 ? '◈' : '●'}
    </motion.div>

    {/* Core label */}
    <div
      style={{
        position: 'absolute',
        bottom: -26,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: phase === 5 ? TOKENS.judge : TOKENS.logicCore,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {phase === 5 ? 'VERDICT' : isSplit ? 'JUDGE' : 'LOGIC CORE'}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// Connection Lines SVG Layer
// ─────────────────────────────────────────────────────────────

const ConnectionLines: React.FC<{ phase: number; dim: { w: number; h: number } }> = ({ phase, dim }) => {
  const cx = dim.w * 0.5;
  const cy = dim.h * 0.5 - 2;

  if (phase < 4) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'visible',
      }}
    >
      {AGENT_CONFIG.map((agent) => (
        <g key={agent.id}>
          <motion.line
            stroke={`${agent.color}30`}
            strokeWidth="1.5"
            x1={cx} y1={cy}
            x2={cx + agent.x} y2={cy + agent.y}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: phase === 5 ? 0 : 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
          {/* Data packet flowing agent → judge */}
          {phase === 4 && (
            <motion.circle
              r="3"
              fill={agent.color}
              style={{ filter: `drop-shadow(0 0 4px ${agent.color})` }}
              animate={{
                cx: [cx + agent.x, cx],
                cy: [cy + agent.y, cy],
                opacity: [0, 0.9, 0],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </g>
      ))}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Main NeuralSplit Component
// ─────────────────────────────────────────────────────────────

interface NeuralSplitProps {
  promptRef: React.RefObject<HTMLElement | null>;
  isDebating: boolean;
  debatePhase: string;
  phase: number;        // 1–5 visual phase
}

export const NeuralSplit: React.FC<NeuralSplitProps> = ({
  promptRef,
  isDebating,
  debatePhase,
  phase,
}) => {
  const coreRef   = useRef<HTMLDivElement | null>(null);
  const [beamFired, setBeamFired] = useState(false);
  const [beamDone, setBeamDone]   = useState(false);
  const [dim] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Fire beam when debate starts
  useEffect(() => {
    if (isDebating && !beamFired) {
      setBeamFired(true);
      setBeamDone(false);
    }
    if (!isDebating) {
      setBeamFired(false);
      setBeamDone(false);
    }
  }, [isDebating, beamFired]);

  const isSplit    = phase >= 2;
  const isThinking = isDebating && (debatePhase === 'round1' || debatePhase === 'brawl');

  return (
    <>
      {/* Animated beam from prompt → logic core */}
      <AnimatePresence>
        {beamFired && !beamDone && (
          <AnimatedBeam
            fromRef={promptRef}
            toRef={coreRef}
            active={beamFired && !beamDone}
            onComplete={() => setBeamDone(true)}
          />
        )}
      </AnimatePresence>

      {/* Ambient vortex glow */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${TOKENS.logicGlow} 0%, transparent 55%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
        animate={{ opacity: phase === 5 ? [0.4, 0.7, 0.4] : [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Connection lines */}
      <ConnectionLines phase={phase} dim={dim} />

      {/* Logic Core / Judge */}
      <LogicCore coreRef={coreRef} phase={phase} isSplit={isSplit} />

      {/* Agent nodes (appear at phase 3) */}
      <AnimatePresence>
        {phase >= 3 && AGENT_CONFIG.map((agent) => (
          <AgentNode
            key={agent.id}
            id={agent.id}
            label={agent.label}
            color={agent.color}
            icon={agent.icon}
            xOff={agent.x}
            yOff={agent.y}
            isThinking={isThinking}
            phase={phase}
          />
        ))}
      </AnimatePresence>

      {/* Global keyframes */}
      <style>{`
        @keyframes neural-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
