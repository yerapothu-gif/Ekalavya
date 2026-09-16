import React, { useState } from 'react';
import './AdminDashboard.css';
import AnalyticsTab from './AnalyticsTab';
import StudentsTab from './StudentsTab';
import MentorsTab from './MentorsTab';
import CoursesUnivsTab from './CoursesUnivsTab';
import UsersTab from './UsersTab';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');

  const renderTab = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsTab />;
      case 'students':
        return <StudentsTab />;
      case 'mentors':
        return <MentorsTab />;
      case 'courses':
        return <CoursesUnivsTab />;
      case 'users':
        return <UsersTab />;
      default:
        return <AnalyticsTab />;
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <nav className="admin-nav">
          <button 
            className={activeTab === 'analytics' ? 'active' : ''} 
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={activeTab === 'students' ? 'active' : ''} 
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button 
            className={activeTab === 'mentors' ? 'active' : ''} 
            onClick={() => setActiveTab('mentors')}
          >
            Mentors
          </button>
          <button 
            className={activeTab === 'courses' ? 'active' : ''} 
            onClick={() => setActiveTab('courses')}
          >
            Courses & Univs
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''} 
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </nav>
      </header>

      <main className="admin-content">
        {renderTab()}
      </main>
    </div>
  );
}
