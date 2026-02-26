'use client';

export interface QMTab {
  label: string;
  badge?: number;
}

interface QMTabsProps {
  tabs: QMTab[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export function QMTabs({ tabs, activeTab, onTabChange }: QMTabsProps) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '2px solid var(--g200, #E8E8E8)',
      marginBottom: '24px',
      overflowX: 'auto',
    }}>
      {tabs.map((tab, i) => (
        <button
          key={tab.label}
          onClick={() => onTabChange(i)}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === i ? '2px solid var(--blue, #3BA7C9)' : '2px solid transparent',
            marginBottom: '-2px',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === i ? 600 : 400,
            color: activeTab === i ? 'var(--blue, #3BA7C9)' : 'var(--g500, #737373)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            transition: 'color 0.1s',
            flexShrink: 0,
          }}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              background: activeTab === i ? 'var(--blue, #3BA7C9)' : 'var(--g200, #E8E8E8)',
              color: activeTab === i ? '#fff' : 'var(--g600, #525252)',
              lineHeight: '1.4',
            }}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
