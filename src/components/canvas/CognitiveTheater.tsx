/**
 * CognitiveTheater.tsx — The 3D Scene Root of Synapse3D
 *
 * Architecture:
 *  <Canvas> ← R3F
 *    <EffectComposer> ← @react-three/postprocessing
 *      <Bloom />
 *      <CustomChromaticPass /> ← driven by resonanceRef
 *    <Suspense>
 *      <SplineScene />         ← environment shell
 *    <AgentPod × 3 />         ← living fractal organisms
 *    <CameraRig />             ← Theatre.js choreography
 *
 * STRICT: All per-frame mutations are inside useFrame.
 * STRICT: No useEffect for motion.
 * STRICT: Spline objects are accessed via THREE object refs (mutated directly).
 */

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Stars,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

import { AgentPod } from './AgentPod';
import { useTensionMotion, type PodRefs } from '../../hooks/useTensionMotion';
import {
  useCognitionStore,
  useVisualState,
  useAgents,
  useTensionVariance,
} from '../../store/useCognitionStore';
import { CognitionGraph } from './CognitionGraph';

// ─────────────────────────────────────────────────────────────
// Camera Rig — Theatre.js choreography integration point
// Lock-on to conflicting agents on CRISIS
// ─────────────────────────────────────────────────────────────

const CAMERA_TARGETS: Record<string, THREE.Vector3> = {
  center:      new THREE.Vector3(0, 0, 6),
  technocrat:  new THREE.Vector3(-3.5, 0.5, 4),
  humanist:    new THREE.Vector3(0, 1, 3.5),
  inquisitor:  new THREE.Vector3(3.5, 0.5, 4),
  judge:       new THREE.Vector3(0, 3, 5),
};

function CameraRig() {
  const { camera } = useThree();
  const cameraTarget = useCognitionStore((s) => s.cameraTarget);
  const visualState  = useVisualState();

  const targetPos = useRef(new THREE.Vector3(0, 0, 6));
  const lerpSpeed = visualState === 'CRISIS' ? 2.5 : 0.8;

  useFrame((_, delta) => {
    const desired = CAMERA_TARGETS[cameraTarget] ?? CAMERA_TARGETS.center;
    targetPos.current.lerp(desired, delta * lerpSpeed);
    camera.position.lerp(targetPos.current, delta * lerpSpeed);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─────────────────────────────────────────────────────────────
// Dynamic Postprocessing — reads resonanceRef every frame
// ─────────────────────────────────────────────────────────────

interface PostFXProps {
  resonanceRef: React.RefObject<{ chromaticPulse: number }>;
}

function DynamicPostFX({ resonanceRef }: PostFXProps) {
  const visualState = useVisualState();
  const tensionVariance = useTensionVariance();

  // Bloom intensity scales with tension
  const bloomIntensity = 0.4 + tensionVariance * 3.0;

  // Chromatic offset vector driven by chromaticPulse
  const offsetRef = useRef(new THREE.Vector2(0, 0));

  useFrame(() => {
    const pulse = resonanceRef.current?.chromaticPulse ?? 0;
    const offset = pulse * 0.008;
    offsetRef.current.set(offset, offset * 0.6);
  });

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.3}
        luminanceSmoothing={0.9}
        blendFunction={BlendFunction.ADD}
      />
      <ChromaticAberration
        offset={offsetRef.current}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={visualState === 'CRISIS'}
        modulationOffset={0.15}
      />
      <Vignette
        darkness={visualState === 'CRISIS' ? 0.7 : 0.35}
        offset={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────────────────────
// The 3D Parliament Scene — Pods + Resonance
// ─────────────────────────────────────────────────────────────

function ParliamentScene() {
  // Pod refs — direct Object3D mutations in useFrame (no re-renders)
  const techRef = useRef<THREE.Mesh>(null);
  const humRef  = useRef<THREE.Mesh>(null);
  const inqRef  = useRef<THREE.Mesh>(null);

  const pods: PodRefs = {
    technocrat: techRef as any,
    humanist:   humRef as any,
    inquisitor: inqRef as any,
  };

  // Attach the resonance engine — returns the shared resonanceRef
  const resonanceRef = useTensionMotion(pods);

  const agents       = useAgents();
  const violations   = useCognitionStore((s) => s.violations);

  // Derive per-agent violation flag
  const hasViolation = (agent: 'technocrat' | 'humanist' | 'inquisitor') =>
    violations.some((v) => v.nodeId.toLowerCase().includes(agent));

  return (
    <>
      {/* Ambient & directional lighting */}
      <ambientLight intensity={0.1} />
      <pointLight position={[-4, 4, 4]} intensity={1.5} color="#00F2FF" />
      <pointLight position={[4, 4, 4]}  intensity={1.5} color="#FF4D8D" />
      <pointLight position={[0, -3, 4]} intensity={1.0} color="#FFD700" />

      {/* Environment for reflections */}
      <Environment preset="night" />

      {/* Background stars — depth & atmosphere */}
      <Stars radius={60} depth={30} count={3000} factor={3} fade speed={0.4} />

      {/* ── Agent Pods ── */}
      <AgentPod
        agent="technocrat"
        status={agents.technocrat}
        confidence={0.8}
        hasViolation={hasViolation('technocrat')}
        position={[-3.5, 0, 0]}
        podRef={techRef as any}
      />
      <AgentPod
        agent="humanist"
        status={agents.humanist}
        confidence={0.75}
        hasViolation={hasViolation('humanist')}
        position={[0, 0, 0]}
        podRef={humRef as any}
      />
      <AgentPod
        agent="inquisitor"
        status={agents.inquisitor}
        confidence={0.7}
        hasViolation={hasViolation('inquisitor')}
        position={[3.5, 0, 0]}
        podRef={inqRef as any}
      />

      {/* Force-directed reasoning web */}
      <CognitionGraph />

      {/* Camera choreography */}
      <CameraRig />

      {/* Postprocessing — driven by resonance state */}
      <DynamicPostFX resonanceRef={resonanceRef} />

      {/* Dev controls — remove in production */}
      <OrbitControls makeDefault enablePan={false} maxDistance={12} minDistance={3} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Public Export — The Theater Root
// ─────────────────────────────────────────────────────────────

export function CognitiveTheater() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      dpr={[1, 2]}   // sub-pixel accuracy: match device DPR up to 2×
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        <ParliamentScene />
      </Suspense>
    </Canvas>
  );
}
