import { useState } from 'react';
import StudentsTab from './components/StudentsTab.jsx';
import MentorsTab from './components/MentorsTab.jsx';
import CoursesUniversitiesTab from './components/CoursesUniversitiesTab.jsx';
import UsersTab from './components/UsersTab.jsx';
import AnalyticsTab from './components/AnalyticsTab.jsx';

const TABS = [
  { key: 'students', label: 'Students', Component: StudentsTab },
  { key: 'mentors', label: 'Mentors', Component: MentorsTab },
  { key: 'courses', label: 'Courses & Universities', Component: CoursesUniversitiesTab },
  { key: 'users', label: 'Users', Component: UsersTab },
  { key: 'analytics', label: 'Analytics', Component: AnalyticsTab },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('students');
  const Active = TABS.find((t) => t.key === tab)?.Component || StudentsTab;

  return (
    <div>
      <h2>Admin Dashboard</h2>

      <div
        role="tablist"
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20, flexWrap: 'wrap' }}
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

      <Active />
    </div>
  );
}
