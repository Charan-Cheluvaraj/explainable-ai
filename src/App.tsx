import React, { useState, useEffect, useRef } from 'react';
import { useCognitionStore } from './store/useCognitionStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  ArrowUp,
  Cpu,
  Heart,
  Search,
  AlertTriangle,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { ParliamentCanvas } from './components/ParliamentCanvas';

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

  return (
    <motion.div
      layoutId="prompt-card"
      className={`prompt-card ${compact ? 'compact' : ''}`}
      style={{
        maxWidth: compact ? '720px' : '640px',
        width: '100%',
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
            <span className="text-logic animate-pulse">Deliberating...</span>
          ) : (
            <span>Press Enter to convene</span>
          )}
        </div>
        <motion.button
          layout
          onClick={handleSubmit}
          disabled={!query.trim() || disabled}
          className="prompt-send"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Agent Card
// ─────────────────────────────────────────────────────────────

function AgentCard({ id, index }: { id: AgentId; index: number }) {
  const agent = useCognitionStore((s) => s.agents[id]);
  const violations = useCognitionStore(
    useShallow((s) => s.violations.filter((v) => v.agentId.toLowerCase().includes(id)))
  );
  const round = useCognitionStore((s) => s.round);
  const config = AGENT_CONFIG[id];
  const Icon = config.icon;

  return (
    <motion.div
      className="agent-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      style={{
        borderColor: agent.status !== 'idle' ? `${config.color}30` : 'var(--border-subtle)',
      }}
    >
      <div className="agent-header">
        <div className="agent-icon" style={{ color: config.color }}>
          <Icon size={16} />
        </div>
        <div className="agent-meta">
          <span className="agent-name">{config.name}</span>
          <span className="agent-label">{config.label}</span>
        </div>
        <div className="agent-confidence" style={{ color: config.color }}>
          {(agent.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {violations.length > 0 && (
        <div className="agent-violations">
          {violations.map((v, i) => (
            <div key={i} className="violation-badge">
              <AlertTriangle size={10} />
              <span>{v.law}</span>
            </div>
          ))}
        </div>
      )}

      <div className="agent-body">
        {agent.status === 'thinking' ? (
          <div className="agent-thinking">
            <div className="thinking-dots">
              <span />
              <span />
              <span />
            </div>
            <p>
              {round === 1 ? 'Formulating Stance...' : 
               round === 2 ? 'Cross-Examining...' : 
               'Synthesizing...'}
            </p>
          </div>
        ) : agent.status === 'speaking' ? (
          <motion.p
            className="agent-thought"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {agent.lastThought || 'Response ready.'}
          </motion.p>
        ) : (
          <div className="agent-idle">
            <Terminal size={32} />
            <span>STATION IDLE</span>
          </div>
        )}
      </div>

      <div className="agent-bar-track">
        <motion.div
          className="agent-bar-fill"
          style={{ backgroundColor: config.color }}
          initial={{ width: 0 }}
          animate={{ width: `${agent.confidence * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status Bar
// ─────────────────────────────────────────────────────────────

function StatusBar() {
  const visualState = useCognitionStore((s) => s.visualState);
  const variance = useCognitionStore((s) => s.tensionVariance);
  const isDebating = useCognitionStore((s) => s.isDebating);

  return (
    <motion.div
      className="status-bar"
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="status-left">
        <span className="status-title">SYNAPSE 2D</span>
        <div className="status-divider" />
        <div className="status-metric">
          <span className="status-label">SYSTEM</span>
          <div className="status-value">
            <div className={`status-dot ${isDebating ? 'active' : ''}`} />
            <span>{isDebating ? 'DELIBERATING' : 'SYNTHESIZED'}</span>
          </div>
        </div>
        <div className="status-metric">
          <span className="status-label">TENSION</span>
          <span className="status-value mono" style={{ color: variance > 0.1 ? '#fb7185' : '#38bdf8' }}>
            {variance.toFixed(4)}
          </span>
        </div>
      </div>

      <div className={`status-badge ${visualState.toLowerCase()}`}>
        <ShieldAlert size={14} />
        <span>{visualState}</span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const isDebating = useCognitionStore((s) => s.isDebating);
  const lastQuery = useCognitionStore((s) => s.lastQuery);
  const startDebate = useCognitionStore((s) => s.startDebate);

  const handleSubmit = (query: string) => {
    setHasSubmitted(true);
    setShowCanvas(true);
    startDebate(query);
  };

  // Switch from cinematic canvas to actual result cards once debate finishes
  useEffect(() => {
    if (!isDebating && hasSubmitted) {
      setShowCanvas(false);
    }
  }, [isDebating, hasSubmitted]);

  return (
    <div className="app-root">
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {!hasSubmitted ? (
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
                Watch three AI minds debate your strategic query.
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
              <StatusBar />

              <div className="main-stage">
                <motion.div 
                  className="query-display"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="query-label">QUERY</span>
                  <p className="query-text">"{lastQuery}"</p>
                </motion.div>

                {showCanvas ? (
                  <ParliamentCanvas isVisible={true} />
                ) : (
                  <div className="agents-grid">
                    {(Object.keys(AGENT_CONFIG) as AgentId[]).map((id, i) => (
                      <AgentCard key={id} id={id} index={i} />
                    ))}
                  </div>
                )}
              </div>

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
