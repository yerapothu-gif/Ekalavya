import React, { useEffect, useState } from 'react';

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [univs, setUnivs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = localStorage.getItem('supabaseToken') || '';
        
        const [overviewRes, univsRes] = await Promise.all([
          fetch('http://localhost:4000/api/admin/analytics/overview', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:4000/api/admin/analytics/universities', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (overviewRes.ok && univsRes.ok) {
          const overview = await overviewRes.json();
          const univData = await univsRes.json();
          setData(overview);
          setUnivs(univData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading analytics...</div>;
  if (!data) return <div>Error loading analytics.</div>;

  return (
    <div>
      <div className="grid-2">
        <div className="admin-card">
          <h2>Admission Funnel</h2>
          <div className="funnel-chart" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="funnel-stage">
              Looking ({data.funnel.looking})
            </div>
            <div className="funnel-stage">
              Applied ({data.funnel.applied})
            </div>
            <div className="funnel-stage">
              Offer Received ({data.funnel.offer_received})
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h2>Attendance</h2>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', background: `conic-gradient(var(--teal-accent) ${data.attendancePercent}%, #e2e8f0 0)` }}>
              <div style={{ position: 'absolute', inset: '10px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {data.attendancePercent}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="admin-card">
          <h2>Average Test Scores by Course</h2>
          <div className="bar-chart-container">
            {data.avgScoresByCourse.length > 0 ? data.avgScoresByCourse.map(score => (
              <div className="bar-row" key={score.course_id}>
                <div className="bar-label" title={score.course_id}>Course {score.course_id.substring(0, 5)}...</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(100, score.avgScore)}%` }}></div>
                </div>
                <div className="bar-value">{score.avgScore}</div>
              </div>
            )) : <p>No test data available.</p>}
          </div>
        </div>

        <div className="admin-card">
          <h2>Applicants per University</h2>
          <div className="bar-chart-container">
            {univs && univs.length > 0 ? univs.map(u => (
              <div className="bar-row" key={u.name}>
                <div className="bar-label">{u.name}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(100, u.count * 10)}%` }}></div>
                </div>
                <div className="bar-value">{u.count}</div>
              </div>
            )) : <p>No applicant data available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
