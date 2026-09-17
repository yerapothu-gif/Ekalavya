import { useState } from 'react';
import NotesTimeline from './NotesTimeline';
import ExternalPanelBoundary from '../../student-dashboard/components/ExternalPanelBoundary.jsx';
import SummaryPanel from '../../ai-summary/SummaryPanel';

const STAGES = [
  { key: 'looking', label: 'Looking for Opportunities' },
  { key: 'applied', label: 'Applied' },
  { key: 'offer_received', label: 'Offer Received' },
];

export default function StudentDetail({ detail, loading, error, onUpdateStage, onAddNote }) {
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  if (loading) return <p>Loading student…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!detail) return <p style={{ color: 'var(--text-muted)' }}>Select a student to view details.</p>;

  const { student, course, university, notes, attendance } = detail;

  const handleStageChange = async (e) => {
    setStageError('');
    setStageSaving(true);
    const ok = await onUpdateStage(e.target.value);
    if (!ok) setStageError('Failed to update admission stage');
    setStageSaving(false);
  };

  const handleAddNote = async (text) => {
    setNoteSaving(true);
    const ok = await onAddNote(text);
    setNoteSaving(false);
    return ok;
  };

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{student.name || 'Unnamed student'}</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{student.phone || 'No contact on file'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Admission stage
            </label>
            <select value={student.admissionStage} onChange={handleStageChange} disabled={stageSaving}>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            {stageError && <p className="error-text" style={{ marginTop: 4 }}>{stageError}</p>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Course</div>
            <div style={{ fontWeight: 600 }}>{course?.name || 'Not enrolled'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target university</div>
            <div style={{ fontWeight: 600 }}>{university?.name || 'Not set'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Attendance rate</div>
            <div style={{ fontWeight: 600 }}>{attendanceRate === null ? '—' : `${attendanceRate}%`}</div>
          </div>
        </div>

        {student.bio && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Background / goals</div>
            <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{student.bio}</p>
          </div>
        )}
      </div>

      <ExternalPanelBoundary>
        <SummaryPanel studentId={student.id} viewerRole="mentor" />
      </ExternalPanelBoundary>

      <NotesTimeline notes={notes} onAddNote={handleAddNote} saving={noteSaving} />

      <div className="card">
        <h3>Attendance History</h3>
        {attendance.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No attendance recorded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Topic</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a.id}>
                  <td>{a.sessionDate || '—'}</td>
                  <td>{a.topic || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
