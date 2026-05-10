import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCognitionStore } from '../store/useCognitionStore';
import { User, Shield, BookOpen, Search, Scale } from 'lucide-react';

export const ChatView: React.FC = () => {
  const query = useCognitionStore((s) => s.lastQuery);
  const agents = useCognitionStore((s) => s.agents);
  const result = useCognitionStore((s) => s.synthesisResult);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result]);

  const AGENTS_UI = {
    technocrat: { name: 'Technocrat', icon: <Search size={20} />, color: 'var(--color-logic)' },
    humanist: { name: 'Humanist', icon: <BookOpen size={20} />, color: 'var(--color-ethics)' },
    inquisitor: { name: 'Inquisitor', icon: <Shield size={20} />, color: 'var(--color-risk)' },
  };

  return (
    <div className="chat-container" ref={scrollRef}>
      <div className="chat-messages">
        {/* User Query */}
        <motion.div 
          className="message-row user-row"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="message-content">
            <div className="message-avatar">
              <User size={20} />
            </div>
            <div className="message-body">
              <div className="message-header">You</div>
              <div className="message-text">{query}</div>
            </div>
          </div>
        </motion.div>

        {/* Agent Thoughts (Round 2 output) */}
        {Object.entries(agents).map(([key, agent], index) => {
          if (!agent.lastThought) return null;
          const ui = AGENTS_UI[key as keyof typeof AGENTS_UI];
          
          return (
            <motion.div 
              key={agent.id}
              className="message-row agent-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + (index * 0.1) }}
            >
              <div className="message-content">
                <div className="message-avatar" style={{ color: ui.color, borderColor: ui.color }}>
                  {ui.icon}
                </div>
                <div className="message-body">
                  <div className="message-header" style={{ color: ui.color }}>{ui.name}</div>
                  <div className="message-text">
                    {/* Basic Markdown-like formatting (paragraphs) */}
                    {agent.lastThought.split('\n').map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Final Synthesis */}
        {result && (
          <motion.div 
            className="message-row judge-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="message-content">
              <div className="message-avatar judge-avatar">
                <Scale size={20} />
              </div>
              <div className="message-body">
                <div className="message-header">Parliamentary Synthesis</div>
                <div className="message-text judge-text">
                  {result.split('\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Spacer to not overlap with fixed input bar */}
        <div className="chat-spacer" />
      </div>
    </div>
  );
};
