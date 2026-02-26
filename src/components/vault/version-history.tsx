'use client';

import type { PolicyVersion } from '@/lib/types';

interface VersionHistoryProps {
  versions: PolicyVersion[];
  currentVersionId?: string | null;
  selectedVersionId?: string | null;
  onSelectVersion: (version: PolicyVersion) => void;
}

export default function VersionHistory({
  versions,
  currentVersionId,
  selectedVersionId,
  onSelectVersion,
}: VersionHistoryProps) {
  const sorted = [...versions].sort((a, b) => b.version_number - a.version_number);

  if (sorted.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#A3A3A3', padding: '12px 0', textAlign: 'center' }}>
        No versions yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {sorted.map((v) => {
        const isCurrent = v.id === currentVersionId;
        const isSelected = v.id === selectedVersionId;
        const isHighlighted = isSelected || (isCurrent && !selectedVersionId);

        return (
          <div
            key={v.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectVersion(v)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectVersion(v)}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              background: isHighlighted ? '#E8F6FA' : 'transparent',
              cursor: 'pointer',
              border: isHighlighted ? '1px solid #B2E0ED' : '1px solid transparent',
              transition: 'background 0.1s, border-color 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!isHighlighted)
                (e.currentTarget as HTMLElement).style.background = '#FAFAFA';
            }}
            onMouseLeave={(e) => {
              if (!isHighlighted)
                (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  background: isHighlighted ? '#2A8BA8' : '#E8E8E8',
                  color: isHighlighted ? '#fff' : '#525252',
                  padding: '1px 8px',
                  borderRadius: '10px',
                }}
              >
                v{v.version_number}
              </span>
              {isCurrent && (
                <span
                  style={{
                    fontSize: '10px',
                    color: '#2A8BA8',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Current
                </span>
              )}
            </div>

            {v.change_summary && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#525252',
                  margin: '4px 0 0',
                  lineHeight: 1.45,
                }}
              >
                {v.change_summary}
              </p>
            )}

            <p style={{ fontSize: '11px', color: '#A3A3A3', margin: '4px 0 0' }}>
              {new Date(v.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
