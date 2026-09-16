import React, { useEffect, useState } from 'react';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('supabaseToken') || '';
      const res = await fetch('http://localhost:4000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(id, role) {
    try {
      const token = localStorage.getItem('supabaseToken') || '';
      await fetch(`http://localhost:4000/api/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ role })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-card">
      <h2>User Roles & Invites</h2>
      <div style={{ marginBottom: '16px' }}>
        <button className="action-btn">Invite New User</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.full_name}</td>
              <td>{u.phone || 'N/A'}</td>
              <td>
                <span className={`badge ${u.role}`}>{u.role}</span>
              </td>
              <td>
                <select 
                  value={u.role} 
                  onChange={e => updateRole(u.id, e.target.value)}
                  style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                >
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
