/**
 * DebateConsole.tsx — The Parliament HUD Overlay
 *
 * HTML layer sitting above the 3D canvas. Renders:
 *  - Visual State indicator (STABLE / WARNING / CRISIS)
 *  - Tension variance σ² live readout
 *  - Per-agent status pills
 *  - Active Constitution Laws
 *  - Violation log
 *  - Query input to trigger a debate
 *
 * Styled with Geist font. Zero purple-to-blue gradients.
 * Color language strictly matches design tokens:
 *   Logic/Technocrat: #00F2FF
 *   Ethics/Humanist:  #FF4D8D
 *   Risk/Inquisitor:  #FFD700
 */

import React, { useState } from 'react';
import {
  useCognitionStore,
  useVisualState,
  useTensionVariance,
  useAgents,
  useViolations,
} from '../../store/useCognitionStore';

// ─────────────────────────────────────────────────────────────
// Visual State Badge
// ─────────────────────────────────────────────────────────────

const STATE_CONFIG = {
  STABLE:  { label: 'STABLE',  color: '#00F2FF', glyph: '◎' },
  WARNING: { label: 'WARNING', color: '#FFD700', glyph: '◈' },
  CRISIS:  { label: 'CRISIS',  color: '#FF4D8D', glyph: '◉' },
};

