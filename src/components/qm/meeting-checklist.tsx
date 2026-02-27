'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  checked: boolean;
}

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: '1', category: 'Actions',     description: 'Review previous month\'s action items', checked: false },
  { id: '2', category: 'Completions', description: 'Present compliance checkpoint summary', checked: false },
  { id: '3', category: 'Scoring',     description: 'Review audit readiness score and trends', checked: false },
  { id: '4', category: 'Findings',    description: 'Discuss open findings and root causes', checked: false },
  { id: '5', category: 'CAPAs',       description: 'Review CAPA status and deadlines', checked: false },
  { id: '6', category: 'Risks',       description: 'Identify new risks or compliance gaps', checked: false },
  { id: '7', category: 'Planning',    description: 'Set action items for next period', checked: false },
  { id: '8', category: 'Schedule',    description: 'Schedule next QM meeting date', checked: false },
];

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Completions: { bg: '#F0FDF4', color: '#15803D' },
  Overdue:     { bg: '#FEF2F2', color: '#DC2626' },
  Findings:    { bg: '#FFFBEB', color: '#B45309' },
  CAPAs:       { bg: '#FDF0EB', color: '#C05A2C' },
  Policies:    { bg: '#F5F3FF', color: '#6D28D9' },
  AI:          { bg: '#E8F6FA', color: '#0E7490' },
  Scoring:     { bg: '#EFF6FF', color: '#1D4ED8' },
  Actions:     { bg: '#F5F5F5', color: '#525252' },
  Risks:       { bg: '#FEF2F2', color: '#DC2626' },
  Planning:    { bg: '#FFFBEB', color: '#B45309' },
  Schedule:    { bg: '#F5F3FF', color: '#6D28D9' },
};

interface MeetingChecklistProps {
  onMarkComplete?: () => void;
  meetingId?: string;
  orgId?: string;
  agenda?: Record<string, unknown> | null;
}

export function MeetingChecklist({ onMarkComplete, meetingId, agenda }: MeetingChecklistProps) {
  const savedItems = agenda && Array.isArray(agenda) ? (agenda as unknown as ChecklistItem[]) : null;
  const [items, setItems] = useState<ChecklistItem[]>(
    savedItems && savedItems.length > 0 ? savedItems : DEFAULT_ITEMS
  );
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (agenda && Array.isArray(agenda)) {
      const loaded = agenda as unknown as ChecklistItem[];
      if (loaded.length > 0) setItems(loaded);
    }
  }, [agenda]);

  const checkedCount = items.filter((i) => i.checked).length;

  async function toggle(id: string) {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(newItems);
    if (meetingId) {
      const supabase = createClient();
      await supabase
        .from('qm_meetings')
        .update({ agenda: newItems as unknown as Record<string, unknown> })
        .eq('id', meetingId);
    }
  }

  async function handleMarkComplete() {
    if (meetingId) {
      const supabase = createClient();
      await supabase
        .from('qm_meetings')
        .update({ status: 'completed' })
        .eq('id', meetingId);
    }
    setCompleted(true);
    onMarkComplete?.();
  }

  return (
    <div>
      {/* Progress row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--g600, #525252)', margin: 0 }}>
          {checkedCount} of {items.length} items reviewed
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ height: '6px', width: '180px', background: 'var(--g200, #E8E8E8)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(checkedCount / items.length) * 100}%`,
              background: checkedCount === items.length ? 'var(--green, #16A34A)' : 'var(--blue, #3BA7C9)',
              borderRadius: '3px',
              transition: 'width 0.2s',
            }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--g700, #404040)', minWidth: '32px' }}>
            {Math.round((checkedCount / items.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Checklist */}
      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            onClick={() => toggle(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              borderBottom: i < items.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none',
              cursor: 'pointer',
              background: item.checked ? 'var(--g50, #FAFAFA)' : '#fff',
              transition: 'background 0.1s',
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: item.checked ? 'none' : '2px solid var(--g300, #D4D4D4)',
              background: item.checked ? 'var(--green, #16A34A)' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.1s',
            }}>
              {item.checked && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p style={{
              flex: 1,
              fontSize: '14px',
              color: item.checked ? 'var(--g400, #A3A3A3)' : 'var(--g800, #262626)',
              margin: 0,
              textDecoration: item.checked ? 'line-through' : 'none',
              transition: 'color 0.1s',
            }}>
              {item.description}
            </p>
            <span style={{
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 600,
              background: CAT_COLORS[item.category]?.bg ?? '#F5F5F5',
              color: CAT_COLORS[item.category]?.color ?? '#525252',
              flexShrink: 0,
            }}>
              {item.category}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleMarkComplete}
        disabled={completed}
        style={{
          padding: '10px 24px',
          background: completed
            ? 'var(--green, #16A34A)'
            : checkedCount === items.length
            ? 'var(--green, #16A34A)'
            : 'var(--blue, #3BA7C9)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: completed ? 'default' : 'pointer',
          opacity: completed ? 0.8 : 1,
        }}
      >
        {completed ? '✓ Meeting Marked Complete' : 'Mark Meeting Complete'}
      </button>
    </div>
  );
}
