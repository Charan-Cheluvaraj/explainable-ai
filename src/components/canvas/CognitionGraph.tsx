import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d';
import { useCognitionStore, useVisualState } from '../../store/useCognitionStore';
import type { LogicNode } from '../../store/useCognitionStore';
import { NeuralLinkMaterial } from '../../shaders/NeuralLinkMaterial';

const AGENT_COLORS = {
  technocrat: new THREE.Color('#00F2FF'),
  humanist: new THREE.Color('#FF4D8D'),
  inquisitor: new THREE.Color('#FFD700'),
  judge: new THREE.Color('#C4B5FD'),
};

interface SimNode extends LogicNode {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  index?: number;
}

interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  strength: number;
}

export function CognitionGraph() {
  const { cognitionGraph, hoveredNodeId, setHoveredNodeId, isDebating } = useCognitionStore();
  const visualState = useVisualState();

  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const simRef = useRef<any>(null);

  // We keep a local copy of nodes and links for d3-force-3d
  const simData = useMemo(() => {
    // If no data, provide an empty structure
    if (!cognitionGraph.nodes || cognitionGraph.nodes.length === 0) {
      return { nodes: [], links: [] };
    }
    const nodes: SimNode[] = cognitionGraph.nodes.map(n => ({ ...n }));
    const links: SimLink[] = cognitionGraph.edges.map(e => ({
      source: e.source,
      target: e.target,
      strength: e.strength
    }));
    return { nodes, links };
  }, [cognitionGraph]);

  const numNodes = simData.nodes.length;
  const numLinks = simData.links.length;

  useEffect(() => {
    if (numNodes === 0) return;

    // Initialize D3 Force 3D simulation
    const simulation = forceSimulation(simData.nodes, 3)
      .force('link', forceLink(simData.links).id((d: any) => d.id).distance(2))
      .force('charge', forceManyBody().strength(-10))
      .force('center', forceCenter(0, 0, 0))
      .stop();

    simRef.current = simulation;

    // Run simulation continuously or a few ticks if static
    // Here we let it run in useFrame
    simulation.alpha(1).restart();

    return () => simulation.stop();
  }, [simData, numNodes]);

  // Edges geometry
  const edgeGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(numLinks * 2 * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(numLinks * 2 * 2), 2));
    // Provide edge colors based on source agent
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(numLinks * 2 * 3), 3));
    
    // UVs setup
    const uvs = geo.attributes.uv.array as Float32Array;
    for (let i = 0; i < numLinks; i++) {
      uvs[i * 4 + 0] = 0; uvs[i * 4 + 1] = 0.5;
      uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = 0.5;
    }
    return geo;
  }, [numLinks]);

  // Materials and Geometries
  const sphereGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const baseMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.2,
    metalness: 0.8,
    emissiveIntensity: 0.8,
  }), []);

  // Update loop
  useFrame(({ clock }) => {
    if (!simRef.current || numNodes === 0) return;

    // Tick the simulation
    simRef.current.tick();

    const dummy = new THREE.Object3D();
    const time = clock.elapsedTime;
    
    // Update InstancedMesh (Nodes)
    if (nodesRef.current) {
      for (let i = 0; i < numNodes; i++) {
        const node = simData.nodes[i];
        
        // Use string-tune concept for "collapse" when not debating (consensus)
        // Here we just use a simple lerp for simplicity if consensus is reached
        const scale = 0.1 + (node.weight * 0.4);
        
        // If hovered, pulse size
        let finalScale = scale;
        if (node.id === hoveredNodeId) {
          finalScale = scale * (1.5 + Math.sin(time * 10) * 0.2);
        }

        dummy.position.set(node.x || 0, node.y || 0, node.z || 0);
        
        // Pull towards center if consensus (not debating but we have graph)
        if (!isDebating) {
           dummy.position.lerp(new THREE.Vector3(0,0,0), 0.05);
        }

        dummy.scale.set(finalScale, finalScale, finalScale);
        dummy.updateMatrix();
        nodesRef.current.setMatrixAt(i, dummy.matrix);

        // Update colors
        const color = AGENT_COLORS[node.agent] || new THREE.Color(0xffffff);
        const intensity = node.confidence;
        
        // Emit more if hovered
        const finalColor = color.clone().multiplyScalar(node.id === hoveredNodeId ? intensity * 2.5 : intensity);
        if (node.hasViolation && visualState === 'CRISIS') {
           // Corrupt color
           finalColor.lerp(new THREE.Color(0xff0000), 0.5 + Math.sin(time * 20)*0.5);
        }

        nodesRef.current.setColorAt(i, finalColor);
      }
      nodesRef.current.instanceMatrix.needsUpdate = true;
      if (nodesRef.current.instanceColor) nodesRef.current.instanceColor.needsUpdate = true;
    }

    // Update Lines (Edges)
    if (edgesRef.current && simData.links.length > 0) {
      const positions = edgeGeometry.attributes.position.array as Float32Array;
      const colors = edgeGeometry.attributes.color.array as Float32Array;
      
      for (let i = 0; i < numLinks; i++) {
        const link = simData.links[i];
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        
        const i3 = i * 6;
        positions[i3 + 0] = source.x || 0;
        positions[i3 + 1] = source.y || 0;
        positions[i3 + 2] = source.z || 0;
        positions[i3 + 3] = target.x || 0;
        positions[i3 + 4] = target.y || 0;
        positions[i3 + 5] = target.z || 0;

        // Color based on source
        const sColor = AGENT_COLORS[source.agent] || new THREE.Color(0xffffff);
        colors[i3 + 0] = sColor.r; colors[i3 + 1] = sColor.g; colors[i3 + 2] = sColor.b;
        colors[i3 + 3] = sColor.r; colors[i3 + 4] = sColor.g; colors[i3 + 5] = sColor.b;
      }
      edgeGeometry.attributes.position.needsUpdate = true;
      edgeGeometry.attributes.color.needsUpdate = true;

      // Update Shader uniforms
      const mat = edgesRef.current.material as any;
      if (mat && mat.uniforms) {
        mat.uniforms.time.value = time;
        mat.uniforms.isCrisis.value = visualState === 'CRISIS';
      }
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const node = simData.nodes[e.instanceId];
      if (node) setHoveredNodeId(node.id);
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHoveredNodeId(null);
  };

  if (numNodes === 0) return null;

  return (
    <group position={[0, 0, 0]}>
      {/* Edges */}
      <lineSegments ref={edgesRef} geometry={edgeGeometry}>
        <primitive object={NeuralLinkMaterial} attach="material" transparent depthWrite={false} vertexColors />
      </lineSegments>

      {/* Nodes */}
      <instancedMesh
        ref={nodesRef}
        args={[sphereGeo, baseMaterial, numNodes]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </group>
  );
}
