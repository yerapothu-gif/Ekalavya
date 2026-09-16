import React, { useEffect, useState } from 'react';

export default function MentorsTab() {
  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For matching
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem('supabaseToken') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [mRes, sRes] = await Promise.all([
        fetch('http://localhost:4000/api/admin/mentors', { headers }),
        fetch('http://localhost:4000/api/admin/students', { headers })
      ]);
      
      if (mRes.ok) setMentors(await mRes.json());
      if (sRes.ok) setStudents(await sRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMatch(e) {
    e.preventDefault();
    if (!selectedStudent || !selectedMentor) return alert('Select both');
    try {
      const token = localStorage.getItem('supabaseToken') || '';
      const res = await fetch('http://localhost:4000/api/admin/match', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ student_id: selectedStudent, mentor_id: selectedMentor })
      });
      if (res.ok) {
        alert('Match created successfully!');
        fetchData(); // refresh
      } else {
        alert('Failed to create match');
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="admin-card">
        <h2>Mentor Workload</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Expertise</th>
              <th>Current Workload</th>
              <th>Max Students</th>
            </tr>
          </thead>
          <tbody>
            {mentors.map(m => (
              <tr key={m.id}>
                <td>{m.users_profile?.full_name || 'N/A'}</td>
                <td>{m.expertise?.join(', ') || 'N/A'}</td>
                <td>
                  <span className={`badge ${m.current_workload >= m.max_students ? 'admin' : 'student'}`}>
                    {m.current_workload}
                  </span>
                </td>
                <td>{m.max_students}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-card">
        <h2>Assign / Reassign Match</h2>
        <form onSubmit={handleMatch} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Select Student</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <option value="">-- Choose Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.users_profile?.full_name || s.id} (Mentor: {s.mentor_id ? 'Assigned' : 'None'})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Select Mentor</label>
            <select value={selectedMentor} onChange={e => setSelectedMentor(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <option value="">-- Choose Mentor --</option>
              {mentors.map(m => (
                <option key={m.id} value={m.id}>{m.users_profile?.full_name || m.id} ({m.current_workload}/{m.max_students})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="action-btn" style={{ padding: '8px 16px' }}>Assign Mentor</button>
        </form>
      </div>
    </div>
  );
}
