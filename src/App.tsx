import React, { useState, useEffect, useRef } from 'react';
import { useCognitionStore } from './store/useCognitionStore';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { ParliamentGraph } from './components/ParliamentGraph';
import { NeuralSplit } from './components/NeuralSplit';
import { OpeningGate } from './components/ui/OpeningGate';
import { MissionControlSidebar } from './components/MissionControlSidebar';
import { ChatView } from './components/ChatView';

// ─────────────────────────────────────────────────────────────
// Prompt Input Component
// ─────────────────────────────────────────────────────────────

function PromptInput({
  onSubmit,
  disabled,
  compact,
  containerRef,
}: {
  onSubmit: (query: string) => void;
  disabled: boolean;
  compact: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
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
      ref={containerRef as React.RefObject<HTMLDivElement>}
      layoutId="prompt-card"
      className={`prompt-card micro-border ${compact ? 'compact' : ''}`}
      onMouseMove={handleMouseMove}
      layout
      style={{
        maxWidth: compact ? '720px' : '640px',
        width: '100%',
        opacity: compact && disabled ? 0.6 : 1,
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

// Map DebatePhase string to numeric phase for NeuralSplit
function resolvePhase(debatePhase: string, isDebating: boolean, synthesisResult: string): number {
  if (synthesisResult && !isDebating) return 5;
  if (!isDebating) return 0;
  switch (debatePhase) {
    case 'grounding': return 1;
    case 'round1':    return 2;
    case 'brawl':     return 3;
    case 'synthesis': return 4;
    case 'reveal':    return 5;
    default:          return 1;
  }
}

export default function App() {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const promptRef = useRef<HTMLDivElement | null>(null);

  const hasEntered       = useCognitionStore((s) => s.hasEntered);
  const isDebating       = useCognitionStore((s) => s.isDebating);
  const debatePhase      = useCognitionStore((s) => s.debatePhase);
  const lastQuery        = useCognitionStore((s) => s.lastQuery);
  const synthesisResult  = useCognitionStore((s) => s.synthesisResult);
  const startDebate      = useCognitionStore((s) => s.startDebate);
  const agents           = useCognitionStore((s) => s.agents);
  const tensionVariance  = useCognitionStore((s) => s.tensionVariance);
  const visualState      = useCognitionStore((s) => s.visualState);
  const violations       = useCognitionStore((s) => s.violations);
  const memoryDepth      = useCognitionStore((s) => s.memoryDepth);
  const isPromptVisible  = useCognitionStore((s) => s.isPromptVisible);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const neuralPhase = resolvePhase(debatePhase, isDebating, synthesisResult);

  useEffect(() => {
    if (!lastQuery) {
      const timer = setTimeout(() => setHasSubmitted(false), 0);
      return () => clearTimeout(timer);
    }
  }, [lastQuery]);

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
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
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
                <h1 className="landing-title">ThinkMesh</h1>
                <p className="landing-subtitle">Stateful Cognitive Parliament</p>
              </div>

              {/* Prompt at center — will slide to bottom on submit (layout animation) */}
              <PromptInput
                onSubmit={handleSubmit}
                disabled={false}
                compact={false}
                containerRef={promptRef}
              />

              <p className="landing-hint">
                Powered by Backboard persistent memory · Local Ollama agents · Groq synthesis
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
              {(!isDebating && synthesisResult) ? (
                <ChatView />
              ) : (
                <ParliamentGraph
                  query={lastQuery}
                  isDebating={isDebating}
                  result={synthesisResult}
                  memoryDepth={memoryDepth}
                />
              )}

              {/* NeuralSplit overlay — beam + morphing nodes + vibration */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 15,
                }}
              >
                <NeuralSplit
                  promptRef={promptRef}
                  isDebating={isDebating}
                  debatePhase={debatePhase}
                  phase={neuralPhase}
                />
              </div>

              {/* Docked prompt — slides to bottom via Framer layout animation */}
              <motion.div
                className="docked-prompt"
                layout
                initial={{ y: 0, opacity: 0 }}
                animate={{ 
                  y: isPromptVisible ? 0 : 120, 
                  opacity: isPromptVisible ? 1 : 0 
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              >
                <PromptInput
                  onSubmit={handleSubmit}
                  disabled={isDebating}
                  compact={true}
                  containerRef={promptRef}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {hasEntered && (
        <MissionControlSidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isDebating={isDebating}
          agents={agents}
          tensionVariance={tensionVariance}
          visualState={visualState}
          lastQuery={lastQuery}
          violations={violations}
        />
      )}

      <div className="dot-grid" />
    </div>
  );
}
