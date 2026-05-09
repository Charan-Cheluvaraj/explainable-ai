import React, { useState, useEffect, useRef } from 'react';
import { useCognitionStore } from './store/useCognitionStore';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ArrowUp, Cpu, Heart, Search, AlertTriangle, Terminal, ShieldAlert } from 'lucide-react';
import { ParliamentGraph } from './components/ParliamentGraph';
import { OpeningGate } from './components/ui/OpeningGate';
import { TacticalTelemetry } from './components/ui/TacticalTelemetry';
import { StringTune } from '@fiddle-digital/string-tune';


// ─────────────────────────────────────────────────────────────
// Agent Config
// ─────────────────────────────────────────────────────────────

const AGENT_CONFIG = {
  technocrat: {
    name: 'TECHNOCRAT',
    icon: Cpu,
    color: '#38bdf8',
    label: 'Logic & Efficiency',
  },
  humanist: {
    name: 'HUMANIST',
    icon: Heart,
    color: '#fb7185',
    label: 'Ethics & Society',
  },
  inquisitor: {
    name: 'INQUISITOR',
    icon: Search,
    color: '#fbbf24',
    label: 'Risk & Security',
  },
} as const;

type AgentId = keyof typeof AGENT_CONFIG;

// ─────────────────────────────────────────────────────────────
// Prompt Input Component
// ─────────────────────────────────────────────────────────────

function PromptInput({
  onSubmit,
  disabled,
  compact,
}: {
  onSubmit: (query: string) => void;
  disabled: boolean;
  compact: boolean;
}) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, compact ? 120 : 200)}px`;
    }
  }, [query, compact]);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Subtle Spotlight Effect using standard mouse tracking (rAF optimized)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!textareaRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <motion.div
      layoutId="prompt-card"
      className={`prompt-card micro-border ${compact ? 'compact' : ''}`}
      onMouseMove={handleMouseMove}
      style={{
        maxWidth: compact ? '720px' : '640px',
        width: '100%',
        opacity: compact && disabled ? 0.6 : 1,
        // The spotlight gradient will be combined with background in CSS
        background: `radial-gradient(800px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%), var(--surface-elevated)`
      }}
    >
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask the Parliament anything..."
        rows={1}
        disabled={disabled}
        className="prompt-textarea"
      />
      <div className="prompt-footer">
        <div className="prompt-hint">
          {disabled ? (
            <span className="animate-pulse">Parliament is deliberating...</span>
          ) : (
            <span>Press Enter to convene</span>
          )}
        </div>
        <motion.button
          layout
          onClick={handleSubmit}
          disabled={!query.trim() || disabled}
          className="prompt-send micro-border"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          style={{ transition: 'all 0.6s var(--spring-snappy)' }}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const hasEntered = useCognitionStore((s) => s.hasEntered);
  const isDebating = useCognitionStore((s) => s.isDebating);
  const lastQuery = useCognitionStore((s) => s.lastQuery);
  const synthesisResult = useCognitionStore((s) => s.synthesisResult);
  const startDebate = useCognitionStore((s) => s.startDebate);

  useEffect(() => {
    // Initialize StringTune for high-performance scroll/cursor effects
    try {
      StringTune.getInstance();
    } catch (e) {
      console.log("StringTune initialization skipped or failed.", e);
    }
  }, []);

  const handleSubmit = (query: string) => {
    setHasSubmitted(true);
    startDebate(query);
  };

  return (
    <div className="app-root">
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {!hasEntered ? (
            <motion.div
              key="gate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.15, filter: 'blur(30px)' }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} // Spring Curve

              className="w-full h-screen"
            >
              <OpeningGate />
            </motion.div>
          ) : !hasSubmitted ? (
            <motion.div
              key="landing"
              className="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
            >
              <div className="landing-header">
                <h1 className="landing-title">SYNAPSE 2D</h1>
                <p className="landing-subtitle">Cognitive Parliament</p>
              </div>
              
              <PromptInput onSubmit={handleSubmit} disabled={false} compact={false} />
              
              <p className="landing-hint">
                A minimal, multi-agent reasoning collective.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="active"
              className="active-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Node Graph Visualization */}
              <ParliamentGraph 
                query={lastQuery} 
                isDebating={isDebating} 
                result={synthesisResult} 
              />

              {/* Docked prompt input at bottom */}
              <div className="docked-prompt">
                <PromptInput
                  onSubmit={handleSubmit}
                  disabled={isDebating}
                  compact={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      <div className="dot-grid" />
    </div>
  );
}
