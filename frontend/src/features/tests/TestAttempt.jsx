import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/supabaseClient';

export default function TestAttempt() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'history'

  // Available tests state
  const [availableTests, setAvailableTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);

  // Active Test Runner state
  const [activeTest, setActiveTest] = useState(null); // full test obj with questions
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [qId]: optionString }
  const [loadingTestDetails, setLoadingTestDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Score Reveal state
  const [testResult, setTestResult] = useState(null); // payload from POST submit

  // History state
  const [historyResults, setHistoryResults] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [error, setError] = useState(null);

  // Fetch available tests for student
  const loadAvailableTests = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingTests(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/tests/students/me/tests`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load available tests');
      const data = await res.json();
      setAvailableTests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTests(false);
    }
  }, [session?.access_token]);

  // Fetch history results
  const loadHistory = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tests/students/me/results`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load test history');
      const data = await res.json();
      setHistoryResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadAvailableTests();
  }, [loadAvailableTests]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Start taking a test
  const handleStartTest = async (testId) => {
    if (!session?.access_token) return;
    setLoadingTestDetails(true);
    setError(null);
    setTestResult(null);
    setSelectedAnswers({});
    setCurrentQIndex(0);

    try {
      const res = await fetch(`${API_BASE_URL}/tests/${testId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load test questions');
      const data = await res.json();
      setActiveTest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTestDetails(false);
    }
  };

  // Option selection
  const handleSelectOption = (questionId, optionValue) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionValue,
    }));
  };

  // Submit test
  const handleSubmitTest = async () => {
    if (!activeTest || !session?.access_token) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/tests/students/me/tests/${activeTest.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ answers: selectedAnswers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit test');

      setTestResult(data);
      loadAvailableTests(); // refresh status
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------
  // 1. RENDER SCORE REVEAL SCREEN
  // -----------------------------------------------------------------
  if (testResult) {
    const passed = testResult.score >= 60;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Score Header Card */}
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '24px',
            borderColor: passed ? 'var(--accent)' : 'var(--danger)',
            background: passed ? '#f2f9f7' : '#fff7f5',
          }}
        >
          <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Assessment Result
          </div>

          <div
            style={{
              fontSize: '48px',
              fontWeight: '800',
              margin: '12px 0 4px 0',
              color: passed ? 'var(--accent)' : 'var(--danger)',
            }}
          >
            {testResult.score}%
          </div>

          <h3 style={{ margin: '0 0 8px 0', color: passed ? 'var(--accent)' : 'var(--danger)' }}>
            {passed ? 'Great job! You passed.' : 'Needs Improvement'}
          </h3>

          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Correct answers: <strong>{testResult.correct_count}</strong> of <strong>{testResult.total_questions}</strong>
          </p>

          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => {
                setTestResult(null);
                setActiveTest(null);
                setActiveTab('available');
              }}
            >
              Back to Available Tests
            </button>
          </div>
        </div>

        {/* Answer Breakdown */}
        {testResult.details && testResult.details.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>Detailed Answer Breakdown</h3>

            {testResult.details.map((item, idx) => (
              <div
                key={item.question_id || idx}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '14px',
                  background: item.is_correct ? '#f4fbf9' : '#fdf3f2',
                  borderColor: item.is_correct ? 'var(--accent)' : 'var(--danger)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontWeight: '600' }}>
                    Q{idx + 1}. {item.question_text}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      color: item.is_correct ? 'var(--accent)' : 'var(--danger)',
                      background: '#fff',
                    }}
                  >
                    {item.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <div style={{ marginTop: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Your Answer: </span>
                    <strong style={{ color: item.is_correct ? 'var(--accent)' : 'var(--danger)' }}>
                      {item.selected_option || '(No answer provided)'}
                    </strong>
                  </div>
                  {!item.is_correct && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Correct Answer: </span>
                      <strong style={{ color: 'var(--accent)' }}>{item.correct_option}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------
  // 2. RENDER ACTIVE TEST RUNNER
  // -----------------------------------------------------------------
  if (activeTest) {
    const questions = activeTest.questions || [];
    const currentQ = questions[currentQIndex];
    const totalQ = questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;

    if (loadingTestDetails) {
      return (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading test questions...</p>
        </div>
      );
    }

    if (totalQ === 0) {
      return (
        <div className="card" style={{ padding: '24px' }}>
          <h3>No Questions Found</h3>
          <p>This test does not contain any questions yet.</p>
          <button className="secondary" onClick={() => setActiveTest(null)}>
            Back to Tests
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '12px',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{activeTest.title}</h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              Progress: {currentQIndex + 1} of {totalQ} questions ({answeredCount} answered)
            </p>
          </div>
          <button
            className="secondary"
            onClick={() => {
              if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
                setActiveTest(null);
              }
            }}
          >
            Exit Test
          </button>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ background: '#e0ddd4', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              background: 'var(--accent)',
              height: '100%',
              width: `${((currentQIndex + 1) / totalQ) * 100}%`,
              transition: 'width 0.2s ease',
            }}
          />
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'var(--danger)', background: '#fff5f5', padding: '12px' }}>
            <span className="error-text">{error}</span>
          </div>
        )}

        {/* Current Question Display Card */}
        {currentQ && (
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                QUESTION {currentQIndex + 1} OF {totalQ}
              </span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '18px' }}>{currentQ.question_text}</h3>
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentQ.options || []).map((opt, oIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === opt;
                return (
                  <div
                    key={oIdx}
                    onClick={() => handleSelectOption(currentQ.id, opt)}
                    style={{
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? '#f0f9f6' : 'var(--surface)',
                      borderRadius: 'var(--radius)',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'border 0.15s ease, background 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-option-${currentQ.id}`}
                      checked={isSelected}
                      onChange={() => handleSelectOption(currentQ.id, opt)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: isSelected ? '600' : '400' }}>{opt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Navigation & Submit Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="secondary"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
          >
            &larr; Previous Question
          </button>

          {currentQIndex < totalQ - 1 ? (
            <button onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}>
              Next Question &rarr;
            </button>
          ) : (
            <button
              style={{ background: 'var(--accent)' }}
              disabled={submitting}
              onClick={() => {
                if (answeredCount < totalQ) {
                  if (!window.confirm(`You answered ${answeredCount} of ${totalQ} questions. Are you sure you want to submit?`)) {
                    return;
                  }
                }
                handleSubmitTest();
              }}
            >
              {submitting ? 'Submitting Answers...' : 'Submit Assessment'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // 3. MAIN DASHBOARD TAB VIEW (Available Tests / Results History)
  // -----------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Tests & Practice Assessments</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Take practice tests for your course and track your score history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={activeTab === 'available' ? '' : 'secondary'}
            onClick={() => setActiveTab('available')}
          >
            Available Tests
          </button>
          <button
            className={activeTab === 'history' ? '' : 'secondary'}
            onClick={() => setActiveTab('history')}
          >
            My Results History
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', background: '#fff5f5', padding: '12px' }}>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Tab 1: Available Tests */}
      {activeTab === 'available' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loadingTests ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading available tests...
            </div>
          ) : availableTests.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No tests are currently assigned for your course. Check back soon!
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {availableTests.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#e0ddd4',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '500',
                        }}
                      >
                        {t.course_name}
                      </span>

                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          background: t.completed ? '#e6f4f1' : '#f5f5f5',
                          color: t.completed ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                      >
                        {t.completed ? `Completed (${t.score}%)` : 'Not Attempted'}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>{t.title}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
                      {t.question_count} Multiple-choice questions
                    </p>
                  </div>

                  <div>
                    <button
                      style={{ width: '100%' }}
                      className={t.completed ? 'secondary' : ''}
                      onClick={() => handleStartTest(t.id)}
                    >
                      {t.completed ? 'Retake Test' : 'Start Assessment →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Results History */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loadingHistory ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading results history...
            </div>
          ) : historyResults.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              You haven't completed any tests yet.
            </div>
          ) : (
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Test Title</th>
                  <th>Course</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {historyResults.map((r) => {
                  const passed = Number(r.score) >= 60;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '600' }}>{r.test_title}</td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.course_name}</span>
                      </td>
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
                          }}
                        >
                          {passed ? 'Passed' : 'Needs Work'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(r.submitted_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
