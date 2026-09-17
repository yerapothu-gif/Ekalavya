import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { listMentors, createMentor, updateMentor, deleteMentor, listStudents, matchMentor } from '../api/adminApi';

const EMPTY_FORM = { email: '', password: '', full_name: '', phone: '', role: 'mentor', expertise: '', max_students: 5 };

export default function MentorsTab() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [matchStudentId, setMatchStudentId] = useState('');
  const [matchMentorId, setMatchMentorId] = useState('');
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [matchSuccess, setMatchSuccess] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [m, s] = await Promise.all([listMentors(token), listStudents(token)]);
      setMentors(m.mentors || []);
      setStudents(s.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createMentor(token, {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
        expertise: form.expertise.split(',').map((x) => x.trim()).filter(Boolean),
        max_students: Number(form.max_students) || 0,
      });
      setFormOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove mentor "${name}"? Their assigned students will become unassigned.`)) return;
    try {
      await deleteMentor(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    setMatchError('');
    setMatchSuccess('');
    if (!matchStudentId) {
      setMatchError('Pick a student to (re)assign.');
      return;
    }
    setMatchSaving(true);
    try {
      await matchMentor(token, matchStudentId, matchMentorId || null);
      setMatchSuccess('Assignment updated.');
      setMatchStudentId('');
      setMatchMentorId('');
      load();
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setMatchSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Mentors & Teachers</h3>
        <button onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Cancel' : '+ Onboard Mentor'}</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {formOpen && (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-row">
              <label>Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Password *</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-row">
              <label>Full name *</label>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-row">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="mentor">Mentor</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            <div className="form-row">
              <label>Expertise (comma separated)</label>
              <input value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} placeholder="e.g. Web Dev, Data Science" />
            </div>
            <div className="form-row">
              <label>Max students</label>
              <input type="number" min="0" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: e.target.value })} />
            </div>
          </div>
          {formError && <p className="error-text">{formError}</p>}
          <div>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Onboard Mentor'}</button>
          </div>
        </form>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 16, color: 'var(--text-muted)' }}>Loading…</p>
        ) : mentors.length === 0 ? (
          <p style={{ padding: 16, color: 'var(--text-muted)' }}>No mentors onboarded yet.</p>
        ) : (
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Expertise</th>
                <th>Workload</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mentors.map((m) => {
                const overCapacity = m.maxStudents > 0 && m.currentStudents >= m.maxStudents;
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name || 'Unnamed'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{m.role}</td>
                    <td>{(m.expertise || []).join(', ') || '—'}</td>
                    <td>
                      <span style={{ color: overCapacity ? 'var(--danger)' : 'var(--text)' }}>
                        {m.currentStudents} / {m.maxStudents || '∞'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="secondary" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(m.id, m.name)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Assign / Reassign Mentor</h3>
        <form onSubmit={handleMatch} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-row" style={{ minWidth: 200 }}>
            <label>Student</label>
            <select value={matchStudentId} onChange={(e) => setMatchStudentId(e.target.value)}>
              <option value="">-- Select student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || 'Unnamed'} {s.mentorName ? `(currently: ${s.mentorName})` : '(unassigned)'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row" style={{ minWidth: 200 }}>
            <label>Mentor</label>
            <select value={matchMentorId} onChange={(e) => setMatchMentorId(e.target.value)}>
              <option value="">-- Unassign --</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || 'Unnamed'} ({m.currentStudents}/{m.maxStudents || '∞'})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={matchSaving}>{matchSaving ? 'Saving…' : 'Assign'}</button>
        </form>
        {matchError && <p className="error-text">{matchError}</p>}
        {matchSuccess && <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{matchSuccess}</p>}
      </div>
    </div>
  );
}