function VisualStateBadge() {
  const visualState = useVisualState();
  const cfg = STATE_CONFIG[visualState];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 14px',
      border: `1px solid ${cfg.color}`,
      borderRadius: '4px',
      background: `${cfg.color}12`,
    }}>
      <span style={{ color: cfg.color, fontSize: '18px', lineHeight: 1 }}>
        {cfg.glyph}
      </span>
      <span style={{
        color: cfg.color, fontSize: '11px',
        fontWeight: 700, letterSpacing: '0.12em',
      }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tension Variance Meter
// ─────────────────────────────────────────────────────────────

function TensionMeter() {
  const sigma2 = useTensionVariance();
  const pct = Math.min(sigma2 / 0.3, 1.0) * 100; // 0.3 → full red

  const barColor = sigma2 >= 0.15 ? '#FF4D8D'
    : sigma2 >= 0.07 ? '#FFD700'
    : '#00F2FF';

  return (
    <div style={{ flex: 1 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: '4px',
      }}>
        <span style={{ color: '#888', fontSize: '10px', letterSpacing: '0.1em' }}>
          TENSION σ²
        </span>
        <span style={{ color: barColor, fontSize: '10px', fontWeight: 600 }}>
          {sigma2.toFixed(4)}
        </span>
      </div>
      <div style={{
        height: '3px',
        background: '#ffffff0a',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: barColor,
          borderRadius: '2px',
          transition: 'width 0.3s ease, background 0.5s ease',
          boxShadow: `0 0 8px ${barColor}`,
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Agent Status Pills
// ─────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  technocrat: '#00F2FF',
  humanist:   '#FF4D8D',
  inquisitor: '#FFD700',
};

const STATUS_ICONS: Record<string, string> = {
  idle:       '○',
  thinking:   '◌',
  speaking:   '●',
  dissenting: '◐',
};

function AgentPills() {
  const agents = useAgents();

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {(Object.entries(agents) as [string, string][]).map(([agent, status]) => {
        const color = AGENT_COLORS[agent];
        const isActive = status !== 'idle';
        return (
          <div key={agent} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px',
            border: `1px solid ${isActive ? color : '#333'}`,
            borderRadius: '3px',
            background: isActive ? `${color}10` : 'transparent',
            transition: 'all 0.4s ease',
          }}>
            <span style={{
              color: isActive ? color : '#444',
              fontSize: '12px',
              transition: 'color 0.4s',
            }}>
              {STATUS_ICONS[status] ?? '○'}
            </span>
            <span style={{
              color: isActive ? color : '#555',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {agent}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Constitution Law Ticker
// ─────────────────────────────────────────────────────────────

function ConstitutionTicker() {
  const laws = useCognitionStore((s) => s.activeConstitutionLaws);
  if (laws.length === 0) return null;

  return (
    <div style={{
      borderTop: '1px solid #ffffff0a',
      paddingTop: '10px',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <span style={{ color: '#555', fontSize: '9px', letterSpacing: '0.1em' }}>
        ACTIVE CONSTITUTION LAWS
      </span>
      {laws.map((law) => (
        <div key={law} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: '#FFD700', fontSize: '9px' }}>⚖</span>
          <span style={{ color: '#FFD70099', fontSize: '10px' }}>
            {law.replace(/_/g, ' ')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Violation Log
// ─────────────────────────────────────────────────────────────

function ViolationLog() {
  const violations = useViolations();
  if (violations.length === 0) return null;

  return (
    <div style={{
      borderTop: '1px solid #ffffff0a',
      paddingTop: '10px',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <span style={{ color: '#555', fontSize: '9px', letterSpacing: '0.1em' }}>
        CONSTITUTIONAL VIOLATIONS
      </span>
      {violations.map((v, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '6px',
          padding: '6px 8px',
          background: '#FF4D8D0a',
          border: '1px solid #FF4D8D22',
          borderRadius: '3px',
        }}>
          <span style={{ color: '#FF4D8D', fontSize: '10px', marginTop: '1px' }}>✗</span>
          <div>
            <div style={{ color: '#FF4D8D', fontSize: '10px', fontWeight: 600 }}>
              {v.nodeLabel}
            </div>
            <div style={{ color: '#FF4D8D66', fontSize: '9px', marginTop: '2px' }}>
              {v.law.replace(/_/g, ' ')} — penalty {v.penaltyApplied.toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Query Input
// ─────────────────────────────────────────────────────────────

function QueryInput() {
  const [query, setQuery] = useState('');
  const startDebate = useCognitionStore((s) => s.startDebate);
  const isDebating  = useCognitionStore((s) => s.isDebating);

  const handleSubmit = async () => {
    if (!query.trim() || isDebating) return;
    startDebate(query);
    // TODO: POST to /debate endpoint, then call hydrateFromDebateResponse()
    // Simulated for now:
    setTimeout(() => {
      useCognitionStore.getState().setTensionVariance(0.18);
      useCognitionStore.getState().endDebate();
    }, 4000);
  };

  return (
    <div style={{
      display: 'flex', gap: '8px',
      borderTop: '1px solid #ffffff0a',
      paddingTop: '12px',
    }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Enter a strategic question for the Parliament…"
        disabled={isDebating}
        style={{
          flex: 1,
          background: '#ffffff07',
          border: '1px solid #ffffff14',
          borderRadius: '4px',
          padding: '8px 12px',
          color: '#fff',
          fontSize: '12px',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={isDebating || !query.trim()}
        style={{
          padding: '8px 16px',
          background: isDebating ? '#ffffff0a' : '#00F2FF',
          border: 'none',
          borderRadius: '4px',
          color: isDebating ? '#555' : '#0A0A0B',
          fontSize: '11px',
          fontWeight: 700,
          cursor: isDebating ? 'not-allowed' : 'pointer',
          letterSpacing: '0.06em',
          transition: 'all 0.3s',
        }}
      >
        {isDebating ? 'DEBATING…' : 'CONVENE'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main HUD Export
// ─────────────────────────────────────────────────────────────

export function DebateConsole() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0,
      width: '320px',
      padding: '16px',
      background: 'rgba(10, 10, 11, 0.82)',
      backdropFilter: 'blur(12px)',
      borderRight: '1px solid #ffffff0a',
      borderTop: '1px solid #ffffff0a',
      display: 'flex', flexDirection: 'column', gap: '12px',
      fontFamily: '"Geist", "Geist Mono", system-ui, monospace',
      zIndex: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <VisualStateBadge />
        <TensionMeter />
      </div>

      {/* Agent pills */}
      <AgentPills />

      {/* Constitution + violations */}
      <ConstitutionTicker />
      <ViolationLog />

      {/* Query interface */}
      <QueryInput />
    </div>
  );
}
