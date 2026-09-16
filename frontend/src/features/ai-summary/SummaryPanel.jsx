import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../lib/supabaseClient';
import styles from './SummaryPanel.module.css';

/**
 * SummaryPanel — Displays and generates AI-assisted student progress summaries.
 * 
 * @param {Object} props
 * @param {string} props.studentId - ID of the student.
 * @param {'student' | 'mentor' | 'admin'} [props.viewerRole] - Role of the viewer. Defaults to current user's role.
 */
export default function SummaryPanel({ studentId, viewerRole }) {
  const { session, role: authRole } = useAuth();
  const effectiveRole = viewerRole || authRole;

  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const canGenerate = effectiveRole === 'mentor' || effectiveRole === 'admin';

  const fetchSummary = useCallback(async () => {
    if (!studentId || !session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/summary/${studentId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch summary (Status: ${res.status})`);
      }

      const data = await res.json();
      setSummaryData(data);
    } catch (err) {
      setError(err.message || 'Unable to load progress summary.');
    } finally {
      setLoading(false);
    }
  }, [studentId, session?.access_token]);

  const handleGenerate = async () => {
    if (!studentId || !session?.access_token || generating) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/summarize/${studentId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to generate summary (Status: ${res.status})`);
      }

      const data = await res.json();
      setSummaryData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const summaryText = summaryData?.summary_text || summaryData?.summary;
  const generatedAt = summaryData?.generated_at;

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className={styles.summaryCard} data-testid="ai-summary-panel">
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Progress Summary</h3>
          <span className={styles.aiBadge}>AI-generated</span>
        </div>

        {canGenerate && (
          <div className={styles.actionArea}>
            <button
              type="button"
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={generating || loading}
              aria-label={summaryText ? 'Regenerate summary' : 'Generate summary'}
            >
              {generating && <span className={styles.spinner} />}
              {generating
                ? 'Generating...'
                : summaryText
                ? 'Regenerate summary'
                : 'Generate summary'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          <p className={styles.errorText}>{error}</p>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={summaryText ? handleGenerate : fetchSummary}
          >
            Retry
          </button>
        </div>
      )}

      <div className={styles.contentBody}>
        {loading ? (
          <div className={styles.loadingPlaceholder}>
            <span className={styles.spinner} />
            <span>Loading progress summary...</span>
          </div>
        ) : summaryText ? (
          <p className={styles.summaryText}>{summaryText}</p>
        ) : (
          <p className={styles.emptyText}>
            {canGenerate
              ? 'No summary generated yet. Click "Generate summary" to create one from recent attendance, test scores, and notes.'
              : 'No progress summary is currently available.'}
          </p>
        )}
      </div>

      {summaryText && formattedDate && (
        <div className={styles.metaFooter}>
          <span className={styles.timestamp}>Last updated: {formattedDate}</span>
        </div>
      )}
    </div>
  );
}
