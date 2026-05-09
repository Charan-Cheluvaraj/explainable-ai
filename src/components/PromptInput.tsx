import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
}

export default function PromptInput({ onSubmit }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
        style={{
          background:
            'radial-gradient(circle, var(--color-logic) 0%, var(--color-judge) 50%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-2xl px-6">
        {/* ── Title ──────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 select-none">
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, var(--color-logic) 50%, var(--color-judge) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Synapse3D
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Ask anything. Watch AI think.
          </p>
        </div>

        {/* ── Input Block ────────────────────────── */}
        <div
          className="relative w-full rounded-2xl transition-all duration-500 ease-out"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: `1px solid ${isFocused ? 'rgba(0, 242, 255, 0.3)' : 'var(--border-subtle)'}`,
            boxShadow: isFocused
              ? '0 0 40px -10px rgba(0, 242, 255, 0.15), 0 0 80px -20px rgba(196, 181, 253, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
              : 'inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter a strategic query for the Parliament..."
            rows={1}
            className="w-full resize-none bg-transparent px-6 py-5 pr-16 text-[15px] leading-relaxed outline-none placeholder:tracking-wide custom-scrollbar"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              caretColor: 'var(--color-logic)',
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className="absolute right-3 bottom-3 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ease-out cursor-pointer disabled:cursor-default"
            style={{
              background: prompt.trim()
                ? 'linear-gradient(135deg, var(--color-logic), var(--color-judge))'
                : 'rgba(255, 255, 255, 0.05)',
              opacity: prompt.trim() ? 1 : 0.3,
              boxShadow: prompt.trim()
                ? '0 0 20px -4px rgba(0, 242, 255, 0.4)'
                : 'none',
              transform: prompt.trim() ? 'scale(1)' : 'scale(0.95)',
            }}
            aria-label="Send prompt"
          >
            <Send
              size={18}
              strokeWidth={2.5}
              style={{
                color: prompt.trim() ? '#0a0a0a' : 'rgba(255,255,255,0.2)',
                transition: 'color 0.3s ease',
              }}
            />
          </button>
        </div>

        {/* ── Hint ───────────────────────────────── */}
        <p className="text-[11px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Press <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)' }}>Enter</kbd> to convene  ·  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)' }}>Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
