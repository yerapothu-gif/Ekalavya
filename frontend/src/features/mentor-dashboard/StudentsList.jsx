import React, { useState, useMemo } from 'react';

const STAGE_CONFIG = {
  looking: { label: 'Looking', color: '#5c6f84', bg: '#edf2f7' },
  applied: { label: 'Applied', color: '#9c6500', bg: '#fef3c7' },
  offer_received: { label: 'Offer Received', color: '#1f6f5c', bg: '#e6f4ea' },
};

export default function StudentsList({
  students = [],
  selectedStudentId,
  onSelectStudent,
  loading,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesStage = stageFilter === 'all' || s.admission_stage === stageFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (s.full_name && s.full_name.toLowerCase().includes(term)) ||
        (s.course_name && s.course_name.toLowerCase().includes(term)) ||
        (s.university_name && s.university_name.toLowerCase().includes(term));

      return matchesStage && matchesSearch;
    });
  }, [students, searchTerm, stageFilter]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {/* Header & Controls */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>My Students</h3>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--bg)',
              padding: '2px 8px',
              borderRadius: '12px',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {students.length} Total
          </span>
        </div>

        {/* Search input */}
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Search by name, course, university..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', fontSize: 13, padding: '6px 10px' }}
          />
        </div>

        {/* Stage Filter Buttons */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'looking', label: 'Looking' },
            { id: 'applied', label: 'Applied' },
            { id: 'offer_received', label: 'Offer' },
          ].map((tab) => {
            const isSelected = stageFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStageFilter(tab.id)}
                style={{
                  padding: '3px 8px',
                  fontSize: 11,
                  borderRadius: '12px',
                  background: isSelected ? 'var(--accent)' : 'var(--bg)',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Student Items List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {students.length === 0
              ? 'No students currently assigned to you.'
              : 'No students matching your filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredStudents.map((student) => {
              const isSelected = selectedStudentId === student.id;
              const stageConfig = STAGE_CONFIG[student.admission_stage] || STAGE_CONFIG.looking;

              return (
                <div
                  key={student.id}
                  onClick={() => onSelectStudent(student.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isSelected ? '#eef6f3' : 'var(--surface)',
                    borderLeft: isSelected ? '4px solid var(--accent)' : '4px solid transparent',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--surface)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {student.full_name}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: stageConfig.color,
                        background: stageConfig.bg,
                        border: `1px solid ${stageConfig.color}33`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {stageConfig.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{student.course_name || 'No course assigned'}</span>
                    {student.university_name && (
                      <>
                        <span>•</span>
                        <span>{student.university_name}</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>
                      {student.phone ? `📞 ${student.phone}` : ''}
                    </span>
                    {student.notes_count > 0 && (
                      <span style={{ fontSize: 11, background: 'var(--bg)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        📝 {student.notes_count} {student.notes_count === 1 ? 'note' : 'notes'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
