import { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getMyProfile, updateMyProfile, getMyAttendance, getMyUniversities } from './api/studentApi';
import useAsyncData from './hooks/useAsyncData';
import AdmissionTracker from './components/AdmissionTracker.jsx';
import MentorCard from './components/MentorCard.jsx';
import CourseCard from './components/CourseCard.jsx';
import ProfileSection from './components/ProfileSection.jsx';
import AttendanceTable from './components/AttendanceTable.jsx';
import UniversityList from './components/UniversityList.jsx';
import ExternalPanelBoundary from './components/ExternalPanelBoundary.jsx';
import TestAttempt from '../tests/TestAttempt';
import SummaryPanel from '../ai-summary/SummaryPanel';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'profile', label: 'Profile' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'tests', label: 'Tests' },
  { key: 'summary', label: 'AI Summary' },
];

export default function StudentDashboard() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [tab, setTab] = useState('overview');

  const fetchProfile = useCallback(() => getMyProfile(token), [token]);
  const fetchAttendance = useCallback(() => getMyAttendance(token), [token]);
  const fetchUniversities = useCallback(() => getMyUniversities(token), [token]);

  const profileState = useAsyncData(fetchProfile);
  const attendanceState = useAsyncData(fetchAttendance);
  const universitiesState = useAsyncData(fetchUniversities);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSaveProfile = async (payload) => {
    setSaving(true);
    setSaveError('');
    try {
      await updateMyProfile(token, payload);
      await profileState.reload();
      return true;
    } catch (err) {
      setSaveError(err.message || 'Failed to save profile');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Student Dashboard</h2>

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

      {tab === 'overview' && <OverviewTab profileState={profileState} />}

      {tab === 'profile' && (
        <ProfileSection
          student={profileState.data?.student}
          onSave={handleSaveProfile}
          saving={saving}
          error={saveError}
        />
      )}

      {tab === 'attendance' && <AttendanceTab attendanceState={attendanceState} />}

      {tab === 'opportunities' && <OpportunitiesTab universitiesState={universitiesState} />}

      {tab === 'tests' && (
        <ExternalPanelBoundary>
          <TestAttempt />
        </ExternalPanelBoundary>
      )}

      {tab === 'summary' && (
        <ExternalPanelBoundary>
          <SummaryPanel studentId={session?.user?.id} viewerRole="student" />
        </ExternalPanelBoundary>
      )}
    </div>
  );
}

function OverviewTab({ profileState }) {
  const { data, loading, error } = profileState;

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!data) return null;

  const { student, course, mentor } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>{student.name ? `Welcome, ${student.name}` : 'Welcome'}</h3>
        <AdmissionTracker stage={student.admissionStage} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <CourseCard course={course} />
        <MentorCard mentor={mentor} />
      </div>
    </div>
  );
}

function AttendanceTab({ attendanceState }) {
  const { data, loading, error } = attendanceState;

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div className="card">
      <h3>Attendance</h3>
      <AttendanceTable records={data?.attendance} />
    </div>
  );
}

function OpportunitiesTab({ universitiesState }) {
  const { data, loading, error } = universitiesState;

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div>
      <h3>Suggested Universities & Fellowships</h3>
      <UniversityList universities={data?.universities} />
    </div>
  );
}
