const router = require('express').Router();
const { supabaseAdmin } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

router.use(requireAuth, requireRole('admin'));

// Helper to create anth user + profile
async function createUserAndProfile(email, password, fullName, role, phone) {
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: password || 'DefaultPassword123!',
    email_confirm: true
  });
  if (authErr) throw authErr;

  const user = authData.user;
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('users_profile')
    .insert({ id: user.id, full_name: fullName, role, phone })
    .select()
    .single();

  if (profErr) {
    await supabaseAdmin.auth.admin.deleteUser(user.id); // rollback
    throw profErr;
  }
  return profile;
}

// ================= STUDENTS =================
router.get('/students', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*, users_profile(full_name, phone, role), courses(name), universities(name)');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', async (req, res) => {
  try {
    const { email, password, full_name, phone, admission_stage, course_id, university_id, bio } = req.body;
    const profile = await createUserAndProfile(email, password, full_name, 'student', phone);

    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        id: profile.id,
        admission_stage: admission_stage || 'looking',
        course_id,
        university_id,
        bio
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ ...data, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { admission_stage, course_id, mentor_id, university_id, bio } = req.body;
    const { data, error } = await supabaseAdmin
      .from('students')
      .update({ admission_stage, course_id, mentor_id, university_id, bio })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authDeleteErr) throw authDeleteErr;
    // Cascade deletes users_profile and students
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MENTORS =================
router.get('/mentors', async (req, res) => {
  try {
    const { data: mentors, error } = await supabaseAdmin
      .from('mentors')
      .select('*, users_profile(full_name, phone, role)');
    if (error) throw error;

    // Get workload count
    const { data: students, error: studErr } = await supabaseAdmin
      .from('students')
      .select('mentor_id');
    if (studErr) throw studErr;

    const workload = students.reduce((acc, s) => {
      if (s.mentor_id) acc[s.mentor_id] = (acc[s.mentor_id] || 0) + 1;
      return acc;
    }, {});

    const enriched = mentors.map(m => ({
      ...m,
      current_workload: workload[m.id] || 0
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mentors', async (req, res) => {
  try {
    const { email, password, full_name, phone, expertise, max_students } = req.body;
    const profile = await createUserAndProfile(email, password, full_name, 'mentor', phone);

    const { data, error } = await supabaseAdmin
      .from('mentors')
      .insert({
        id: profile.id,
        expertise: expertise || [],
        max_students: max_students || 5
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ ...data, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MATCH =================
router.post('/match', async (req, res) => {
  try {
    const { student_id, mentor_id } = req.body;
    if (!student_id || !mentor_id) return res.status(400).json({ error: 'student_id and mentor_id required' });

    const { data, error } = await supabaseAdmin
      .from('students')
      .update({ mentor_id })
      .eq('id', student_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= COURSES =================
router.get('/courses', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('courses').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert({ name, description, category })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const { data, error } = await supabaseAdmin
      .from('courses')
      .update({ name, description, category })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= UNIVERSITIES =================
router.get('/universities', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('universities').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/universities', async (req, res) => {
  try {
    const { name, country, fellowship_available } = req.body;
    const { data, error } = await supabaseAdmin
      .from('universities')
      .insert({ name, country, fellowship_available })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/universities/:id', async (req, res) => {
  try {
    const { name, country, fellowship_available } = req.body;
    const { data, error } = await supabaseAdmin
      .from('universities')
      .update({ name, country, fellowship_available })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= USERS =================
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('users_profile').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const { data, error } = await supabaseAdmin
      .from('users_profile')
      .update({ role })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    // Potentially insert into mentors/students tables if role changes, but PRD doesn't enforce this logic strictly.
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ANALYTICS =================
router.get('/analytics/overview', async (req, res) => {
  try {
    // 1. Admission stage funnel
    const { data: students, error: sErr } = await supabaseAdmin.from('students').select('admission_stage');
    if (sErr) throw sErr;
    const funnel = { looking: 0, applied: 0, offer_received: 0 };
    students.forEach(s => funnel[s.admission_stage] = (funnel[s.admission_stage] || 0) + 1);

    // 2. Attendance %
    const { data: attendance, error: aErr } = await supabaseAdmin.from('attendance').select('status');
    if (aErr) throw aErr;
    let attendancePercent = 0;
    if (attendance.length > 0) {
      const presentOrExcused = attendance.filter(a => a.status === 'present' || a.status === 'excused').length;
      attendancePercent = Math.round((presentOrExcused / attendance.length) * 100);
    }

    // 3. Avg test scores by course
    const { data: results, error: rErr } = await supabaseAdmin.from('test_results').select('score, tests(course_id, title)');
    if (rErr) throw rErr;
    const courseScores = {};
    results.forEach(r => {
      const cid = r.tests?.course_id || 'unassigned';
      if (!courseScores[cid]) courseScores[cid] = { total: 0, count: 0 };
      courseScores[cid].total += Number(r.score || 0);
      courseScores[cid].count++;
    });
    const avgScoresByCourse = Object.entries(courseScores).map(([cid, val]) => ({
      course_id: cid,
      avgScore: Math.round(val.total / val.count)
    }));

    res.json({ funnel, attendancePercent, avgScoresByCourse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/universities', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('students').select('university_id, universities(name)');
    if (error) throw error;
    
    const countMap = {};
    data.forEach(s => {
      if (!s.university_id) return;
      const uname = s.universities?.name || 'Unknown';
      countMap[uname] = (countMap[uname] || 0) + 1;
    });

    const applicantsPerUniv = Object.entries(countMap).map(([name, count]) => ({ name, count }));
    res.json(applicantsPerUniv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
