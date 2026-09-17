import React, { useState, useEffect } from 'react';
import { getMentorClasses, getMentorCourses, markAttendance } from './mentorApi';

export default function AttendanceTracker({ session, students = [], onAttendanceSaved }) {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form state
  const [selectedClassId, setSelectedClassId] = useState('new');
  const [courseId, setCourseId] = useState('');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  
  // Attendance records map: { [studentId]: 'present' | 'absent' | 'excused' }
  const [studentAttendance, setStudentAttendance] = useState({});

  useEffect(() => {
    loadData();
  }, [session]);

  // Initialize attendance map whenever students change
  useEffect(() => {
    const initialMap = {};
    students.forEach((s) => {
      initialMap[s.id] = studentAttendance[s.id] || 'present';
    });
    setStudentAttendance(initialMap);
  }, [students]);

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [classesData, coursesData] = await Promise.all([
        getMentorClasses(session),
        getMentorCourses(session),
      ]);
      setClasses(classesData || []);
      setCourses(coursesData || []);
      if (coursesData && coursesData.length > 0 && !courseId) {
        setCourseId(coursesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes/courses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = async (classId) => {
    setSelectedClassId(classId);
    setFeedback(null);

    if (classId === 'new') {
      setTopic('');
      setSessionDate(new Date().toISOString().split('T')[0]);
      // Reset all to present
      const map = {};
      students.forEach((s) => { map[s.id] = 'present'; });
      setStudentAttendance(map);
      return;
    }

    const cls = classes.find((c) => c.id === classId);
    if (cls) {
      setTopic(cls.topic || '');
      setSessionDate(cls.session_date || new Date().toISOString().split('T')[0]);
      if (cls.course_id) setCourseId(cls.course_id);

      // Fetch existing records for this class
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/mentors/me/classes/${classId}/attendance`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const map = {};
          students.forEach((s) => { map[s.id] = 'present'; });
          (data.records || []).forEach((r) => {
            map[r.student_id] = r.status;
          });
          setStudentAttendance(map);
        }
      } catch (err) {
        console.error('Failed to load class attendance', err);
      }
    }
  };

  const handleSetStatus = (studentId, status) => {
    setStudentAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSetAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setStudentAttendance(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (selectedClassId === 'new') {
      if (!sessionDate || !topic.trim()) {
        setFeedback({ type: 'error', text: 'Please fill in session date and topic' });
        return;
      }
    }

    if (students.length === 0) {
      setFeedback({ type: 'error', text: 'No students available to record attendance for' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const records = students.map((s) => ({
        student_id: s.id,
        status: studentAttendance[s.id] || 'present',
      }));

      const payload = {
        class_id: selectedClassId === 'new' ? null : selectedClassId,
        course_id: courseId || null,
        session_date: sessionDate,
        topic: topic.trim(),
        records,
      };

      await markAttendance(session, payload);
      setFeedback({ type: 'success', text: 'Attendance recorded successfully!' });
      await loadData();
      if (onAttendanceSaved) onAttendanceSaved();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner / Session Selector */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Mark Class Attendance</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select Session:</label>
            <select
              value={selectedClassId}
              onChange={(e) => handleSelectClass(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px' }}
            >
              <option value="new">+ Create New Class Session</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.session_date} — {cls.topic} ({cls.course_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Session details form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            background: 'var(--bg)',
            padding: '14px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={selectedClassId !== 'new'}
              style={{ width: '100%', fontSize: 13 }}
            >
              <option value="">General Session (No specific course)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
              Session Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
              Session Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Chapter 4: Calculus Review & Practice"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '18px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: 14 }}>Student Attendance Roster</h4>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Mark attendance for your {students.length} assigned students
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="secondary"
              onClick={() => handleSetAll('present')}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              Mark All Present
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => handleSetAll('absent')}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
            No students are currently assigned to you.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Course</th>
                <th style={{ textAlign: 'center' }}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const currentStatus = studentAttendance[student.id] || 'present';
                return (
                  <tr key={student.id}>
                    <td style={{ fontWeight: 600 }}>{student.full_name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {student.course_name || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        {[
                          { id: 'present', label: 'Present', color: '#1f6f5c', activeBg: '#e6f4ea' },
                          { id: 'absent', label: 'Absent', color: '#b3412c', activeBg: '#fbeae5' },
                          { id: 'excused', label: 'Excused', color: '#9c6500', activeBg: '#fef3c7' },
                        ].map((btn) => {
                          const isActive = currentStatus === btn.id;
                          return (
                            <button
                              key={btn.id}
                              type="button"
                              onClick={() => handleSetStatus(student.id, btn.id)}
                              style={{
                                padding: '4px 12px',
                                fontSize: 12,
                                borderRadius: '14px',
                                background: isActive ? btn.activeBg : 'transparent',
                                color: isActive ? btn.color : 'var(--text-muted)',
                                border: `1px solid ${isActive ? btn.color : 'var(--border)'}`,
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
          }}
        >
          {feedback ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: feedback.type === 'error' ? 'var(--danger)' : 'var(--accent)',
              }}
            >
              {feedback.text}
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || students.length === 0}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Saving Attendance...' : 'Save Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}
