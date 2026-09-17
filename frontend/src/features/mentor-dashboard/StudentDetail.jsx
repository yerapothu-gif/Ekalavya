import React, { useState } from 'react';
import AdmissionStageUpdater from './AdmissionStageUpdater';
import NotesTimeline from './NotesTimeline';
import SummaryPanel from '../ai-summary/SummaryPanel';

export default function StudentDetail({
  detail,
  loading,
  onStageChange,
  onAddNote,
}) {
  const [activeTab, setActiveTab] = useState('notes');

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        Loading student profile...
      </div>
    );
  }

  if (!detail || !detail.student) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-muted)',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
          No Student Selected
        </div>
        <div style={{ fontSize: 13, marginTop: 4 }}>
          Select a student from the caseload list on the left to view their profile, notes, attendance, and progress summary.
        </div>
      </div>
    );
  }

  const { student, notes = [], attendance = [], test_results = [] } = detail;

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getAttendanceBadge = (status) => {
    switch (status) {
      case 'present':
        return { label: 'Present', color: '#1f6f5c', bg: '#e6f4ea' };
      case 'absent':
        return { label: 'Absent', color: '#b3412c', bg: '#fbeae5' };
      case 'excused':
        return { label: 'Excused', color: '#9c6500', bg: '#fef3c7' };
      default:
        return { label: status, color: '#6b6f66', bg: '#f0f0f0' };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        gap: 16,
      }}
    >
      {/* Student Profile Card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text)' }}>{student.full_name}</h2>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
              {student.phone && <span>📞 {student.phone}</span>}
              {student.joined_at && <span>Joined {formatDate(student.joined_at)}</span>}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 16,
            padding: '12px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Course
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
              {student.course?.name || 'Not Enrolled'}
            </div>
            {student.course?.category && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.course.category}</div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Target University
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
              {student.university?.name || 'Undecided'}
            </div>
            {student.university?.country && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {student.university.country} {student.university.fellowship_available ? '• Fellowship Available' : ''}
              </div>
            )}
          </div>
        </div>

        {student.bio && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
              Student Background / Bio
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>
              {student.bio}
            </div>
          </div>
        )}
      </div>

      {/* Admission Stage Flow */}
      <AdmissionStageUpdater
        studentId={student.id}
        currentStage={student.admission_stage}
        onStageChange={onStageChange}
      />

      {/* AI Progress Summary Section */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>AI Progress Report</h4>
        </div>
        <SummaryPanel studentId={student.id} viewerRole="mentor" />
      </div>

      {/* Section Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          gap: 8,
          background: 'var(--surface)',
          padding: '0 16px',
          borderRadius: 'var(--radius) var(--radius) 0 0',
        }}
      >
        {[
          { id: 'notes', label: `Mentor Notes (${notes.length})` },
          { id: 'attendance', label: `Attendance Records (${attendance.length})` },
          { id: 'tests', label: `Test Scores (${test_results.length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                borderRadius: 0,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                padding: '12px 14px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'notes' && (
        <NotesTimeline
          notes={notes}
          onAddNote={(text) => onAddNote(student.id, text)}
        />
      )}

      {activeTab === 'attendance' && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '16px',
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Class Attendance History</h4>
          {attendance.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
              No attendance records recorded for this student yet.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Session Date</th>
                  <th>Topic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((rec) => {
                  const badge = getAttendanceBadge(rec.status);
                  return (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 500 }}>{formatDate(rec.session_date)}</td>
                      <td>{rec.topic}</td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            color: badge.color,
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.color}33`,
                            textTransform: 'capitalize',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'tests' && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '16px',
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Test & Assessment Scores</h4>
          {test_results.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
              No tests submitted yet by this student.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Test Title</th>
                  <th>Score</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {test_results.map((tr) => (
                  <tr key={tr.id}>
                    <td style={{ fontWeight: 500 }}>{tr.title}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: tr.score >= 70 ? 'var(--accent)' : 'var(--text)',
                        }}
                      >
                        {tr.score !== null && tr.score !== undefined ? `${tr.score}%` : '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(tr.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
