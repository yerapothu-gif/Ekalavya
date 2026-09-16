const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  excused: 'Excused',
};

export default function AttendanceTable({ records }) {
  if (!records || records.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No attendance records yet.</p>;
  }

  const summary = records.reduce(
    (acc, r) => {
      acc.total += 1;
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <SummaryStat label="Total Sessions" value={summary.total} />
        <SummaryStat label="Present" value={summary.present || 0} />
        <SummaryStat label="Absent" value={summary.absent || 0} />
        <SummaryStat label="Excused" value={summary.excused || 0} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Class / Topic</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.sessionDate || '—'}</td>
              <td>{r.topic || '—'}</td>
              <td>{STATUS_LABELS[r.status] || r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: 'center', padding: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
