import React, { useEffect, useState } from 'react';

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const token = localStorage.getItem('supabaseToken') || '';
      const res = await fetch('http://localhost:4000/api/admin/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStudents(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-card">
      <h2>Student Management</h2>
      <div style={{ marginBottom: '16px' }}>
        <button className="action-btn">Add New Student</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Course</th>
            <th>Stage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id}>
              <td>{s.users_profile?.full_name || 'N/A'}</td>
              <td>{s.users_profile?.phone || 'N/A'}</td>
              <td>{s.courses?.name || 'Unassigned'}</td>
              <td>{s.admission_stage}</td>
              <td>
                <button className="action-btn" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
