const STAGE_LABELS = {
  looking: 'Looking',
  applied: 'Applied',
  offer_received: 'Offer Received',
};

export default function StudentList({ students, selectedId, onSelect, loading, error }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0 }}>My Students ({students.length})</h3>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 560 }}>
        {loading ? (
          <p style={{ padding: 16, color: 'var(--text-muted)' }}>Loading…</p>
        ) : error ? (
          <p className="error-text" style={{ padding: 16 }}>{error}</p>
        ) : students.length === 0 ? (
          <p style={{ padding: 16, color: 'var(--text-muted)' }}>No students assigned to you yet.</p>
        ) : (
          students.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                borderRadius: 0,
                background: selectedId === s.id ? 'var(--bg)' : 'var(--surface)',
                color: 'var(--text)',
                padding: '12px 16px',
                fontWeight: 400,
              }}
            >
              <div style={{ fontWeight: 600 }}>{s.name || 'Unnamed student'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {s.course?.name || 'No course'} · {STAGE_LABELS[s.admissionStage] || s.admissionStage}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
