'use client';

import { ShieldCheck, Activity, Archive, LayoutGrid } from 'lucide-react';
import type { AgentName } from '@/lib/types';

export interface AgentMetrics {
  label: string;
  value: string | number;
}

export interface AgentCardProps {
  agent: AgentName;
  metrics: AgentMetrics[];
  onChatClick: (agent: AgentName) => void;
}

const AGENT_CONFIG: Record<AgentName, {
  name: string;
  subtitle: string;
  accent: string;
  accentBg: string;
  icon: typeof ShieldCheck;
}> = {
  policy_guardian: {
    name: 'Policy Guardian',
    subtitle: 'Policy Analysis & Conflict Detection',
    accent: '#8B5CF6',
    accentBg: '#EDE9FE',
    icon: ShieldCheck,
  },
  compliance_monitor: {
    name: 'Compliance Monitor',
    subtitle: 'Checkpoint Generation & Oversight',
    accent: '#3BA7C9',
    accentBg: '#E8F6FA',
    icon: Activity,
  },
  evidence_librarian: {
    name: 'Evidence Librarian',
    subtitle: 'Evidence Organization & Gap Detection',
    accent: '#16A34A',
    accentBg: '#F0FDF4',
    icon: Archive,
  },
  qm_orchestrator: {
    name: 'QM Orchestrator',
    subtitle: 'Quality Meeting Preparation',
    accent: '#D97706',
    accentBg: '#FFFBEB',
    icon: LayoutGrid,
  },
};

export { AGENT_CONFIG };

export default function AgentCard({ agent, metrics, onChatClick }: AgentCardProps) {
  const config = AGENT_CONFIG[agent];
  const Icon = config.icon;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E8E8E8',
        borderLeft: `3px solid ${config.accent}`,
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: config.accentBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={20} color={config.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#171717', margin: 0 }}>
              {config.name}
            </p>
            <p style={{ fontSize: '12px', color: '#737373', margin: 0 }}>
              {config.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#16A34A',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#16A34A' }}>Active</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: '16px 20px', flex: 1 }}>
        {metrics.map((m, i) => (
          <div
            key={m.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: i < metrics.length - 1 ? '1px solid #F5F5F5' : 'none',
            }}
          >
            <span style={{ fontSize: '13px', color: '#525252' }}>{m.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#171717' }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Chat button */}
      <div style={{ padding: '0 20px 20px' }}>
        <button
          onClick={() => onChatClick(agent)}
          style={{
            width: '100%',
            padding: '9px 16px',
            background: 'transparent',
            color: config.accent,
            border: `1px solid ${config.accent}`,
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = config.accentBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Chat with Agent
        </button>
      </div>
    </div>
  );
}
