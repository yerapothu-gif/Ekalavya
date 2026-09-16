import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getMentorStudents,
  getMentorStudentDetail,
  updateAdmissionStage,
  addMentorNote,
} from './mentorApi';
import StudentsList from './StudentsList';
import StudentDetail from './StudentDetail';
import AttendanceTracker from './AttendanceTracker';

export default function MentorDashboard() {
  const { session, profile } = useAuth();

  const [activeView, setActiveView] = useState('caseload'); // 'caseload' | 'attendance'
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  // Load assigned students list
  const loadStudents = useCallback(async (autoSelectId = null) => {
    if (!session) return;
    setLoadingStudents(true);
    setError(null);
    try {
      const data = await getMentorStudents(session);
      setStudents(data || []);

      // If autoSelectId is given and exists, select it, else preserve or default to first
      if (data && data.length > 0) {
        const nextId =
          autoSelectId ||
          (data.find((s) => s.id === selectedStudentId) ? selectedStudentId : data[0].id);
        setSelectedStudentId(nextId);
      } else {
        setSelectedStudentId(null);
        setStudentDetail(null);
      }
    } catch (err) {
      console.error('Error loading mentor students:', err);
      setError(err.message || 'Failed to load assigned students');
    } finally {
      setLoadingStudents(false);
    }
  }, [session, selectedStudentId]);

  // Initial load
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Load detail whenever selectedStudentId changes
  const loadStudentDetail = useCallback(async (studentId) => {
    if (!session || !studentId) return;
    setLoadingDetail(true);
    try {
      const data = await getMentorStudentDetail(session, studentId);
      setStudentDetail(data);
    } catch (err) {
      console.error('Error loading student detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [session]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentDetail(selectedStudentId);
    }
  }, [selectedStudentId, loadStudentDetail]);

  // Handler for stage change
  const handleStageChange = async (newStage) => {
    if (!session || !selectedStudentId) return;
    await updateAdmissionStage(session, selectedStudentId, newStage);
    // Update local state
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudentId ? { ...s, admission_stage: newStage } : s
      )
    );
    if (studentDetail && studentDetail.student) {
      setStudentDetail((prev) => ({
        ...prev,
        student: { ...prev.student, admission_stage: newStage },
      }));
    }
  };

  // Handler for adding note
  const handleAddNote = async (studentId, noteText) => {
    if (!session || !studentId) return;
    const createdNote = await addMentorNote(session, studentId, noteText);
    // Append note to local timeline
    if (studentDetail && studentDetail.notes) {
      setStudentDetail((prev) => ({
        ...prev,
        notes: [createdNote, ...(prev.notes || [])],
      }));
    }
    // Update note count in student list
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, notes_count: (s.notes_count || 0) + 1 } : s
      )
    );
  };

  // Metrics for quick summary
  const metrics = React.useMemo(() => {
    const total = students.length;
    const looking = students.filter((s) => s.admission_stage === 'looking').length;
    const applied = students.filter((s) => s.admission_stage === 'applied').length;
    const offerReceived = students.filter((s) => s.admission_stage === 'offer_received').length;
    return { total, looking, applied, offerReceived };
  }, [students]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 4,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: 'var(--text)' }}>
            Mentor Dashboard
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Welcome back, {profile?.full_name || 'Mentor'}. Manage your student caseload and classes.
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 3,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveView('caseload')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              borderRadius: 'var(--radius)',
              background: activeView === 'caseload' ? 'var(--accent)' : 'transparent',
              color: activeView === 'caseload' ? '#fff' : 'var(--text)',
              border: 'none',
              fontWeight: activeView === 'caseload' ? 600 : 500,
            }}
          >
            📋 Caseload & Profiles
          </button>
          <button
            type="button"
            onClick={() => setActiveView('attendance')}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              borderRadius: 'var(--radius)',
              background: activeView === 'attendance' ? 'var(--accent)' : 'transparent',
              color: activeView === 'attendance' ? '#fff' : 'var(--text)',
              border: 'none',
              fontWeight: activeView === 'attendance' ? 600 : 500,
            }}
          >
            🗓️ Mark Attendance
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Assigned Students
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--text)' }}>
            {metrics.total}
          </div>
        </div>

        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Stage: Looking
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#5c6f84' }}>
            {metrics.looking}
          </div>
        </div>

        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Stage: Applied
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#9c6500' }}>
            {metrics.applied}
          </div>
        </div>

        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Stage: Offer Received
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--accent)' }}>
            {metrics.offerReceived}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fbeae5',
            color: 'var(--danger)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--danger)33',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {activeView === 'caseload' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: 16,
            minHeight: '600px',
            flex: 1,
          }}
        >
          {/* Left Column: Caseload list */}
          <StudentsList
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={(id) => setSelectedStudentId(id)}
            loading={loadingStudents}
          />

          {/* Right Column: Student detail view */}
          <StudentDetail
            detail={studentDetail}
            loading={loadingDetail}
            onStageChange={handleStageChange}
            onAddNote={handleAddNote}
          />
        </div>
      ) : (
        <AttendanceTracker
          session={session}
          students={students}
          onAttendanceSaved={() => {
            if (selectedStudentId) {
              loadStudentDetail(selectedStudentId);
            }
          }}
        />
      )}
    </div>
  );
}
