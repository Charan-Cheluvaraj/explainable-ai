/**
 * useTensionMotion.ts — The String-Tune Resonance Engine
 *
 * Maps tensionVariance (σ²) to physical vibration mechanics for the three
 * Agent Pods. Uses requestAnimationFrame only — never Framer Motion.
 *
 * When visualState === "CRISIS", fires a chromatic aberration pulse that must
 * be picked up by the PostProcessing pass in CognitiveTheater.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Object3D } from 'three';
import { useCognitionStore, TENSION_THRESHOLDS } from '../store/useCognitionStore';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PodRefs {
  technocrat: React.RefObject<Object3D | null>;
  humanist: React.RefObject<Object3D | null>;
  inquisitor: React.RefObject<Object3D | null>;
}

export interface ResonanceState {
  frequency: number;    // Hz — how fast the pod shakes
  amplitude: number;    // world-space displacement
  chromaticPulse: number; // 0.0–1.0 — passed to postprocessing
}

// ─────────────────────────────────────────────────────────────
// Constants — tuned for "string physics" feel
// ─────────────────────────────────────────────────────────────

const BASE_FREQUENCY = 1.2;      // calm idle oscillation
const MAX_FREQUENCY  = 28.0;     // CRISIS peak
const MAX_AMPLITUDE  = 0.048;    // max pod displacement (world units)
const CRISIS_CHROMATIC_PEAK = 1.0;

// Per-agent phase offset so pods don't perfectly synchronise (more organic)
const PHASE_OFFSETS = {
  technocrat: 0,
  humanist:   Math.PI * 0.67,
  inquisitor: Math.PI * 1.33,
};

// Pod base scale — preserved during vibration
const BASE_SCALE = 1.0;

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

/**
 * Attach to the R3F Canvas context. Returns a resonance state ref for
 * the postprocessing shader to read each frame.
 */
export function useTensionMotion(pods: PodRefs): React.RefObject<ResonanceState> {
  const resonanceRef = useRef<ResonanceState>({
    frequency: BASE_FREQUENCY,
    amplitude: 0,
    chromaticPulse: 0,
  });

  const clockRef = useRef<number>(0);
  const crisisStartRef = useRef<number | null>(null);

  // Pull only the values we need — avoids whole-store re-render
  const tensionVariance = useCognitionStore((s) => s.tensionVariance);
  const visualState     = useCognitionStore((s) => s.visualState);

  // ── Derive resonance parameters from σ² ─────────────────────
  const computeResonance = useCallback((sigma2: number): ResonanceState => {
    // Normalise σ² to 0–1 across the full range (0 → CRISIS threshold × 2)
    const t = Math.min(sigma2 / (TENSION_THRESHOLDS.CRISIS * 2), 1.0);
    const frequency = BASE_FREQUENCY + t * (MAX_FREQUENCY - BASE_FREQUENCY);
    const amplitude = t * MAX_AMPLITUDE;
    const chromaticPulse = sigma2 >= TENSION_THRESHOLDS.CRISIS
      ? CRISIS_CHROMATIC_PEAK
      : t * 0.4; // subtle aberration even in WARNING
    return { frequency, amplitude, chromaticPulse };
  }, []);

  // ── Track CRISIS entry time for decay envelope ───────────────
  useEffect(() => {
    if (visualState === 'CRISIS' && crisisStartRef.current === null) {
      crisisStartRef.current = performance.now();
    } else if (visualState !== 'CRISIS') {
      crisisStartRef.current = null;
    }
  }, [visualState]);

  // ── The main per-frame mutation loop ─────────────────────────
  // This runs inside the R3F Canvas loop — direct ref mutations,
  // zero React state updates, zero re-renders.
  useFrame((_, delta) => {
    clockRef.current += delta;
    const t = clockRef.current;

    const res = computeResonance(tensionVariance);
    resonanceRef.current = res;

    const { frequency, amplitude } = res;

    // Apply string-like sinusoidal vibration to each pod
    (['technocrat', 'humanist', 'inquisitor'] as const).forEach((agent) => {
      const pod = pods[agent].current;
      if (!pod) return;

      const phase = PHASE_OFFSETS[agent];

      // Primary oscillation — XY plane shake
      const x = Math.sin(t * frequency + phase) * amplitude;
      const y = Math.cos(t * frequency * 0.7 + phase) * amplitude * 0.5;

      // Scale breathe: subtle inhale/exhale tied to frequency
      const scaleMod = 1 + Math.sin(t * frequency * 0.5 + phase) * amplitude * 2;

      pod.position.x = x;
      pod.position.y = y;
      pod.scale.setScalar(BASE_SCALE * scaleMod);

      // CRISIS: add Z-axis thrash for depth chaos
      if (visualState === 'CRISIS') {
        const z = Math.sin(t * frequency * 1.3 + phase) * amplitude * 0.8;
        pod.position.z = z;
      } else {
        pod.position.z = 0;
      }
    });
  });

  return resonanceRef;
}

// ─────────────────────────────────────────────────────────────
// Utility — get the hex color for each agent pod
// ─────────────────────────────────────────────────────────────

export const AGENT_COLORS = {
  technocrat: '#00F2FF',
  humanist:   '#FF4D8D',
  inquisitor: '#FFD700',
} as const;
