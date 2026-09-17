import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  listCourses,
  listMentors,
  listUniversities,
} from '../api/adminApi';

const STAGES = [
  { key: 'looking', label: 'Looking' },
  { key: 'applied', label: 'Applied' },
  { key: 'offer_received', label: 'Offer Received' },
];

const EMPTY_FORM = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  course_id: '',
  mentor_id: '',
  university_id: '',
  admission_stage: 'looking',
  bio: '',
};

export default function StudentsTab() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [s, c, m, u] = await Promise.all([
        listStudents(token, { search, stage: stageFilter }),
        listCourses(token),
        listMentors(token),
        listUniversities(token),
      ]);
      setStudents(s.students || []);
      setCourses(c.courses || []);
      setMentors(m.mentors || []);
      setUniversities(u.universities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, search, stageFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      email: '',
      password: '',
      full_name: s.name || '',
      phone: s.phone || '',
      course_id: s.courseId || '',
      mentor_id: s.mentorId || '',
      university_id: s.universityId || '',
      admission_stage: s.admissionStage,
      bio: s.bio || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await updateStudent(token, editingId, {
          full_name: form.full_name,
          phone: form.phone,
          course_id: form.course_id || null,
          mentor_id: form.mentor_id || null,
          university_id: form.university_id || null,
          admission_stage: form.admission_stage,
          bio: form.bio,
        });
      } else {
        await createStudent(token, {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          course_id: form.course_id || null,
          mentor_id: form.mentor_id || null,
          university_id: form.university_id || null,
          admission_stage: form.admission_stage,
          bio: form.bio,
        });
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete student "${name}"? This permanently removes their account and cannot be undone.`)) return;
    try {
      await deleteStudent(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <button onClick={openCreate}>+ Add Student</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {formOpen && (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0 }}>{editingId ? 'Edit Student' : 'Add Student'}</h3>
          {!editingId && (
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
          )}
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
              <label>Course</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                <option value="">-- None --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Mentor</label>
              <select value={form.mentor_id} onChange={(e) => setForm({ ...form, mentor_id: e.target.value })}>
                <option value="">-- None --</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name || m.id}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>University</label>
              <select value={form.university_id} onChange={(e) => setForm({ ...form, university_id: e.target.value })}>
                <option value="">-- None --</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Admission stage</label>
            <select value={form.admission_stage} onChange={(e) => setForm({ ...form, admission_stage: e.target.value })}>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Bio / goals</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          {formError && <p className="error-text">{formError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="secondary" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 16, color: 'var(--text-muted)' }}>Loading…</p>
        ) : students.length === 0 ? (
          <p style={{ padding: 16, color: 'var(--text-muted)' }}>No students found.</p>
        ) : (
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Course</th>
                <th>Mentor</th>
                <th>Stage</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name || 'Unnamed'}</td>
                  <td>{s.courseName || '—'}</td>
                  <td>{s.mentorName || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.admissionStage.replace('_', ' ')}</td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="secondary" onClick={() => openEdit(s)}>Edit</button>
                    <button className="secondary" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(s.id, s.name)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
