'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { AGENT_CONFIG } from './agent-card';
import type { AISuggestion } from '@/lib/types';

const TYPE_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  edit:   { bg: '#E8F6FA', color: '#2A8BA8', label: 'Edit' },
  flag:   { bg: '#FFFBEB', color: '#D97706', label: 'Flag' },
  create: { bg: '#F0FDF4', color: '#16A34A', label: 'Create' },
  review: { bg: '#FDF0EB', color: '#C05A2C', label: 'Review' },
};

function confidenceLevel(c: number): { color: string; bg: string; label: string } {
  if (c >= 0.9) return { color: '#16A34A', bg: '#DCFCE7', label: 'High Confidence' };
  if (c >= 0.75) return { color: '#D97706', bg: '#FEF3C7', label: 'Medium Confidence' };
  return { color: '#C05A2C', bg: '#FDE5D8', label: 'Review Carefully' };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: (s: AISuggestion) => void;
  onReject: (s: AISuggestion) => void;
  compact?: boolean;
}

export default function SuggestionCard({ suggestion, onAccept, onReject, compact }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const s = suggestion;
  const agentCfg = AGENT_CONFIG[s.agent];
  const typeBadge = TYPE_BADGES[s.suggestion_type] ?? TYPE_BADGES.review;
  const isPending = s.status === 'pending';
  const conf = s.confidence != null ? confidenceLevel(s.confidence) : null;

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 0',
          borderBottom: '1px solid #F5F5F5',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: agentCfg?.accent ?? '#737373',
            marginTop: '5px',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span
              onClick={() => setExpanded(!expanded)}
              style={{ fontSize: '13px', fontWeight: 600, color: '#171717', cursor: 'pointer' }}
            >
              {s.title}
            </span>
            <span style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: typeBadge.bg, color: typeBadge.color, textTransform: 'uppercase' }}>
              {typeBadge.label}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 6px', lineHeight: '1.5' }}>
            {s.description}
          </p>
          {/* Confidence bar */}
          {conf && s.confidence != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ flex: 1, maxWidth: '120px', height: '4px', background: '#E8E8E8', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${s.confidence * 100}%`, height: '100%', background: conf.color, borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: conf.color }}>
                {Math.round(s.confidence * 100)}%
              </span>
            </div>
          )}
          {expanded && s.suggested_changes && Object.keys(s.suggested_changes).length > 0 && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E8E8E8', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px' }}>
              <pre style={{ fontSize: '11px', color: '#404040', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {JSON.stringify(s.suggested_changes, null, 2)}
              </pre>
            </div>
          )}
          {isPending && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <button
                onClick={() => onAccept(s)}
                style={{ padding: '4px 12px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Accept
              </button>
              <button
                onClick={() => onReject(s)}
                style={{ padding: '4px 12px', background: '#fff', color: '#C05A2C', border: '1px solid #FDF0EB', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
        <span style={{ fontSize: '11px', color: '#A3A3A3', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {timeAgo(s.created_at)}
        </span>
      </div>
    );
  }

  // Full card mode (for suggestions page)
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E8E8E8',
        borderRadius: '10px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        opacity: isPending ? 1 : 0.75,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: agentCfg?.accent ?? '#737373' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#525252' }}>{agentCfg?.name ?? s.agent}</span>
          <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: typeBadge.bg, color: typeBadge.color, textTransform: 'uppercase' }}>
            {typeBadge.label}
          </span>
          {!isPending && (
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
              background: s.status === 'accepted' ? '#F0FDF4' : s.status === 'rejected' ? '#FEF2F2' : '#E8F6FA',
              color: s.status === 'accepted' ? '#16A34A' : s.status === 'rejected' ? '#DC2626' : '#2A8BA8',
            }}>
              {s.status}
            </span>
          )}
        </div>
        <span style={{ fontSize: '12px', color: '#A3A3A3' }}>
          Suggested {timeAgo(s.created_at)} by {agentCfg?.name ?? s.agent}
        </span>
      </div>

      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#171717', margin: '0 0 8px' }}>
        {s.title}
      </h3>
      <p style={{ fontSize: '13px', color: '#525252', margin: '0 0 12px', lineHeight: '1.6' }}>
        {s.description}
      </p>

      {/* Entity reference */}
      {s.entity_type && (
        <div style={{ fontSize: '12px', color: '#737373', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Affects: <strong style={{ color: '#404040' }}>{s.entity_type}</strong></span>
          {s.entity_id && <span> — {s.entity_id.slice(0, 8)}...</span>}
          <ExternalLink size={12} style={{ marginLeft: '4px', opacity: 0.5 }} />
        </div>
      )}

      {/* Suggested Changes expandable */}
      {s.suggested_changes && Object.keys(s.suggested_changes).length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', padding: '0',
              background: 'none', border: 'none', fontSize: '12px', fontWeight: 600,
              color: '#3BA7C9', cursor: 'pointer', marginBottom: expanded ? '8px' : 0,
            }}
          >
            Suggested Changes {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E8E8E8', borderLeft: '3px solid #3BA7C9', borderRadius: '6px', padding: '12px 14px' }}>
              <pre style={{ fontSize: '12px', color: '#404040', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', lineHeight: '1.6' }}>
                {JSON.stringify(s.suggested_changes, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Confidence meter */}
      {conf && s.confidence != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, maxWidth: '200px', height: '6px', background: '#E8E8E8', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${s.confidence * 100}%`, height: '100%', background: conf.color, borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: conf.color }}>
            {Math.round(s.confidence * 100)}% — {conf.label}
          </span>
        </div>
      )}

      {/* Review info for non-pending */}
      {!isPending && s.reviewed_by && (
        <div style={{ padding: '8px 12px', background: '#FAFAFA', border: '1px solid #E8E8E8', borderRadius: '6px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#737373' }}>
            Reviewed {s.reviewed_at ? timeAgo(s.reviewed_at) : ''}{s.review_notes ? ` — "${s.review_notes}"` : ''}
          </span>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onReject(s)}
            style={{ padding: '7px 16px', background: '#fff', color: '#C05A2C', border: '1px solid #FDF0EB', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reject
          </button>
          <button
            onClick={() => onAccept(s)}
            style={{ padding: '7px 16px', background: '#3BA7C9', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
