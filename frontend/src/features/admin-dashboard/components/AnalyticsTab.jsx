import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getAnalyticsOverview, getUniversityAnalytics, listMentors } from '../api/adminApi';

const STAGE_LABELS = { looking: 'Looking', applied: 'Applied', offer_received: 'Offer Received' };

function Bar({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ background: '#e0ddd4', height: 10, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ background: 'var(--accent)', height: '100%', width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function AnalyticsTab() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [overview, setOverview] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [o, u, m] = await Promise.all([
        getAnalyticsOverview(token),
        getUniversityAnalytics(token),
        listMentors(token),
      ]);
      setOverview(o);
      setUniversities(u.universities || []);
      setMentors(m.mentors || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading analytics…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!overview) return null;

  const funnelMax = Math.max(...Object.values(overview.admissionFunnel), 1);
  const universityMax = Math.max(...universities.map((u) => u.applicantCount), 1);
  const mentorMax = Math.max(...mentors.map((m) => m.currentStudents), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <KPI label="Total Students" value={overview.totalStudents} />
        <KPI label="Attendance Rate" value={`${overview.attendance.rate}%`} />
        <KPI label="Average Test Score" value={`${overview.testScores.average}%`} />
        <KPI label="Test Submissions" value={overview.testScores.totalSubmissions} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>Admission-Stage Funnel</h4>
          {Object.entries(overview.admissionFunnel).map(([key, value]) => (
            <Bar key={key} label={STAGE_LABELS[key] || key} value={value} max={funnelMax} />
          ))}
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>Average Score by Course</h4>
          {overview.testScores.byCourse.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No test data yet.</p>
          ) : (
            overview.testScores.byCourse.map((c) => (
              <Bar key={c.courseId} label={c.courseName} value={c.averageScore} max={100} />
            ))
          )}
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>Applicants per University</h4>
          {universities.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No universities yet.</p>
          ) : (
            universities.slice(0, 8).map((u) => (
              <Bar key={u.id} label={u.name} value={u.applicantCount} max={universityMax} />
            ))
          )}
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>Mentor Workload</h4>
          {mentors.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No mentors yet.</p>
          ) : (
            mentors.map((m) => (
              <Bar key={m.id} label={m.name || 'Unnamed'} value={m.currentStudents} max={Math.max(mentorMax, m.maxStudents || 0)} />
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Students per Course</h4>
        {overview.studentsByCourse.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No students enrolled yet.</p>
        ) : (
          overview.studentsByCourse.map((c) => (
            <Bar
              key={c.courseId}
              label={c.courseName}
              value={c.count}
              max={Math.max(...overview.studentsByCourse.map((x) => x.count), 1)}
            />
          ))
        )}
      </div>
    </div>
  );
}
