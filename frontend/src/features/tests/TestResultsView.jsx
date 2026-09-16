import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/supabaseClient';

export default function TestResultsView({ testId, onBack }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!testId || !session?.access_token) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/tests/mentors/me/tests/${testId}/results`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load test results');
        }
        return res.json();
      })
      .then((resData) => {
        if (isMounted) {
          setData(resData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [testId, session?.access_token]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading test results & analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: 'var(--danger)' }}>Error Loading Results</h3>
          {onBack && (
            <button className="secondary" onClick={onBack}>
              &larr; Back to Tests
            </button>
          )}
        </div>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  const { test, summary, results } = data || {};
  const filteredResults = (results || []).filter((r) =>
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0' }}>{test?.title || 'Test Results'}</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            {test?.question_count} Questions total
          </p>
        </div>
        {onBack && (
          <button className="secondary" onClick={onBack}>
            &larr; Back to Tests
          </button>
        )}
      </div>

      {/* Summary KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total Attempts
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary?.total_submissions ?? 0}</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Average Score
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color:
                summary?.average_score >= 75
                  ? 'var(--accent)'
                  : summary?.average_score >= 50
                  ? '#d97706'
                  : 'var(--danger)',
            }}
          >
            {summary?.average_score ?? 0}%
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Pass Rate (≥60%)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>
            {summary?.pass_rate ?? 0}%
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Score Range
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginTop: '4px' }}>
            {summary?.min_score ?? 0}% - {summary?.max_score ?? 0}%
          </div>
        </div>
      </div>

      {/* Score Distribution Breakdown */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Score Distribution Across Students</h4>
        {summary?.total_submissions === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            No students have completed this test yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>High Performers (75% - 100%)</span>
                <span>{summary?.distribution?.range75to100 ?? 0} students</span>
              </div>
              <div style={{ background: '#e0ddd4', height: '10px', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: 'var(--accent)',
                    height: '100%',
                    width: `${((summary?.distribution?.range75to100 || 0) / summary.total_submissions) * 100}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Moderate Performers (50% - 74%)</span>
                <span>{summary?.distribution?.range50to74 ?? 0} students</span>
              </div>
              <div style={{ background: '#e0ddd4', height: '10px', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#d97706',
                    height: '100%',
                    width: `${((summary?.distribution?.range50to74 || 0) / summary.total_submissions) * 100}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Needs Improvement (&lt;50%)</span>
                <span>{summary?.distribution?.below50 ?? 0} students</span>
              </div>
              <div style={{ background: '#e0ddd4', height: '10px', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: 'var(--danger)',
                    height: '100%',
                    width: `${((summary?.distribution?.below50 || 0) / summary.total_submissions) * 100}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Submissions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h4 style={{ margin: 0 }}>Student Results ({filteredResults.length})</h4>
          <input
            type="text"
            placeholder="Search student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '220px', fontSize: '13px' }}
          />
        </div>

        {filteredResults.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No student results found matching your query.
          </div>
        ) : (
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Score</th>
                <th>Status</th>
                <th>Submitted Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => {
                const passed = r.score >= 60;
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '500' }}>{r.student_name}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 'bold',
                          color: passed ? 'var(--accent)' : 'var(--danger)',
                        }}
                      >
                        {r.score}%
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          background: passed ? '#e6f4f1' : '#fce8e6',
                          color: passed ? 'var(--accent)' : 'var(--danger)',
                          display: 'inline-block',
                        }}
                      >
                        {passed ? 'Passed' : 'Needs Retake'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(r.submitted_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
