/**
 * TensionField.glsl-style inline GLSL Shaders
 *
 * ChromaticAberrationPass — the postprocessing "CRISIS pulse" effect.
 * Injects into @react-three/postprocessing as a custom Effect.
 * Driven by resonanceRef.current.chromaticPulse each frame.
 */

// Vertex shader (fullscreen quad pass)
export const chromaVertGLSL = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Fragment shader — RGB split with radial distortion
export const chromaFragGLSL = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uStrength;   // 0.0 (calm) → 1.0 (CRISIS)
uniform float uTime;

varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5, 0.5);
  vec2 dir    = vUv - center;
  float dist  = length(dir);

  // Aberration offset pulsates with uTime for living feel
  float pulse = uStrength * (0.018 + sin(uTime * 12.0) * 0.006);

  vec2 offR = dir * pulse;
  vec2 offB = dir * pulse * -1.2;

  float r = texture2D(tDiffuse, vUv + offR).r;
  float g = texture2D(tDiffuse, vUv).g;
  float b = texture2D(tDiffuse, vUv + offB).b;

  // Vignette — darkens edges during CRISIS
  float vignette = 1.0 - dist * uStrength * 1.4;

  gl_FragColor = vec4(vec3(r, g, b) * vignette, 1.0);
}
`;
