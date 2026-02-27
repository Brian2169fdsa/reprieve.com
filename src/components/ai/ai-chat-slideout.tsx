'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { AGENT_CONFIG } from './agent-card';
import type { AgentName } from '@/lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  policy_guardian:
    'I can help you analyze policies, detect conflicts, review compliance requirements, and provide recommendations based on your organization\'s data.',
  compliance_monitor:
    'I can help you track checkpoint progress, identify overdue items, review compliance trends, and manage staff assignments.',
  evidence_librarian:
    'I can help you find missing evidence, review audit binder status, identify documentation gaps, and track evidence coverage.',
  qm_orchestrator:
    'I can help you prepare QM meeting packets, review findings, track CAPA progress, and analyze audit readiness trends.',
};

const SUGGESTED_PROMPTS: Record<AgentName, string[]> = {
  policy_guardian: ['Policy conflicts', 'Review schedule', 'HIPAA compliance', 'Recent changes'],
  compliance_monitor: ['Overdue checkpoints', 'Monthly summary', 'Risk areas', 'Staff assignments'],
  evidence_librarian: ['Missing evidence', 'Audit readiness', 'Evidence gaps', 'Binder status'],
  qm_orchestrator: ['QM packet status', 'Open findings', 'CAPA overview', 'Trend analysis'],
};

interface AIChatSlideoutProps {
  agent: AgentName | null;
  onClose: () => void;
  orgId?: string;
}

export default function AIChatSlideout({ agent, onClose, orgId }: AIChatSlideoutProps) {
  const [histories, setHistories] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = agent ? histories[agent] ?? [] : [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (agent) inputRef.current?.focus();
  }, [agent]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (agent) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [agent, onClose]);

  async function sendMessage(text: string) {
    if (!text.trim() || !agent || isLoading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text.trim() };

    setHistories((prev) => ({
      ...prev,
      [agent]: [...(prev[agent] ?? []), userMsg],
    }));
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), agent, orgId: orgId ?? '' }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.message };

      setHistories((prev) => ({
        ...prev,
        [agent]: [...(prev[agent] ?? []), aiMsg],
      }));
    } catch {
      const errMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setHistories((prev) => ({
        ...prev,
        [agent]: [...(prev[agent] ?? []), errMsg],
      }));
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  if (!agent) return null;

  const config = AGENT_CONFIG[agent];
  const Icon = config.icon;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.2)',
          zIndex: 49,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(400px, 90vw)',
          height: '100vh',
          background: '#fff',
          borderLeft: '1px solid #E8E8E8',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E8E8', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: config.accentBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={18} color={config.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#171717', margin: 0 }}>{config.name}</p>
            <p style={{ fontSize: '12px', color: '#737373', margin: 0 }}>{config.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#737373' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Description + prompts (shown when no messages) */}
        {messages.length === 0 && (
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: '#525252', lineHeight: '1.6', margin: '0 0 16px' }}>
              {AGENT_DESCRIPTIONS[agent]}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SUGGESTED_PROMPTS[agent].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    padding: '6px 14px',
                    background: config.accentBg,
                    color: config.accent,
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? '#2A8BA8' : '#F5F5F5',
                  color: msg.role === 'user' ? '#fff' : '#171717',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: '#F5F5F5' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#A3A3A3',
                        display: 'inline-block',
                        animation: `typingDot 1.2s infinite ${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #E8E8E8', padding: '12px 20px 16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${config.name}...`}
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #D4D4D4',
                borderRadius: '8px',
                fontSize: '13px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                maxHeight: '80px',
                overflowY: 'auto',
                opacity: isLoading ? 0.6 : 1,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = config.accent; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#D4D4D4'; }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: input.trim() && !isLoading ? '#2A8BA8' : '#E8E8E8',
                color: input.trim() && !isLoading ? '#fff' : '#A3A3A3',
                border: 'none',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={16} />
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#A3A3A3', margin: '6px 0 0', textAlign: 'center' }}>
            Enter to send &middot; Shift+Enter for newline
          </p>
        </div>

        {/* Animations */}
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes typingDot {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </>
  );
}
