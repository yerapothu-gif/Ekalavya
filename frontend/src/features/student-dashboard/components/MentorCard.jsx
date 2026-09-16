export default function MentorCard({ mentor }) {
  if (!mentor) {
    return (
      <div className="card">
        <h3>Mentor</h3>
        <p style={{ color: 'var(--text-muted)' }}>No mentor assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Mentor</h3>
      <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{mentor.name || 'Unnamed mentor'}</p>
      {mentor.phone && <p style={{ color: 'var(--text-muted)', margin: '0 0 8px' }}>{mentor.phone}</p>}
      {mentor.expertise?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {mentor.expertise.map((skill) => (
            <span
              key={skill}
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 999,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
