import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/supabaseClient';
import TestResultsView from './TestResultsView';

export default function TestCreator() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [selectedTestId, setSelectedTestId] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([
    {
      id: 1,
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
    },
  ]);

  // Data Loading
  const [createdTests, setCreatedTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch Courses
  useEffect(() => {
    if (!session?.access_token) return;

    fetch(`${API_BASE_URL}/tests/courses`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      })
      .catch(() => {});
  }, [session?.access_token]);

  // Fetch Mentor Created Tests
  const loadMyTests = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/tests/mentor/my-tests`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load created tests');
      const data = await res.json();
      setCreatedTests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadMyTests();
  }, [loadMyTests]);

  // Handle Question Manipulation
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionTextChange = (index, value) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index].text = value;
      return next;
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setQuestions((prev) => {
      const next = [...prev];
      const newOpts = [...next[qIndex].options];
      newOpts[optIndex] = value;
      next[qIndex].options = newOpts;
      return next;
    });
  };

  const handleAddOption = (qIndex) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].options = [...next[qIndex].options, ''];
      return next;
    });
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[qIndex].options.length <= 2) return prev;
      const newOpts = next[qIndex].options.filter((_, i) => i !== optIndex);
      let newCorrectIndex = next[qIndex].correctOptionIndex;
      if (newCorrectIndex >= newOpts.length) {
        newCorrectIndex = newOpts.length - 1;
      }
      next[qIndex].options = newOpts;
      next[qIndex].correctOptionIndex = newCorrectIndex;
      return next;
    });
  };

  const handleCorrectOptionChange = (qIndex, optIndex) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].correctOptionIndex = optIndex;
      return next;
    });
  };

  // Submit New Test
  const handleSubmitTest = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setError('Please provide a test title.');
      return;
    }

    if (questions.length === 0) {
      setError('At least one question is required.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question #${i + 1} text cannot be empty.`);
        return;
      }
      const validOptions = q.options.filter((o) => o.trim() !== '');
      if (validOptions.length < 2) {
        setError(`Question #${i + 1} must have at least 2 non-empty options.`);
        return;
      }
      const selectedOptionText = q.options[q.correctOptionIndex];
      if (!selectedOptionText || !selectedOptionText.trim()) {
        setError(`Question #${i + 1} correct option selection is empty.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        course_id: courseId || null,
        questions: questions.map((q) => {
          const filledOptions = q.options.filter((o) => o.trim() !== '');
          const correctText = q.options[q.correctOptionIndex]?.trim() || filledOptions[0];
          return {
            question_text: q.text.trim(),
            options: filledOptions,
            correct_option: correctText,
          };
        }),
      };

      const res = await fetch(`${API_BASE_URL}/tests/mentors/me/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create test');
      }

      setSuccessMsg('Test created successfully!');
      setTitle('');
      setCourseId('');
      setQuestions([
        {
          id: Date.now(),
          text: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
        },
      ]);
      loadMyTests();
      setTimeout(() => {
        setActiveTab('list');
        setSuccessMsg(null);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Render detail view if a test is selected
  if (selectedTestId) {
    return <TestResultsView testId={selectedTestId} onBack={() => setSelectedTestId(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Tabs */}
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
          <h2 style={{ margin: 0 }}>Tests & Assessments</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Create course tests and evaluate student responses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={activeTab === 'list' ? '' : 'secondary'}
            onClick={() => {
              setActiveTab('list');
              setError(null);
            }}
          >
            My Created Tests ({createdTests.length})
          </button>
          <button
            className={activeTab === 'create' ? '' : 'secondary'}
            onClick={() => {
              setActiveTab('create');
              setError(null);
            }}
          >
            + Create New Test
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', background: '#fff5f5', padding: '12px 16px' }}>
          <span className="error-text">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ borderColor: 'var(--accent)', background: '#e6f4f1', padding: '12px 16px' }}>
          <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{successMsg}</span>
        </div>
      )}

      {/* Tab 1: Created Tests List */}
      {activeTab === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading tests...
            </div>
          ) : createdTests.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)' }}>You haven't created any tests yet.</p>
              <button onClick={() => setActiveTab('create')}>+ Create Your First Test</button>
            </div>
          ) : (
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Test Title</th>
                  <th>Course</th>
                  <th>Questions</th>
                  <th>Submissions</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {createdTests.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: '600' }}>{t.title}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '12px',
                          background: '#e0ddd4',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {t.course_name}
                      </span>
                    </td>
                    <td>{t.question_count}</td>
                    <td>
                      <span style={{ fontWeight: '500' }}>{t.submission_count}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="secondary"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={() => setSelectedTestId(t.id)}
                      >
                        View Results &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Create Test Form */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmitTest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>Test General Information</h3>

            <div className="form-row">
              <label htmlFor="test-title-input">Test Title *</label>
              <input
                id="test-title-input"
                type="text"
                placeholder="e.g. Data Structures & Algorithms — Midterm Assessment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="test-course-select">Target Course (Optional)</label>
              <select
                id="test-course-select"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">-- All Enrolled Students / General --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category || 'General'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Questions Builder */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Questions ({questions.length})</h3>
              <button type="button" className="secondary" onClick={handleAddQuestion}>
                + Add Question
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '16px',
                  background: 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Question #{qIndex + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="secondary"
                      style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px' }}
                      onClick={() => handleRemoveQuestion(qIndex)}
                    >
                      Remove Question
                    </button>
                  )}
                </div>

                <div className="form-row">
                  <label htmlFor={`q-text-${qIndex}`}>Question Prompt *</label>
                  <input
                    id={`q-text-${qIndex}`}
                    type="text"
                    placeholder="Enter the question text here..."
                    value={q.text}
                    onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                    required
                  />
                </div>

                {/* Multiple Choice Options */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    Options (Select radio button for the CORRECT option):
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name={`correct-opt-${q.id}`}
                          checked={q.correctOptionIndex === optIndex}
                          onChange={() => handleCorrectOptionChange(qIndex, optIndex)}
                          style={{ cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                          style={{ flex: 1 }}
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            className="secondary"
                            style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--text-muted)' }}
                            onClick={() => handleRemoveOption(qIndex, optIndex)}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="secondary"
                    style={{ marginTop: '8px', fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => handleAddOption(qIndex)}
                  >
                    + Add Option Choice
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="secondary"
              onClick={() => setActiveTab('list')}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Publishing Test...' : 'Publish Test'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
