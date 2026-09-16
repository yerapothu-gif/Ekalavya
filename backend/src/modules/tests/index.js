const express = require('express');
const { supabaseAdmin } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

// -------------------------------------------------------------------
// HELPER: Fetch course name mapping
// -------------------------------------------------------------------
async function getCourseMap() {
  const { data: courses } = await supabaseAdmin.from('courses').select('id, name, category');
  const map = {};
  (courses || []).forEach(c => {
    map[c.id] = c;
  });
  return map;
}

// ===================================================================
// 1. GET /api/tests/courses — List available courses for creating tests
// ===================================================================
router.get('/courses', requireAuth, async (req, res) => {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('id, name, category, description')
      .order('name');
    if (error) throw error;
    return res.json(courses || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ===================================================================
// 2. GET Mentor's created tests list
// ===================================================================
const getMentorCreatedTests = async (req, res) => {
  try {
    const { data: tests, error } = await supabaseAdmin
      .from('tests')
      .select('id, title, course_id, created_by')
      .eq('created_by', req.user.id);

    if (error) throw error;

    const courseMap = await getCourseMap();

    // Fetch questions count & results count for each test
    const enriched = await Promise.all(
      (tests || []).map(async (t) => {
        const { count: qCount } = await supabaseAdmin
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('test_id', t.id);

        const { count: rCount } = await supabaseAdmin
          .from('test_results')
          .select('id', { count: 'exact', head: true })
          .eq('test_id', t.id);

        return {
          ...t,
          course_name: courseMap[t.course_id]?.name || 'Unassigned Course',
          question_count: qCount || 0,
          submission_count: rCount || 0,
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/mentor/my-tests', requireAuth, requireRole('mentor', 'teacher', 'admin'), getMentorCreatedTests);
router.get('/mentors/me/tests/list', requireAuth, requireRole('mentor', 'teacher', 'admin'), getMentorCreatedTests);

// ===================================================================
// 3. GET Student results history
// `GET /api/students/me/results`
// ===================================================================
const getStudentResults = async (req, res) => {
  try {
    const { data: results, error } = await supabaseAdmin
      .from('test_results')
      .select('id, test_id, student_id, score, submitted_at')
      .eq('student_id', req.user.id)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const courseMap = await getCourseMap();

    const enriched = await Promise.all(
      (results || []).map(async (r) => {
        const { data: test } = await supabaseAdmin
          .from('tests')
          .select('title, course_id')
          .eq('id', r.test_id)
          .single();

        return {
          ...r,
          test_title: test?.title || 'Unknown Test',
          course_id: test?.course_id || null,
          course_name: test ? (courseMap[test.course_id]?.name || 'Course') : 'Course',
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/students/me/results', requireAuth, getStudentResults);
router.get('/student/me/results', requireAuth, getStudentResults);
router.get('/results', requireAuth, getStudentResults);

// ===================================================================
// 4. GET Available tests for student's course
// `GET /api/students/me/tests`
// ===================================================================
const getAvailableTests = async (req, res) => {
  try {
    // 1. Get student's enrolled course_id
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('course_id')
      .eq('id', req.user.id)
      .single();

    let query = supabaseAdmin.from('tests').select('id, title, course_id, created_by');

    if (student?.course_id) {
      query = query.eq('course_id', student.course_id);
    }

    const { data: tests, error } = await query;
    if (error) throw error;

    const courseMap = await getCourseMap();

    // 2. Fetch question count & student's prior results
    const enriched = await Promise.all(
      (tests || []).map(async (t) => {
        const { count: qCount } = await supabaseAdmin
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('test_id', t.id);

        const { data: myResult } = await supabaseAdmin
          .from('test_results')
          .select('id, score, submitted_at')
          .eq('test_id', t.id)
          .eq('student_id', req.user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...t,
          course_name: courseMap[t.course_id]?.name || 'General',
          question_count: qCount || 0,
          completed: !!myResult,
          score: myResult ? Number(myResult.score) : null,
          submitted_at: myResult?.submitted_at || null,
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/students/me/tests', requireAuth, getAvailableTests);
router.get('/student/me/tests', requireAuth, getAvailableTests);

// ===================================================================
// 5. POST Create test (Mentor facing)
// `POST /api/mentors/me/tests`
// Body: { title, course_id, questions: [{ question_text, options, correct_option }] }
// ===================================================================
const createTest = async (req, res) => {
  try {
    const { title, course_id, questions } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Test title is required' });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    // Insert test
    const { data: test, error: testErr } = await supabaseAdmin
      .from('tests')
      .insert({
        title: title.trim(),
        course_id: course_id || null,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (testErr) throw testErr;

    // Insert questions
    const questionRows = questions.map((q) => ({
      test_id: test.id,
      question_text: q.question_text || q.text || 'Question',
      options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []),
      correct_option: String(q.correct_option ?? q.correctOption ?? '').trim(),
    }));

    const { data: createdQuestions, error: qErr } = await supabaseAdmin
      .from('questions')
      .insert(questionRows)
      .select();

    if (qErr) {
      // Rollback test
      await supabaseAdmin.from('tests').delete().eq('id', test.id);
      throw qErr;
    }

    return res.status(201).json({
      message: 'Test created successfully',
      test,
      questions: createdQuestions,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/mentors/me/tests', requireAuth, requireRole('mentor', 'teacher', 'admin'), createTest);
router.post('/mentor/me/tests', requireAuth, requireRole('mentor', 'teacher', 'admin'), createTest);

// ===================================================================
// 6. GET Test details & questions
// `GET /api/tests/:testId`
// ===================================================================
router.get('/:testId', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;

    const { data: test, error: testErr } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testErr || !test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('test_id', testId);

    if (qErr) throw qErr;

    // Is the user a mentor/admin or the author of the test?
    const isTeacherOrCreator =
      req.profile.role === 'admin' ||
      req.profile.role === 'mentor' ||
      req.profile.role === 'teacher' ||
      test.created_by === req.user.id;

    // For student taking test, omit correct_option from payload to avoid cheating
    const formattedQuestions = (questions || []).map((q) => {
      let optionsArr = [];
      if (Array.isArray(q.options)) {
        optionsArr = q.options;
      } else if (typeof q.options === 'string') {
        try { optionsArr = JSON.parse(q.options); } catch { optionsArr = [q.options]; }
      }

      if (isTeacherOrCreator) {
        return { ...q, options: optionsArr };
      }

      return {
        id: q.id,
        test_id: q.test_id,
        question_text: q.question_text,
        options: optionsArr,
      };
    });

    return res.json({
      ...test,
      questions: formattedQuestions,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ===================================================================
// 7. POST Submit test & auto-score
// `POST /api/students/me/tests/:testId/submit`
// Body: { answers: { [questionId]: selectedOption } } OR { answers: [{ question_id, selected_option }] }
// ===================================================================
const submitTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers } = req.body || {};

    if (!answers) {
      return res.status(400).json({ error: 'Answers payload is required' });
    }

    // Fetch questions with correct answers
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, question_text, options, correct_option')
      .eq('test_id', testId);

    if (qErr || !questions || questions.length === 0) {
      return res.status(404).json({ error: 'Questions not found for this test' });
    }

    // Parse answers map: normalize into { questionId: selectedOption }
    let answersMap = {};
    if (Array.isArray(answers)) {
      answers.forEach((item) => {
        if (item.question_id) {
          answersMap[item.question_id] = item.selected_option ?? item.answer;
        }
      });
    } else if (typeof answers === 'object') {
      answersMap = answers;
    }

    // Auto-score logic
    let correctCount = 0;
    const totalQuestions = questions.length;
    const details = [];

    questions.forEach((q) => {
      const studentAns = String(answersMap[q.id] ?? '').trim();
      const correctAns = String(q.correct_option ?? '').trim();

      const isCorrect =
        studentAns.toLowerCase() === correctAns.toLowerCase() ||
        (studentAns !== '' && studentAns === correctAns);

      if (isCorrect) {
        correctCount += 1;
      }

      details.push({
        question_id: q.id,
        question_text: q.question_text,
        selected_option: studentAns,
        correct_option: correctAns,
        is_correct: isCorrect,
      });
    });

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

    // Insert into test_results
    const { data: result, error: resultErr } = await supabaseAdmin
      .from('test_results')
      .insert({
        test_id: testId,
        student_id: req.user.id,
        score: scorePercentage,
      })
      .select()
      .single();

    if (resultErr) throw resultErr;

    return res.status(201).json({
      result_id: result.id,
      test_id: testId,
      student_id: req.user.id,
      score: scorePercentage,
      correct_count: correctCount,
      total_questions: totalQuestions,
      submitted_at: result.submitted_at,
      details,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/students/me/tests/:testId/submit', requireAuth, submitTest);
router.post('/student/me/tests/:testId/submit', requireAuth, submitTest);
router.post('/:testId/submit', requireAuth, submitTest);

// ===================================================================
// 8. GET Test results analytics (Mentor facing)
// `GET /api/mentors/me/tests/:id/results`
// ===================================================================
const getTestResultsAnalytics = async (req, res) => {
  try {
    const testId = req.params.id || req.params.testId;

    // Fetch test info
    const { data: test, error: testErr } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testErr || !test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Fetch questions count
    const { count: questionCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', testId);

    // Fetch results
    const { data: rawResults, error: resErr } = await supabaseAdmin
      .from('test_results')
      .select('id, test_id, student_id, score, submitted_at')
      .eq('test_id', testId)
      .order('submitted_at', { ascending: false });

    if (resErr) throw resErr;

    // Join with student names from users_profile
    const results = await Promise.all(
      (rawResults || []).map(async (r) => {
        const { data: profile } = await supabaseAdmin
          .from('users_profile')
          .select('full_name, phone')
          .eq('id', r.student_id)
          .maybeSingle();

        return {
          ...r,
          score: Number(r.score),
          student_name: profile?.full_name || 'Unknown Student',
        };
      })
    );

    // Compute distribution summary
    const totalSubmissions = results.length;
    let avgScore = 0;
    let minScore = 0;
    let maxScore = 0;
    let passCount = 0;

    const distribution = {
      below50: 0,
      range50to74: 0,
      range75to100: 0,
    };

    if (totalSubmissions > 0) {
      const scores = results.map((r) => r.score);
      const sum = scores.reduce((a, b) => a + b, 0);
      avgScore = Math.round(sum / totalSubmissions);
      minScore = Math.min(...scores);
      maxScore = Math.max(...scores);

      results.forEach((r) => {
        if (r.score >= 60) passCount += 1;
        if (r.score < 50) distribution.below50 += 1;
        else if (r.score < 75) distribution.range50to74 += 1;
        else distribution.range75to100 += 1;
      });
    }

    return res.json({
      test: {
        ...test,
        question_count: questionCount || 0,
      },
      summary: {
        total_submissions: totalSubmissions,
        average_score: avgScore,
        min_score: minScore,
        max_score: maxScore,
        pass_rate: totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0,
        distribution,
      },
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/mentors/me/tests/:id/results', requireAuth, requireRole('mentor', 'teacher', 'admin'), getTestResultsAnalytics);
router.get('/mentor/me/tests/:id/results', requireAuth, requireRole('mentor', 'teacher', 'admin'), getTestResultsAnalytics);
router.get('/:id/results', requireAuth, getTestResultsAnalytics);

// Default fallback for route matching /api/tests/
router.get('/', requireAuth, async (req, res) => {
  if (req.profile.role === 'student') {
    return getAvailableTests(req, res);
  }
  return getMentorCreatedTests(req, res);
});

router.post('/', requireAuth, async (req, res) => {
  if (req.profile.role === 'student') {
    return res.status(403).json({ error: 'Students cannot create tests' });
  }
  return createTest(req, res);
});

module.exports = router;
