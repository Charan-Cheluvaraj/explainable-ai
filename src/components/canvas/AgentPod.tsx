/**
 * AgentPod.tsx — A single living fractal organism in the Parliament.
 *
 * Each agent is NOT a card or a panel — it's a mathematical shape whose
 * geometry, emission, and vibration all encode cognitive state.
 *
 * Technocrat: icosahedron  (crystalline logic)
 * Humanist:   torus knot   (organic branching)
 * Inquisitor: octahedron   (unstable sharp edges)
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentStatus } from '../../store/useCognitionStore';
import { AGENT_COLORS } from '../../hooks/useTensionMotion';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type AgentName = 'technocrat' | 'humanist' | 'inquisitor';

interface AgentPodProps {
  agent: AgentName;
  status: AgentStatus;
  confidence: number;   // 0.0–1.0 — drives glow emission strength
  hasViolation: boolean; // triggers geometry corruption shader
  position: [number, number, number];
  podRef: React.RefObject<THREE.Mesh | null>;
}

// ─────────────────────────────────────────────────────────────
// Geometry Config per Agent
// ─────────────────────────────────────────────────────────────

const GEOMETRY_CONFIG: Record<AgentName, React.ReactNode> = {
  technocrat: <icosahedronGeometry args={[1, 1]} />,
  humanist:   <torusKnotGeometry args={[0.7, 0.25, 100, 16]} />,
  inquisitor: <octahedronGeometry args={[1, 0]} />,
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function AgentPod({
  agent,
  status,
  confidence,
  hasViolation,
  position,
  podRef,
}: AgentPodProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const color = new THREE.Color(AGENT_COLORS[agent]);

  // Distortion factor: violation → strong mesh corruption
  const distortFactor = hasViolation ? 0.8 : status === 'thinking' ? 0.25 : 0.05;

  // Emission intensity drives "active" glow
  const emissiveIntensity = status === 'idle' ? 0.3 : confidence * 2.2;

  useFrame((_, delta) => {
    if (!matRef.current) return;
    // Smoothly animate emission on status changes
    matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
      matRef.current.emissiveIntensity,
      emissiveIntensity,
      delta * 3
    );
  });

  return (
    <mesh
      ref={podRef as React.RefObject<THREE.Mesh>}
      position={position}
      name={`Pod_${agent.charAt(0).toUpperCase() + agent.slice(1)}`}
    >
      {GEOMETRY_CONFIG[agent]}
      <MeshDistortMaterial
        ref={matRef as any}
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        distort={distortFactor}
        speed={hasViolation ? 8 : status === 'thinking' ? 3 : 0.5}
        roughness={0.1}
        metalness={0.8}
        transparent
        opacity={status === 'idle' ? 0.7 : 1.0}
      />
    </mesh>
  );
}
