/**
 * App.tsx — Synapse3D Root
 *
 * Layout: full-viewport stage.
 *  Layer 0 (z:0): CognitiveTheater (R3F Canvas — absolute fill)
 *  Layer 1 (z:10): DebateConsole HUD (HTML overlay)
 *  Layer 2 (z:10): Agent labels (HTML overlay, top-right)
 */

import React from 'react';
import { CognitiveTheater } from './components/canvas/CognitiveTheater';
import { DebateConsole } from './components/ui/DebateConsole';
import './App.css';

function AgentLabels() {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '64px',
      fontFamily: '"Geist", "Geist Mono", system-ui, monospace',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      {[
        { label: 'TECHNOCRAT', color: '#00F2FF' },
        { label: 'HUMANIST',   color: '#FF4D8D' },
        { label: 'INQUISITOR', color: '#FFD700' },
      ].map(({ label, color }) => (
        <div key={label} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        }}>
          <div style={{
            width: '1px', height: '20px',
            background: `linear-gradient(to bottom, ${color}, transparent)`,
          }} />
          <span style={{
            color,
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            opacity: 0.7,
          }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SynapseWordmark() {
  return (
    <div style={{
      position: 'absolute',
      top: '16px', left: '16px',
      fontFamily: '"Geist", system-ui, sans-serif',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          SYNAPSE
        </span>
        <span style={{ color: '#00F2FF', fontSize: '15px', fontWeight: 700 }}>3D</span>
      </div>
      <div style={{ color: '#444', fontSize: '9px', letterSpacing: '0.12em', marginTop: '2px' }}>
        COGNITIVE PARLIAMENT
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="synapse-root">
      {/* 3D Stage — full viewport */}
      <CognitiveTheater />

      {/* HTML Overlays */}
      <SynapseWordmark />
      <AgentLabels />
      <DebateConsole />
    </div>
  );
}
