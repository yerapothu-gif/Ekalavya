import React, { useState } from 'react';

const STAGES = [
  { id: 'looking', label: 'Looking', badgeColor: '#5c6f84', bg: '#edf2f7' },
  { id: 'applied', label: 'Applied', badgeColor: '#9c6500', bg: '#fef3c7' },
  { id: 'offer_received', label: 'Offer Received', badgeColor: '#1f6f5c', bg: '#e6f4ea' },
];

export default function AdmissionStageUpdater({ currentStage, studentId, onStageChange, disabled }) {
  const [saving, setSaving] = useState(false);
  const [selectedStage, setSelectedStage] = useState(currentStage || 'looking');
  const [feedback, setFeedback] = useState(null);

  // Sync with prop when student changes
  React.useEffect(() => {
    setSelectedStage(currentStage || 'looking');
    setFeedback(null);
  }, [currentStage, studentId]);

  const handleUpdate = async (newStage) => {
    if (newStage === currentStage || saving || disabled) return;
    setSaving(true);
    setFeedback(null);
    try {
      await onStageChange(newStage);
      setSelectedStage(newStage);
      setFeedback({ type: 'success', text: 'Stage updated' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update stage' });
    } finally {
      setSaving(false);
    }
  };

  const currentStageInfo = STAGES.find((s) => s.id === (currentStage || 'looking')) || STAGES[0];

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            Admission Stage
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: 13,
                fontWeight: 600,
                color: currentStageInfo.badgeColor,
                backgroundColor: currentStageInfo.bg,
                border: `1px solid ${currentStageInfo.badgeColor}33`,
              }}
            >
              ● {currentStageInfo.label}
            </span>
            {feedback && (
              <span
                style={{
                  fontSize: 12,
                  color: feedback.type === 'error' ? 'var(--danger)' : 'var(--accent)',
                  fontWeight: 500,
                }}
              >
                {feedback.text}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedStage}
            onChange={(e) => handleUpdate(e.target.value)}
            disabled={saving || disabled}
            style={{
              padding: '6px 10px',
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stepper Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        {STAGES.map((st, idx) => {
          const isCurrent = (currentStage || 'looking') === st.id;
          const isPassed =
            (currentStage === 'offer_received') ||
            (currentStage === 'applied' && idx <= 1) ||
            (currentStage === 'looking' && idx === 0);

          return (
            <React.Fragment key={st.id}>
              <button
                type="button"
                onClick={() => handleUpdate(st.id)}
                disabled={saving || disabled}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: isCurrent ? 700 : 500,
                  textAlign: 'center',
                  background: isCurrent ? 'var(--accent)' : isPassed ? '#e6f4ea' : 'var(--bg)',
                  color: isCurrent ? '#fff' : isPassed ? 'var(--accent)' : 'var(--text-muted)',
                  border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: saving ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {idx + 1}. {st.label}
              </button>
              {idx < STAGES.length - 1 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
