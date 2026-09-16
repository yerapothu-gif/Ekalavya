export default function UniversityList({ universities }) {
  if (!universities || universities.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No suggestions available yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {universities.map((u) => (
        <div key={u.id} className="card">
          <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{u.name}</p>
          {u.country && <p style={{ margin: '0 0 4px', color: 'var(--text-muted)' }}>{u.country}</p>}
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            {u.fellowship_available ? 'Fellowship available' : 'No fellowship listed'}
          </p>
        </div>
      ))}
    </div>
  );
}
