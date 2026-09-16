import React, { useEffect, useState } from 'react';

export default function CoursesUnivsTab() {
  const [courses, setCourses] = useState([]);
  const [univs, setUnivs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem('supabaseToken') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [cRes, uRes] = await Promise.all([
        fetch('http://localhost:4000/api/admin/courses', { headers }),
        fetch('http://localhost:4000/api/admin/universities', { headers })
      ]);
      
      if (cRes.ok) setCourses(await cRes.json());
      if (uRes.ok) setUnivs(await uRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid-2">
      <div className="admin-card">
        <h2>Courses</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="action-btn" style={{ marginTop: '16px' }}>Add Course</button>
      </div>

      <div className="admin-card">
        <h2>Universities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {univs.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.country}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="action-btn" style={{ marginTop: '16px' }}>Add University</button>
      </div>
    </div>
  );
}
