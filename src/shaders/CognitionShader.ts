import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

export const CognitionShaderMaterial = shaderMaterial(
  {
    uTime:           0.0,
    uTension:        0.0,
    uAgentType:      0,          // 0=technocrat 1=humanist 2=inquisitor
    uColor:          new THREE.Color('#00F2FF'),
    uConverge:       0.0,        // 0→1 judge synthesizing → consensus bloom
    uInvModelMatrix: new THREE.Matrix4(),
  },

  /* ── VERTEX ─────────────────────────────────────────────── */
  `varying vec3 vObjPos;
   void main() {
     vObjPos = position;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,

  /* ── FRAGMENT ────────────────────────────────────────────── */
  `precision highp float;

   uniform float  uTime;
   uniform float  uTension;
   uniform int    uAgentType;
   uniform vec3   uColor;
   uniform float  uConverge;
   uniform mat4   uInvModelMatrix;

   varying vec3 vObjPos;

   // ── Noise ────────────────────────────────────────────────
   float hash(vec3 p) {
     p = fract(p * vec3(0.1031, 0.1030, 0.0973));
     p += dot(p, p.yxz + 33.33);
     return fract((p.x + p.y) * p.z);
   }
   float vnoise(vec3 p) {
     vec3 i = floor(p), f = fract(p);
     f = f*f*(3.0-2.0*f);
     return mix(
       mix(mix(hash(i),           hash(i+vec3(1,0,0)),f.x),
           mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
       mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
           mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
   float fbm(vec3 p) {
     float v = 0.0; float a = 0.5;
     for (int i = 0; i < 4; i++) { v += a*vnoise(p); p *= 2.1; a *= 0.5; }
     return v;
   }

   // ── SDF Helpers ──────────────────────────────────────────
   float sdBox(vec3 p, vec3 b) {
     vec3 q = abs(p)-b;
     return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);
   }
   float sdSphere(vec3 p, float r) { return length(p)-r; }
   float smin(float a, float b, float k) {
     float h = max(k-abs(a-b),0.0)/k;
     return min(a,b)-h*h*k*0.25;
   }

   // ── Technocrat: Menger lattice + tension fractures ───────
   float sdTechnocrat(vec3 p) {
     float s = sdBox(p, vec3(0.8));
     float sc = 1.0;
     for (int i = 0; i < 3; i++) {
       vec3 a = mod(p*sc+1.0, 2.0)-1.0;
       sc *= 3.0;
       vec3 q = 1.0-3.0*abs(a);
       float c = (min(max(q.x,q.y), min(max(q.y,q.z),max(q.z,q.x)))-1.0)/sc;
       s = max(s, c);
     }
     s -= fbm(p*2.5 + vec3(uTime*0.04)) * 0.12 * uTension;
     return s;
   }

   // ── Humanist: organic metaballs ──────────────────────────
   float sdHumanist(vec3 p) {
     float d = 1e5;
     float k = 0.45 - uTension*0.12;
     for (int i = 0; i < 5; i++) {
       float fi = float(i);
       vec3 c = vec3(
         sin(uTime*0.45+fi*1.3)*0.35,
         cos(uTime*0.38+fi*2.1)*0.35,
         sin(uTime*0.52+fi*0.9)*0.35);
       float r = 0.28 + fbm(p+fi*3.7)*0.10*uTension;
       d = smin(d, sdSphere(p-c, r), k);
     }
     return d;
   }

   // ── Inquisitor: spiky + glitch noise ────────────────────
   float sdInquisitor(vec3 p) {
     vec3 a = abs(p);
     float spike = max(max(a.x,a.y),a.z)*0.75 + min(min(a.x,a.y),a.z)*0.25 - 0.72;
     float glitch = sin(p.x*11.0+uTime*4.0)*sin(p.y*11.0)*sin(p.z*11.0+uTime*2.5)
                    *0.09*uTension;
     float vol = fbm(p*4.5+uTime*0.3)*0.14*uTension;
     return spike - glitch - vol;
   }

   // ── Scene SDF ────────────────────────────────────────────
   float scene(vec3 p) {
     float d;
     if      (uAgentType == 0) d = sdTechnocrat(p);
     else if (uAgentType == 1) d = sdHumanist(p);
     else                      d = sdInquisitor(p);
     if (uConverge > 0.0) d = mix(d, sdSphere(p, 0.82), uConverge);
     return d;
   }

   vec3 calcNormal(vec3 p) {
     const float e = 0.002;
     return normalize(vec3(
       scene(p+vec3(e,0,0))-scene(p-vec3(e,0,0)),
       scene(p+vec3(0,e,0))-scene(p-vec3(0,e,0)),
       scene(p+vec3(0,0,e))-scene(p-vec3(0,0,e))));
   }

   // ── Main ─────────────────────────────────────────────────
   void main() {
     // Ray in object space
     vec3 ro = (uInvModelMatrix * vec4(cameraPosition, 1.0)).xyz;
     vec3 rd = normalize(vObjPos - ro);

     // Ray–sphere intersection for bounding volume
     float b = dot(ro, rd);
     float c = dot(ro,ro) - 1.05;
     float h = b*b - c;
     if (h < 0.0) discard;
     float t = max(-b - sqrt(h), 0.0);

     // TAA jitter
     t += hash(vObjPos + vec3(uTime)) * 0.008;

     vec3  col   = vec3(0.0);
     float alpha = 0.0;

     for (int i = 0; i < 80; i++) {
       vec3  p = ro + rd*t;
       if (dot(p,p) > 1.1) break;
       float d = scene(p);

       if (d < 0.003) {
         vec3 n = calcNormal(p);
         vec3 ld = normalize(vec3(1.0, 1.5, 1.0));
         float diff = max(dot(n, ld), 0.0);
         float rim  = pow(1.0 - max(dot(n,-rd),0.0), 3.0);

         float pulse = 0.8 + 0.2*sin(uTime*3.5);
         vec3  base  = mix(uColor, vec3(1.0,0.3,0.1), uTension*0.45);
         vec3  final = mix(base, vec3(1.0), uConverge);

         col   = final * (diff*0.65 + 0.35) * pulse + rim*final*0.6;
         col  *= 1.8;                          // boost for AdditiveBlending
         alpha = 0.88 + uTension*0.12;
         break;
       }

       // Volumetric glow near surface
       if (d < 0.08) {
         float g = (0.08 - d)/0.08;
         col   += uColor * g * 0.018;
         alpha  = max(alpha, g*0.25);
       }

       t += max(d, 0.004);
     }

     if (alpha < 0.01) discard;
     gl_FragColor = vec4(col, alpha);
   }`
);
