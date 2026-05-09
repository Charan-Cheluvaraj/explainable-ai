import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

/**
 * NeuralLinkMaterial
 * 
 * Shader representing edges in the Cognition Graph.
 * Visualizes "Neural Strands" — glowing energy pulses traveling
 * from source to target.
 * 
 * Tension Reactivity:
 * - isCrisis (boolean): Triples pulse speed, shifts color to jagged red/yellow flicker.
 */
export const NeuralLinkMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color('#00F2FF'),
    isCrisis: false,
    strength: 1.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float time;
    uniform vec3 color;
    uniform bool isCrisis;
    uniform float strength;

    varying vec2 vUv;

    // Pseudo-random noise for jagged flicker
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      // Base speed multiplier
      float speed = isCrisis ? 3.0 : 1.0;
      
      // Moving sine wave pulse
      float pulse = sin(vUv.x * 20.0 - time * 5.0 * speed) * 0.5 + 0.5;
      
      // Base color
      vec3 finalColor = color;
      
      if (isCrisis) {
        // Red/Yellow crisis shift
        vec3 crisisColor1 = vec3(1.0, 0.2, 0.3); // Red
        vec3 crisisColor2 = vec3(1.0, 0.8, 0.0); // Yellow
        
        float flicker = random(vec2(time * 10.0, vUv.x));
        finalColor = mix(crisisColor1, crisisColor2, flicker);
        
        // Jagged pulse
        pulse = step(0.5, pulse + flicker * 0.5);
      }
      
      // Edge fading (alpha mapped to uv ends)
      float fade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
      
      // Final intensity
      float alpha = pulse * fade * strength;
      
      // Boost brightness for bloom
      vec3 bloomColor = finalColor * (1.0 + pulse * 2.0);
      
      gl_FragColor = vec4(bloomColor, alpha);
    }
  `
);
