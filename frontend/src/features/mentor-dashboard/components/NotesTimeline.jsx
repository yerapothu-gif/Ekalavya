import { useState } from 'react';

export default function NotesTimeline({ notes, onAddNote, saving }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!text.trim()) {
      setError('Note cannot be empty');
      return;
    }
    const ok = await onAddNote(text.trim());
    if (ok) setText('');
    else setError('Failed to add note');
  };

  return (
    <div className="card">
      <h3>Mentor Notes</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <textarea
          rows={2}
          placeholder="Add a note about this student…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1 }}
          maxLength={4000}
        />
        <button type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Add note'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      {notes.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map((n) => (
            <div key={n.id} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{n.note_text}</p>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
