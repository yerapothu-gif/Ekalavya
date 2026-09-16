import React, { useState } from 'react';

export default function NotesTimeline({ notes = [], onAddNote, disabled }) {
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || submitting || disabled) return;

    setSubmitting(true);
    setError(null);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } catch (err) {
      setError(err.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>Mentor Notes Timeline</h4>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an observation, 1:1 meeting takeaway, or recommendation..."
            rows={3}
            disabled={submitting || disabled}
            style={{
              width: '100%',
              resize: 'vertical',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error && (
              <span style={{ color: 'var(--danger)', fontSize: 12 }}>
                {error}
              </span>
            )}
            {!error && <span />}
            <button
              type="submit"
              disabled={submitting || !newNote.trim() || disabled}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                cursor: submitting || !newNote.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !newNote.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      </form>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
            background: 'var(--bg)',
            borderRadius: 'var(--radius)',
            border: '1px dashed var(--border)',
          }}
        >
          No notes recorded yet for this student. Add the first note above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                borderLeft: '3px solid var(--accent)',
                background: 'var(--bg)',
                padding: '10px 14px',
                borderRadius: '0 var(--radius) var(--radius) 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>
                  Mentor Note
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatDate(note.created_at)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.45,
                }}
              >
                {note.note_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
