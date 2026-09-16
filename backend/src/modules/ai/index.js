const express = require('express');
const { supabaseAdmin } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

/**
 * POST /api/ai/summarize/:studentId
 * Role: mentor, admin
 * Pulls student data (mentor_notes, test_results, attendance, etc.),
 * constructs prompt, calls OpenAI API server-side, saves to progress_summaries,
 * and returns the generated summary.
 */
router.post('/summarize/:studentId', requireAuth, requireRole('mentor', 'admin'), async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required' });
  }

  try {
    // 1. Fetch student info, notes, test results, and attendance in parallel
    const [
      profileRes,
      studentRes,
      notesRes,
      testsRes,
      attendanceRes
    ] = await Promise.all([
      supabaseAdmin
        .from('users_profile')
        .select('full_name, role')
        .eq('id', studentId)
        .maybeSingle(),
      supabaseAdmin
        .from('students')
        .select('admission_stage, bio, courses(name), universities(name)')
        .eq('id', studentId)
        .maybeSingle(),
      supabaseAdmin
        .from('mentor_notes')
        .select('note_text, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('test_results')
        .select('score, submitted_at, tests(title)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('attendance')
        .select('status, classes(session_date, topic)')
        .eq('student_id', studentId)
        .order('id', { ascending: false })
        .limit(20)
    ]);

    const studentName = profileRes.data?.full_name || 'The student';
    const admissionStage = studentRes.data?.admission_stage || 'Not specified';
    const courseName = studentRes.data?.courses?.name || 'N/A';
    const universityName = studentRes.data?.universities?.name || 'N/A';

    // 2. Format Attendance
    const attendanceRecords = attendanceRes.data || [];
    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
    const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length;
    const excusedCount = attendanceRecords.filter((a) => a.status === 'excused').length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    const attendanceSummary = totalSessions > 0
      ? `${presentCount}/${totalSessions} sessions attended (${attendanceRate}%), ${absentCount} absent, ${excusedCount} excused.`
      : 'No attendance records available yet.';

    // 3. Format Tests
    const testRecords = testsRes.data || [];
    let testsSummary = 'No test records available yet.';
    if (testRecords.length > 0) {
      const validScores = testRecords.filter((t) => t.score !== null && !isNaN(t.score));
      const avgScore = validScores.length > 0
        ? Math.round(validScores.reduce((acc, t) => acc + Number(t.score), 0) / validScores.length)
        : null;

      const recentScores = testRecords
        .slice(0, 5)
        .map((t) => `${t.tests?.title || 'Test'}: ${t.score ?? 'N/A'}%`)
        .join(', ');

      testsSummary = `Average score: ${avgScore !== null ? `${avgScore}%` : 'N/A'} (${testRecords.length} tests taken). Recent tests: ${recentScores}.`;
    }

    // 4. Format Mentor Notes
    const notesRecords = notesRes.data || [];
    let notesSummary = 'No mentor notes logged yet.';
    if (notesRecords.length > 0) {
      notesSummary = notesRecords
        .map((n, i) => `${i + 1}. "${n.note_text}" (${new Date(n.created_at).toLocaleDateString()})`)
        .join('\n');
    }

    // 5. Construct OpenAI Prompt
    const systemPrompt =
      'You are an educational assistant for Eklavya Foundation. Generate a concise, professional 2-4 sentence progress summary of the student\'s performance, attendance, and mentor feedback. The summary must be written in plain, objective language suitable for a funder report or executive stakeholder update. Do not use bullet points or markdown headings—just a concise 2-4 sentence paragraph.';

    const userPrompt = `Please summarize the progress for ${studentName}.

Context:
- Admission Stage: ${admissionStage}
- Enrolled Course: ${courseName}
- Target University: ${universityName}

Attendance:
${attendanceSummary}

Test Results:
${testsSummary}

Mentor Notes:
${notesSummary}

Provide a 2 to 4 sentence executive progress summary.`;

    // 6. Call OpenAI API server-side
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' });
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!openAiResponse.ok) {
      const errorBody = await openAiResponse.text();
      return res.status(502).json({
        error: `OpenAI API returned an error (${openAiResponse.status}): ${errorBody}`
      });
    }

    const openAiData = await openAiResponse.json();
    const summaryText = openAiData.choices?.[0]?.message?.content?.trim();

    if (!summaryText) {
      return res.status(502).json({ error: 'OpenAI returned an empty summary' });
    }

    // 7. Store summary in progress_summaries
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('progress_summaries')
      .insert({
        student_id: studentId,
        summary_text: summaryText,
        generated_by: req.user.id
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({
      summary: summaryText,
      summary_text: summaryText,
      generated_at: inserted.generated_at,
      id: inserted.id,
      data: inserted
    });
  } catch (err) {
    console.error('Error generating AI summary:', err);
    return res.status(500).json({ error: err.message || 'Internal server error while generating summary' });
  }
});

/**
 * GET /api/ai/summary/:studentId
 * Role: student (own only), mentor, admin
 * Fetches the latest stored summary from progress_summaries (no OpenAI call needed).
 */
router.get('/summary/:studentId', requireAuth, requireRole('student', 'mentor', 'admin'), async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required' });
  }

  // Enforce that students can only view their own summary
  if (req.profile.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Forbidden: Students can only view their own summary' });
  }

  try {
    const { data: summary, error } = await supabaseAdmin
      .from('progress_summaries')
      .select('id, student_id, summary_text, generated_by, generated_at')
      .eq('student_id', studentId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!summary) {
      return res.status(200).json({
        summary: null,
        summary_text: null,
        data: null
      });
    }

    return res.status(200).json({
      summary: summary.summary_text,
      summary_text: summary.summary_text,
      generated_at: summary.generated_at,
      id: summary.id,
      generated_by: summary.generated_by,
      data: summary
    });
  } catch (err) {
    console.error('Error fetching AI summary:', err);
    return res.status(500).json({ error: err.message || 'Internal server error while fetching summary' });
  }
});

module.exports = router;
