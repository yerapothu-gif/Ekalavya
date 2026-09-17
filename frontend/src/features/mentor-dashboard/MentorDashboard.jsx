import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getMyStudents, getStudentDetail, updateStudentStage, addNote } from './api/mentorApi';
import StudentList from './components/StudentList.jsx';
import StudentDetail from './components/StudentDetail.jsx';
import AttendanceMarker from './components/AttendanceMarker.jsx';
import ExternalPanelBoundary from '../student-dashboard/components/ExternalPanelBoundary.jsx';
import TestCreator from '../tests/TestCreator';

const TABS = [
  { key: 'students', label: 'My Students' },
  { key: 'attendance', label: 'Mark Attendance' },
  { key: 'tests', label: 'Tests & Assessments' },
];

export default function MentorDashboard() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [tab, setTab] = useState('students');

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadStudents = useCallback(async () => {
    if (!token) return;
    setStudentsLoading(true);
    setStudentsError('');
    try {
      const data = await getMyStudents(token);
      setStudents(data.students || []);
    } catch (err) {
      setStudentsError(err.message);
    } finally {
      setStudentsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const loadDetail = useCallback(
    async (id) => {
      if (!token || !id) return;
      setDetailLoading(true);
      setDetailError('');
      try {
        const data = await getStudentDetail(token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(err.message);
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const handleSelect = (id) => {
    setSelectedId(id);
    loadDetail(id);
  };

  const handleUpdateStage = async (stage) => {
    try {
      await updateStudentStage(token, selectedId, stage);
      await loadDetail(selectedId);
      await loadStudents();
      return true;
    } catch {
      return false;
    }
  };

  const handleAddNote = async (text) => {
    try {
      await addNote(token, selectedId, text);
      await loadDetail(selectedId);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div>
      <h2>Mentor Dashboard</h2>

      <div
        role="tablist"
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            style={{
              border: 'none',
              borderRadius: 0,
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: tab === t.key ? 700 : 500,
              padding: '8px 4px',
              marginRight: 12,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
          <StudentList
            students={students}
            selectedId={selectedId}
            onSelect={handleSelect}
            loading={studentsLoading}
            error={studentsError}
          />
          <StudentDetail
            detail={detail}
            loading={detailLoading}
            error={detailError}
            onUpdateStage={handleUpdateStage}
            onAddNote={handleAddNote}
          />
        </div>
      )}

      {tab === 'attendance' && (
        <AttendanceMarker students={students.map((s) => ({ id: s.id, name: s.name }))} />
      )}

      {tab === 'tests' && (
        <ExternalPanelBoundary>
          <TestCreator />
        </ExternalPanelBoundary>
      )}
    </div>
  );
}
