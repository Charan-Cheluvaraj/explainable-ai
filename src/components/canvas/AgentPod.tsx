/**
 * AgentPod.tsx — Fractal Soul Edition (Task 2.3)
 *
 * Each agent is rendered via a GPU raymarcher (CognitionShader).
 * The SDF changes geometry per agent identity.
 * uTension drives fractal complexity.
 * uConverge triggers Consensus Bloom (three → one white solid).
 */

import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import type { AgentStatus } from '../../store/useCognitionStore';
import { useCognitionStore } from '../../store/useCognitionStore';
import { AGENT_COLORS } from '../../hooks/useTensionMotion';
import { CognitionShaderMaterial } from '../../shaders/CognitionShader';

// Register as JSX element
extend({ CognitionShaderMaterial });

// Augment JSX namespace
declare module '@react-three/fiber' {
  interface ThreeElements {
    cognitionShaderMaterial: any;
  }
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type AgentName = 'technocrat' | 'humanist' | 'inquisitor';

interface AgentPodProps {
  agent: AgentName;
  status: AgentStatus;
  confidence: number;
  hasViolation: boolean;
  position: [number, number, number];
  podRef: React.RefObject<THREE.Mesh | null>;
}

const AGENT_TYPE_MAP: Record<AgentName, number> = {
  technocrat: 0,
  humanist:   1,
  inquisitor: 2,
};

// ─────────────────────────────────────────────────────────────
// Geometry Config
// ─────────────────────────────────────────────────────────────
const SPHERE_GEO = new THREE.SphereGeometry(1, 48, 48);

// ─────────────────────────────────────────────────────────────
// AgentPod Component
// ─────────────────────────────────────────────────────────────
export function AgentPod({
  agent,
  status,
  confidence,
  hasViolation,
  position,
  podRef,
}: AgentPodProps) {
  const matRef    = useRef<InstanceType<typeof CognitionShaderMaterial>>(null);
  const lightRef  = useRef<THREE.PointLight>(null);
  const groupRef  = useRef<THREE.Group>(null);

  const baseColor = useMemo(() => new THREE.Color(AGENT_COLORS[agent]), [agent]);
  const agentType = AGENT_TYPE_MAP[agent];

  // Inverse model matrix passed to shader for ray reconstruction
  const invModelMatrix = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ clock }, delta) => {
    if (!matRef.current || !groupRef.current) return;

    const t = clock.elapsedTime;

    // Pull live store values each frame (zero re-render cost)
    const { tensionVariance, round, isDebating } = useCognitionStore.getState();

    // uTension: clamp tensionVariance 0→1
    const tension = Math.min(tensionVariance / 0.4, 1.0);
    // uConverge: Judge is round 3 and currently debating
    const converge = isDebating && round === 3 ? Math.min((t % 4) / 4, 1.0) : 0.0;

    // Update shader uniforms
    matRef.current.uTime    = t;
    matRef.current.uTension = tension + (hasViolation ? 0.3 : 0.0);
    matRef.current.uConverge = converge;

    // Inverse model matrix for correct ray-casting
    invModelMatrix.copy(groupRef.current.matrixWorld).invert();
    matRef.current.uInvModelMatrix = invModelMatrix;

    // Crisis pulse on color
    if (hasViolation) {
      const corruptAmount = 0.3 + 0.3 * Math.sin(t * 15.0);
      matRef.current.uColor.lerpColors(
        baseColor,
        new THREE.Color(0xff2200),
        corruptAmount
      );
    } else {
      matRef.current.uColor.lerpColors(
        matRef.current.uColor,
        baseColor,
        delta * 4
      );
    }

    // Internal point-light: fluctuates with thinking status
    if (lightRef.current) {
      const targetIntensity =
        status === 'idle'     ? 0.4 :
        status === 'thinking' ? 1.5 + Math.sin(t * 8) * 0.5 :
        status === 'speaking' ? 2.0 + confidence * 1.0 :
                                0.1;
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity, targetIntensity, delta * 5
      );
      lightRef.current.color.lerpColors(
        lightRef.current.color,
        converge > 0.5 ? new THREE.Color(0xffffff) : baseColor,
        delta * 3
      );
    }

    // Convergence: pods physically attract toward (0,0,0)
    if (converge > 0 && groupRef.current) {
      groupRef.current.position.lerp(new THREE.Vector3(0, 0, 0), delta * converge * 1.5);
    } else if (groupRef.current) {
      // Restore to original position
      const target = new THREE.Vector3(...position);
      groupRef.current.position.lerp(target, delta * 2);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Internal glow light — lives inside the fractal */}
      <pointLight
        ref={lightRef}
        color={baseColor}
        intensity={0.4}
        distance={3.5}
        decay={2}
      />

      {/* Raymarched fractal pod */}
      <mesh
        ref={podRef as React.RefObject<THREE.Mesh>}
        geometry={SPHERE_GEO}
        name={`Pod_${agent}`}
      >
        <cognitionShaderMaterial
          ref={matRef}
          key={CognitionShaderMaterial.key}
          uTime={0}
          uTension={0}
          uAgentType={agentType}
          uColor={baseColor}
          uConverge={0}
          uInvModelMatrix={invModelMatrix}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}
