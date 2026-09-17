const express = require('express');
const { supabaseAdmin, createScopedClient } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

const ADMISSION_STAGES = ['looking', 'applied', 'offer_received'];
const STAFF_ROLES = ['mentor', 'teacher'];
const ALL_ROLES = ['student', 'mentor', 'teacher', 'admin'];

// Every route below requires an authenticated admin. The caller's own role
// is what RLS's admin_all policies check (current_user_role() = 'admin'),
// so all table reads/writes run through the caller's own scoped client —
// service-role (supabaseAdmin) is used only where Supabase leaves no
// alternative: creating/deleting auth.users accounts and listing emails.
router.use(requireAuth, requireRole('admin'));

function db(req) {
  return createScopedClient(req.token);
}

async function createAuthUser({ email, password, full_name, role, phone }) {
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw { status: 400, message: createError.message };

  const userId = created.user.id;
  const { error: profileError } = await supabaseAdmin
    .from('users_profile')
    .insert({ id: userId, full_name, role, phone: phone || null });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw { status: 400, message: profileError.message };
  }

  return userId;
}

// ===================================================================
// STUDENTS
// ===================================================================

// GET /api/admin/students?search=&stage=&course_id=&mentor_id=
router.get('/students', async (req, res) => {
  const { search, stage, course_id, mentor_id } = req.query;
  const client = db(req);

  try {
    let query = client.from('students').select('id, admission_stage, course_id, mentor_id, university_id, bio');
    if (stage) query = query.eq('admission_stage', stage);
    if (course_id) query = query.eq('course_id', course_id);
    if (mentor_id) query = query.eq('mentor_id', mentor_id);

    const { data: students, error } = await query;
    if (error) throw error;

    const ids = (students || []).map((s) => s.id);
    const mentorIds = [...new Set((students || []).map((s) => s.mentor_id).filter(Boolean))];
    const courseIds = [...new Set((students || []).map((s) => s.course_id).filter(Boolean))];

    const [{ data: profiles }, { data: mentorProfiles }, { data: courses }] = await Promise.all([
      ids.length ? client.from('users_profile').select('id, full_name, phone').in('id', ids) : Promise.resolve({ data: [] }),
      mentorIds.length
        ? client.from('users_profile').select('id, full_name').in('id', mentorIds)
        : Promise.resolve({ data: [] }),
      courseIds.length ? client.from('courses').select('id, name').in('id', courseIds) : Promise.resolve({ data: [] }),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    const mentorMap = Object.fromEntries((mentorProfiles || []).map((p) => [p.id, p.full_name]));
    const courseMap = Object.fromEntries((courses || []).map((c) => [c.id, c.name]));

    let result = (students || []).map((s) => ({
      id: s.id,
      name: profileMap[s.id]?.full_name ?? null,
      phone: profileMap[s.id]?.phone ?? null,
      admissionStage: s.admission_stage,
      courseId: s.course_id,
      courseName: courseMap[s.course_id] || null,
      mentorId: s.mentor_id,
      mentorName: mentorMap[s.mentor_id] || null,
      universityId: s.university_id,
      bio: s.bio,
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => (s.name || '').toLowerCase().includes(q));
    }

    return res.json({ students: result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load students' });
  }
});

// POST /api/admin/students — create a new student account
router.post('/students', async (req, res) => {
  const { email, password, full_name, phone, course_id, mentor_id, university_id, admission_stage, bio } = req.body || {};

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' });
  }
  if (admission_stage && !ADMISSION_STAGES.includes(admission_stage)) {
    return res.status(400).json({ error: `admission_stage must be one of ${ADMISSION_STAGES.join(', ')}` });
  }

  try {
    const userId = await createAuthUser({ email, password, full_name, role: 'student', phone });

    const client = db(req);
    const { error: studentError } = await client.from('students').insert({
      id: userId,
      admission_stage: admission_stage || 'looking',
      course_id: course_id || null,
      mentor_id: mentor_id || null,
      university_id: university_id || null,
      bio: bio || null,
    });
    if (studentError) throw studentError;

    return res.status(201).json({ id: userId });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to create student' });
  }
});

const STUDENT_FIELDS = ['admission_stage', 'course_id', 'mentor_id', 'university_id', 'bio'];
const PROFILE_FIELDS = ['full_name', 'phone'];

// PUT /api/admin/students/:id — full edit access (admin only)
router.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  if ('admission_stage' in body && !ADMISSION_STAGES.includes(body.admission_stage)) {
    return res.status(400).json({ error: `admission_stage must be one of ${ADMISSION_STAGES.join(', ')}` });
  }

  const client = db(req);
  try {
    const studentUpdate = {};
    STUDENT_FIELDS.forEach((f) => {
      if (f in body) studentUpdate[f] = body[f];
    });
    const profileUpdate = {};
    PROFILE_FIELDS.forEach((f) => {
      if (f in body) profileUpdate[f] = body[f];
    });

    if (Object.keys(studentUpdate).length > 0) {
      const { error } = await client.from('students').update(studentUpdate).eq('id', id);
      if (error) throw error;
    }
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await client.from('users_profile').update(profileUpdate).eq('id', id);
      if (error) throw error;
    }

    return res.json({ id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ===================================================================
// MENTORS / TEACHERS
// ===================================================================

// GET /api/admin/mentors — list with current workload (student count)
router.get('/mentors', async (req, res) => {
  const client = db(req);
  try {
    const { data: mentors, error } = await client.from('mentors').select('id, expertise, max_students');
    if (error) throw error;

    const ids = (mentors || []).map((m) => m.id);
    const [{ data: profiles }, { data: students }] = await Promise.all([
      ids.length ? client.from('users_profile').select('id, full_name, phone, role').in('id', ids) : Promise.resolve({ data: [] }),
      ids.length ? client.from('students').select('id, mentor_id').in('mentor_id', ids) : Promise.resolve({ data: [] }),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    const workload = {};
    (students || []).forEach((s) => {
      workload[s.mentor_id] = (workload[s.mentor_id] || 0) + 1;
    });

    const result = (mentors || []).map((m) => ({
      id: m.id,
      name: profileMap[m.id]?.full_name ?? null,
      phone: profileMap[m.id]?.phone ?? null,
      role: profileMap[m.id]?.role ?? 'mentor',
      expertise: m.expertise || [],
      maxStudents: m.max_students || 0,
      currentStudents: workload[m.id] || 0,
    }));

    return res.json({ mentors: result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load mentors' });
  }
});

// POST /api/admin/mentors — onboard a new mentor/teacher
router.post('/mentors', async (req, res) => {
  const { email, password, full_name, phone, role, expertise, max_students } = req.body || {};

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' });
  }
  const mentorRole = STAFF_ROLES.includes(role) ? role : 'mentor';

  try {
    const userId = await createAuthUser({ email, password, full_name, role: mentorRole, phone });

    const client = db(req);
    const { error: mentorError } = await client.from('mentors').insert({
      id: userId,
      expertise: Array.isArray(expertise) ? expertise : [],
      max_students: Number.isFinite(max_students) ? max_students : 0,
    });
    if (mentorError) throw mentorError;

    return res.status(201).json({ id: userId });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to create mentor' });
  }
});

// PUT /api/admin/mentors/:id
router.put('/mentors/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, phone, expertise, max_students } = req.body || {};
  const client = db(req);

  try {
    const profileUpdate = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await client.from('users_profile').update(profileUpdate).eq('id', id);
      if (error) throw error;
    }

    const mentorUpdate = {};
    if (expertise !== undefined) mentorUpdate.expertise = Array.isArray(expertise) ? expertise : [];
    if (max_students !== undefined) mentorUpdate.max_students = max_students;
    if (Object.keys(mentorUpdate).length > 0) {
      const { error } = await client.from('mentors').update(mentorUpdate).eq('id', id);
      if (error) throw error;
    }

    return res.json({ id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update mentor' });
  }
});

// DELETE /api/admin/mentors/:id
router.delete('/mentors/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete mentor' });
  }
});

// ===================================================================
// MATCHING — assign/reassign mentor <-> student
// ===================================================================

// POST /api/admin/match — body { student_id, mentor_id } (mentor_id may be
// null to unassign)
router.post('/match', async (req, res) => {
  const { student_id, mentor_id } = req.body || {};
  if (!student_id) {
    return res.status(400).json({ error: 'student_id is required' });
  }

  const client = db(req);
  try {
    if (mentor_id) {
      const { data: mentor, error: mentorError } = await client
        .from('mentors')
        .select('id, max_students')
        .eq('id', mentor_id)
        .maybeSingle();
      if (mentorError) throw mentorError;
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }

      if (mentor.max_students > 0) {
        const { count, error: countError } = await client
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_id', mentor_id)
          .neq('id', student_id);
        if (countError) throw countError;
        if ((count || 0) >= mentor.max_students) {
          return res.status(400).json({ error: 'This mentor is already at maximum capacity' });
        }
      }
    }

    const { data: updated, error } = await client
      .from('students')
      .update({ mentor_id: mentor_id || null })
      .eq('id', student_id)
      .select('id, mentor_id')
      .single();
    if (error) throw error;

    return res.json({ student_id: updated.id, mentor_id: updated.mentor_id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update mentor assignment' });
  }
});

// ===================================================================
// COURSES
// ===================================================================

router.get('/courses', async (req, res) => {
  try {
    const { data, error } = await db(req).from('courses').select('*').order('name');
    if (error) throw error;
    return res.json({ courses: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load courses' });
  }
});

router.post('/courses', async (req, res) => {
  const { name, description, category } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const { data, error } = await db(req)
      .from('courses')
      .insert({ name: name.trim(), description: description || null, category: category || null })
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ course: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { name, description, category } = req.body || {};
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (category !== undefined) update.category = category;

  try {
    const { data, error } = await db(req).from('courses').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    return res.json({ course: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update course' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const { error } = await db(req).from('courses').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ===================================================================
// UNIVERSITIES / FELLOWSHIPS
// ===================================================================

router.get('/universities', async (req, res) => {
  const client = db(req);
  try {
    const { data: universities, error } = await client.from('universities').select('*').order('name');
    if (error) throw error;

    const ids = (universities || []).map((u) => u.id);
    const { data: categoryRows } = ids.length
      ? await client.from('university_categories').select('university_id, category').in('university_id', ids)
      : { data: [] };

    const categoryMap = {};
    (categoryRows || []).forEach((row) => {
      (categoryMap[row.university_id] ||= []).push(row.category);
    });

    return res.json({
      universities: (universities || []).map((u) => ({ ...u, categories: categoryMap[u.id] || [] })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load universities' });
  }
});

async function replaceCategories(client, universityId, categories) {
  if (!Array.isArray(categories)) return;
  const { error: deleteError } = await client.from('university_categories').delete().eq('university_id', universityId);
  if (deleteError) throw deleteError;
  const rows = categories.filter(Boolean).map((category) => ({ university_id: universityId, category }));
  if (rows.length > 0) {
    const { error: insertError } = await client.from('university_categories').insert(rows);
    if (insertError) throw insertError;
  }
}

router.post('/universities', async (req, res) => {
  const { name, country, fellowship_available, categories } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const client = db(req);
  try {
    const { data: university, error } = await client
      .from('universities')
      .insert({ name: name.trim(), country: country || null, fellowship_available: !!fellowship_available })
      .select()
      .single();
    if (error) throw error;

    await replaceCategories(client, university.id, categories);

    return res.status(201).json({ university: { ...university, categories: categories || [] } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create university' });
  }
});

router.put('/universities/:id', async (req, res) => {
  const { name, country, fellowship_available, categories } = req.body || {};
  const update = {};
  if (name !== undefined) update.name = name;
  if (country !== undefined) update.country = country;
  if (fellowship_available !== undefined) update.fellowship_available = !!fellowship_available;

  const client = db(req);
  try {
    let university;
    if (Object.keys(update).length > 0) {
      const { data, error } = await client.from('universities').update(update).eq('id', req.params.id).select().single();
      if (error) throw error;
      university = data;
    }
    await replaceCategories(client, req.params.id, categories);

    if (!university) {
      const { data } = await client.from('universities').select('*').eq('id', req.params.id).single();
      university = data;
    }

    return res.json({ university: { ...university, categories: categories || [] } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update university' });
  }
});

router.delete('/universities/:id', async (req, res) => {
  try {
    const { error } = await db(req).from('universities').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete university' });
  }
});

// ===================================================================
// USERS / ROLES
// ===================================================================

// GET /api/admin/users — every account, with email (requires the Admin
// Auth API, which is only reachable with the service-role key — there is
// no RLS-scoped way to read auth.users).
router.get('/users', async (req, res) => {
  try {
    const [{ data: profiles, error: profileError }, { data: authList, error: authError }] = await Promise.all([
      db(req).from('users_profile').select('id, full_name, role, phone, created_at'),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    if (profileError) throw profileError;
    if (authError) throw authError;

    const emailMap = Object.fromEntries((authList?.users || []).map((u) => [u.id, u.email]));

    return res.json({
      users: (profiles || []).map((p) => ({ ...p, email: emailMap[p.id] || null })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST /api/admin/users — invite/create a user of any role
router.post('/users', async (req, res) => {
  const { email, password, full_name, role, phone } = req.body || {};
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'email, password, full_name and role are required' });
  }
  if (!ALL_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${ALL_ROLES.join(', ')}` });
  }

  try {
    const userId = await createAuthUser({ email, password, full_name, role, phone });

    const client = db(req);
    if (role === 'student') {
      await client.from('students').insert({ id: userId, admission_stage: 'looking' });
    } else if (STAFF_ROLES.includes(role)) {
      await client.from('mentors').insert({ id: userId });
    }

    return res.status(201).json({ id: userId, role });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to create user' });
  }
});

// PATCH /api/admin/users/:id — update role/profile fields
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role, full_name, phone } = req.body || {};

  if (role && !ALL_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${ALL_ROLES.join(', ')}` });
  }

  const client = db(req);
  try {
    const update = {};
    if (role !== undefined) update.role = role;
    if (full_name !== undefined) update.full_name = full_name;
    if (phone !== undefined) update.phone = phone;

    if (Object.keys(update).length > 0) {
      const { error } = await client.from('users_profile').update(update).eq('id', id);
      if (error) throw error;
    }

    // Changing into student/mentor role needs the matching extension row to
    // exist (it won't, if the account started life as a different role).
    if (role === 'student') {
      const { data: existing } = await client.from('students').select('id').eq('id', id).maybeSingle();
      if (!existing) {
        await client.from('students').insert({ id, admission_stage: 'looking' });
      }
    } else if (STAFF_ROLES.includes(role)) {
      const { data: existing } = await client.from('mentors').select('id').eq('id', id).maybeSingle();
      if (!existing) {
        await client.from('mentors').insert({ id });
      }
    }

    return res.json({ id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===================================================================
// ANALYTICS
// ===================================================================

// GET /api/admin/analytics/overview
router.get('/analytics/overview', async (req, res) => {
  const client = db(req);
  try {
    const [{ data: students }, { data: attendance }, { data: results }, { data: courses }] = await Promise.all([
      client.from('students').select('admission_stage, course_id'),
      client.from('attendance').select('status'),
      client.from('test_results').select('score, test_id'),
      client.from('courses').select('id, name'),
    ]);

    const funnel = { looking: 0, applied: 0, offer_received: 0 };
    (students || []).forEach((s) => {
      if (funnel[s.admission_stage] !== undefined) funnel[s.admission_stage] += 1;
    });

    const attendanceTotal = (attendance || []).length;
    const attendancePresent = (attendance || []).filter((a) => a.status === 'present').length;
    const attendanceRate = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 0;

    const validScores = (results || []).filter((r) => r.score !== null && !Number.isNaN(Number(r.score)));
    const averageScore =
      validScores.length > 0
        ? Math.round(validScores.reduce((sum, r) => sum + Number(r.score), 0) / validScores.length)
        : 0;

    // Average score by course requires joining test_results -> tests -> course_id.
    const { data: tests } = await client.from('tests').select('id, course_id');
    const testCourseMap = Object.fromEntries((tests || []).map((t) => [t.id, t.course_id]));
    const courseNameMap = Object.fromEntries((courses || []).map((c) => [c.id, c.name]));

    const scoresByCourse = {};
    validScores.forEach((r) => {
      const courseId = testCourseMap[r.test_id];
      if (!courseId) return;
      (scoresByCourse[courseId] ||= []).push(Number(r.score));
    });
    const averageScoreByCourse = Object.entries(scoresByCourse).map(([courseId, scores]) => ({
      courseId,
      courseName: courseNameMap[courseId] || 'Unknown',
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }));

    const studentsByCourse = {};
    (students || []).forEach((s) => {
      if (!s.course_id) return;
      studentsByCourse[s.course_id] = (studentsByCourse[s.course_id] || 0) + 1;
    });

    return res.json({
      admissionFunnel: funnel,
      totalStudents: (students || []).length,
      attendance: { total: attendanceTotal, present: attendancePresent, rate: attendanceRate },
      testScores: { average: averageScore, totalSubmissions: validScores.length, byCourse: averageScoreByCourse },
      studentsByCourse: Object.entries(studentsByCourse).map(([courseId, count]) => ({
        courseId,
        courseName: courseNameMap[courseId] || 'Unknown',
        count,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute analytics overview' });
  }
});

// GET /api/admin/analytics/universities — applicants per university
router.get('/analytics/universities', async (req, res) => {
  const client = db(req);
  try {
    const [{ data: universities }, { data: students }] = await Promise.all([
      client.from('universities').select('id, name, country, fellowship_available'),
      client.from('students').select('university_id'),
    ]);

    const counts = {};
    (students || []).forEach((s) => {
      if (!s.university_id) return;
      counts[s.university_id] = (counts[s.university_id] || 0) + 1;
    });

    const result = (universities || [])
      .map((u) => ({ ...u, applicantCount: counts[u.id] || 0 }))
      .sort((a, b) => b.applicantCount - a.applicantCount);

    return res.json({ universities: result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute university analytics' });
  }
});

// Mentor workload is already returned by GET /mentors (currentStudents /
// maxStudents), which the Analytics tab reuses instead of duplicating here.

module.exports = router;
