'use client';

import type { PolicyStatus } from '@/lib/types';

interface ApprovalWorkflowProps {
  currentStatus: PolicyStatus;
  onStatusChange?: (newStatus: PolicyStatus) => Promise<void> | void;
  disabled?: boolean;
  isAiGenerated?: boolean;
  aiSuggestionTitle?: string;
}

const WORKFLOW_STEPS: { status: PolicyStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'in_review', label: 'In Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'effective', label: 'Effective' },
];

const STATUS_INDEX: Record<PolicyStatus, number> = {
  draft: 0,
  in_review: 1,
  approved: 2,
  effective: 3,
  retired: 4,
};

export default function ApprovalWorkflow({
  currentStatus,
  onStatusChange,
  disabled = false,
  isAiGenerated = false,
  aiSuggestionTitle,
}: ApprovalWorkflowProps) {
  const currentIdx = STATUS_INDEX[currentStatus] ?? 0;
  const isRetired = currentStatus === 'retired';

  return (
    <div>
      {/* AI Generated banner */}
      {isAiGenerated && (
        <div
          style={{
            padding: '10px 14px',
            background: '#F0F9FC',
            border: '1px solid #B2E0ED',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#0E7490',
            fontWeight: 500,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#E8F6FA',
            color: '#2A8BA8',
            border: '1px solid #B2E0ED',
            flexShrink: 0,
          }}>
            AI
          </span>
          <span>
            This policy was created by the AI Policy Guardian.
            {aiSuggestionTitle && (
              <span style={{ color: '#737373' }}> — {aiSuggestionTitle}</span>
            )}
            {' '}Please review carefully before approving.
          </span>
        </div>
      )}

      {/* Step track */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        {WORKFLOW_STEPS.map((step, i) => {
          const stepIdx = STATUS_INDEX[step.status];
          const isCompleted = stepIdx < currentIdx;
          const isCurrent = step.status === currentStatus;
          const isLast = i === WORKFLOW_STEPS.length - 1;

          return (
            <div
              key={step.status}
              style={{ display: 'flex', alignItems: 'flex-start', flex: isLast ? 'none' : 1 }}
            >
              {/* Step node */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    border: `2px solid ${isCurrent ? '#2A8BA8' : isCompleted ? '#16A34A' : '#D4D4D4'}`,
                    background: isCurrent ? '#2A8BA8' : isCompleted ? '#16A34A' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isCurrent || isCompleted ? '#fff' : '#A3A3A3',
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#2A8BA8' : isCompleted ? '#16A34A' : '#A3A3A3',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    background: isCompleted ? '#16A34A' : '#E8E8E8',
                    margin: '12px 4px 0',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Retired state */}
      {isRetired && (
        <div
          style={{
            padding: '10px 14px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#B91C1C',
            fontWeight: 500,
          }}
        >
          This policy has been retired and is no longer active.
        </div>
      )}

      {/* Action buttons */}
      {!isRetired && onStatusChange && !disabled && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {currentStatus === 'draft' && (
            <button
              type="button"
              onClick={() => onStatusChange('in_review')}
              style={{
                padding: '7px 14px',
                background: '#FFFBEB',
                color: '#B45309',
                border: '1px solid #FDE68A',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Submit for Review →
            </button>
          )}

          {currentStatus === 'in_review' && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange('approved')}
                style={{
                  padding: '7px 14px',
                  background: '#E8F6FA',
                  color: '#2A8BA8',
                  border: '1px solid #B2E0ED',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {isAiGenerated ? '✓ Approve AI Policy →' : 'Approve →'}
              </button>
              <button
                type="button"
                onClick={() => onStatusChange('draft')}
                style={{
                  padding: '7px 14px',
                  background: '#F5F5F5',
                  color: '#525252',
                  border: '1px solid #E8E8E8',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {isAiGenerated ? '✕ Reject → Draft' : '← Return to Draft'}
              </button>
            </>
          )}

          {currentStatus === 'approved' && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange('effective')}
                style={{
                  padding: '7px 14px',
                  background: '#F0FDF4',
                  color: '#15803D',
                  border: '1px solid #BBF7D0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Mark Effective →
              </button>
              <button
                type="button"
                onClick={() => onStatusChange('in_review')}
                style={{
                  padding: '7px 14px',
                  background: '#F5F5F5',
                  color: '#525252',
                  border: '1px solid #E8E8E8',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ← Back to Review
              </button>
            </>
          )}

          {currentStatus === 'effective' && (
            <button
              type="button"
              onClick={() => onStatusChange('retired')}
              style={{
                padding: '7px 14px',
                background: '#FEF2F2',
                color: '#B91C1C',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Retire Policy
            </button>
          )}
        </div>
      )}
    </div>
  );
}
