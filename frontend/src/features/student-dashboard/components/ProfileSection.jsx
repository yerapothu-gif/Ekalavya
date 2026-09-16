import { useEffect, useState } from 'react';

export default function ProfileSection({ student, onSave, saving, error }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setBio(student?.bio || '');
    setPhone(student?.phone || '');
  }, [student]);

  if (!student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    const ok = await onSave({ bio, phone });
    if (ok) {
      setEditing(false);
      setSuccessMessage('Profile updated.');
    }
  };

  const handleCancel = () => {
    setBio(student.bio || '');
    setPhone(student.phone || '');
    setEditing(false);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Profile</h3>
        {!editing && (
          <button type="button" className="secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {successMessage && !editing && (
        <p style={{ color: 'var(--accent)', fontSize: 13 }}>{successMessage}</p>
      )}

      {!editing ? (
        <div>
          <div className="form-row">
            <label>Name</label>
            <span>{student.name || '—'}</span>
          </div>
          <div className="form-row">
            <label>Contact</label>
            <span>{student.phone || 'Not provided'}</span>
          </div>
          <div className="form-row">
            <label>Education background / Goals</label>
            <span style={{ whiteSpace: 'pre-wrap' }}>{student.bio || 'Not provided'}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="student-phone">Contact</label>
            <input
              id="student-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="form-row">
            <label htmlFor="student-bio">Education background / Goals</label>
            <textarea
              id="student-bio"
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
