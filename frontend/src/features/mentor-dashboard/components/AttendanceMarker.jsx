import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  getMyCourses,
  getMyClasses,
  getClassAttendance,
  markAttendance,
} from '../api/mentorApi';

const STATUSES = ['present', 'absent', 'excused'];

export default function AttendanceMarker({ students }) {
  const { session } = useAuth();
  const token = session?.access_token;

  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [selectedClassId, setSelectedClassId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [topic, setTopic] = useState('');
  const [statuses, setStatuses] = useState({}); // { [studentId]: status }
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOptions = useCallback(async () => {
    if (!token) return;
    try {
      const [c, cls] = await Promise.all([getMyCourses(token), getMyClasses(token)]);
      setCourses(c.courses || []);
      setClasses(cls.classes || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    // default everyone to present unless a class is selected below
    const initial = {};
    students.forEach((s) => {
      initial[s.id] = 'present';
    });
    setStatuses(initial);
  }, [students]);

  useEffect(() => {
    if (mode !== 'existing' || !selectedClassId || !token) return;
    setLoading(true);
    getClassAttendance(token, selectedClassId)
      .then((data) => {
        setStatuses((prev) => {
          const next = { ...prev };
          (data.attendance || []).forEach((row) => {
            next[row.student_id] = row.status;
          });
          return next;
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, selectedClassId, token]);

  const setStatus = (studentId, status) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'existing' && !selectedClassId) {
      setError('Select an existing class session, or switch to "New session".');
      return;
    }
    if (mode === 'new' && !sessionDate) {
      setError('Session date is required to create a new class.');
      return;
    }

    const records = students.map((s) => ({ student_id: s.id, status: statuses[s.id] || 'present' }));

    setSubmitting(true);
    try {
      const payload =
        mode === 'existing'
          ? { class_id: selectedClassId, records }
          : { course_id: courseId || null, session_date: sessionDate, topic, records };

      await markAttendance(token, payload);
      setSuccess('Attendance saved.');
      loadOptions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="card">
        <p style={{ color: 'var(--text-muted)' }}>You have no assigned students yet.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3>Class Session</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className={mode === 'existing' ? '' : 'secondary'}
            onClick={() => setMode('existing')}
          >
            Existing session
          </button>
          <button type="button" className={mode === 'new' ? '' : 'secondary'} onClick={() => setMode('new')}>
            New session
          </button>
        </div>

        {mode === 'existing' ? (
          <div className="form-row">
            <label htmlFor="class-select">Session</label>
            <select id="class-select" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              <option value="">-- Select a session --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.session_date} — {c.topic || 'Untitled'} {c.course_name ? `(${c.course_name})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="form-row">
              <label htmlFor="course-select">Course</label>
              <select id="course-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">-- No specific course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="session-date">Date</label>
              <input id="session-date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required />
            </div>
            <div className="form-row">
              <label htmlFor="topic">Topic</label>
              <input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Intro to algorithms" />
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0 }}>Mark Each Student {loading && '(loading existing marks…)'}</h3>
        </div>
        <table style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Student</th>
              {STATUSES.map((s) => (
                <th key={s} style={{ textTransform: 'capitalize', textAlign: 'center' }}>
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name || 'Unnamed student'}</td>
                {STATUSES.map((status) => (
                  <td key={status} style={{ textAlign: 'center' }}>
                    <input
                      type="radio"
                      name={`status-${s.id}`}
                      checked={(statuses[s.id] || 'present') === status}
                      onChange={() => setStatus(s.id, status)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="error-text">{error}</p>}
      {success && <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{success}</p>}

      <div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>
    </form>
  );
}
