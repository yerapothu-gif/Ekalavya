const STAGES = [
  { key: 'looking', label: 'Looking for Opportunities' },
  { key: 'applied', label: 'Applied' },
  { key: 'offer_received', label: 'Offer Received' },
];

export default function AdmissionTracker({ stage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {STAGES.map((s, i) => {
        const status = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        const isLast = i === STAGES.length - 1;

        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', flex: isLast ? '0 0 auto' : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 130 }}>
              <div
                aria-current={status === 'current' ? 'step' : undefined}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  color: status === 'upcoming' ? 'var(--text-muted)' : '#fff',
                  background: status === 'upcoming' ? 'var(--surface)' : 'var(--accent)',
                  border: `2px solid ${status === 'upcoming' ? 'var(--border)' : 'var(--accent)'}`,
                }}
              >
                {status === 'done' ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: status === 'current' ? 700 : 500,
                  color: status === 'upcoming' ? 'var(--text-muted)' : 'var(--text)',
                  textAlign: 'center',
                }}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginTop: 15,
                  background: i < currentIndex ? 'var(--accent)' : 'var(--border)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
