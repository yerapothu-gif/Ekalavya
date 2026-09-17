import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listUniversities,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from '../api/adminApi';

const EMPTY_COURSE = { name: '', description: '', category: '' };
const EMPTY_UNIVERSITY = { name: '', country: '', fellowship_available: false, categories: '' };

export default function CoursesUniversitiesTab() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [courses, setCourses] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [courseForm, setCourseForm] = useState(null); // null = closed, {} = create, {...} = edit
  const [universityForm, setUniversityForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [c, u] = await Promise.all([listCourses(token), listUniversities(token)]);
      setCourses(c.courses || []);
      setUniversities(u.universities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submitCourse = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (courseForm.id) {
        await updateCourse(token, courseForm.id, courseForm);
      } else {
        await createCourse(token, courseForm);
      }
      setCourseForm(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitUniversity = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        name: universityForm.name,
        country: universityForm.country,
        fellowship_available: !!universityForm.fellowship_available,
        categories: universityForm.categories.split(',').map((x) => x.trim()).filter(Boolean),
      };
      if (universityForm.id) {
        await updateUniversity(token, universityForm.id, payload);
      } else {
        await createUniversity(token, payload);
      }
      setUniversityForm(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (id, name) => {
    if (!window.confirm(`Delete course "${name}"?`)) return;
    try {
      await deleteCourse(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUniversity = async (id, name) => {
    if (!window.confirm(`Delete university "${name}"?`)) return;
    try {
      await deleteUniversity(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && <p className="error-text">{error}</p>}

      {/* Courses */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Courses</h3>
          <button onClick={() => { setCourseForm(EMPTY_COURSE); setFormError(''); }}>+ Add Course</button>
        </div>

        {courseForm && (
          <form onSubmit={submitCourse} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            <div className="form-row">
              <label>Name *</label>
              <input required value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Category</label>
              <input value={courseForm.category || ''} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Description</label>
              <textarea rows={2} value={courseForm.description || ''} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
            </div>
            {formError && <p className="error-text">{formError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="secondary" onClick={() => setCourseForm(null)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {courses.length === 0 ? (
            <p style={{ padding: 16, color: 'var(--text-muted)' }}>No courses yet.</p>
          ) : (
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.category || '—'}</td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="secondary" onClick={() => { setCourseForm(c); setFormError(''); }}>Edit</button>
                      <button className="secondary" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteCourse(c.id, c.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Universities */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Universities & Fellowships</h3>
          <button
            onClick={() => {
              setUniversityForm({ ...EMPTY_UNIVERSITY });
              setFormError('');
            }}
          >
            + Add University
          </button>
        </div>

        {universityForm && (
          <form onSubmit={submitUniversity} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-row">
                <label>Name *</label>
                <input required value={universityForm.name} onChange={(e) => setUniversityForm({ ...universityForm, name: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Country</label>
                <input value={universityForm.country || ''} onChange={(e) => setUniversityForm({ ...universityForm, country: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label>Matches course categories (comma separated)</label>
              <input
                value={typeof universityForm.categories === 'string' ? universityForm.categories : (universityForm.categories || []).join(', ')}
                onChange={(e) => setUniversityForm({ ...universityForm, categories: e.target.value })}
                placeholder="e.g. Web Dev, Data Science"
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={!!universityForm.fellowship_available}
                onChange={(e) => setUniversityForm({ ...universityForm, fellowship_available: e.target.checked })}
              />
              Fellowship available
            </label>
            {formError && <p className="error-text">{formError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" className="secondary" onClick={() => setUniversityForm(null)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {universities.length === 0 ? (
            <p style={{ padding: 16, color: 'var(--text-muted)' }}>No universities yet.</p>
          ) : (
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Country</th>
                  <th>Categories</th>
                  <th>Fellowship</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {universities.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.country || '—'}</td>
                    <td>{(u.categories || []).join(', ') || '—'}</td>
                    <td>{u.fellowship_available ? 'Yes' : 'No'}</td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        className="secondary"
                        onClick={() => {
                          setUniversityForm({ ...u, categories: (u.categories || []).join(', ') });
                          setFormError('');
                        }}
                      >
                        Edit
                      </button>
                      <button className="secondary" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteUniversity(u.id, u.name)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
