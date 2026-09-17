const express = require('express');
const { createScopedClient } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

const ADMISSION_STAGES = ['looking', 'applied', 'offer_received'];
const ATTENDANCE_STATUSES = ['present', 'absent', 'excused'];

// All routes here require an authenticated mentor/teacher. Identity is
// always resolved from req.user.id (verified JWT), never from the URL,
// query string or request body — mirrors modules/students/index.js.
router.use(requireAuth, requireRole('mentor', 'teacher'));

// Confirms studentId is actually assigned to this mentor before any
// note/stage/detail operation touches it. RLS (students_mentor_select)
// already scopes the underlying query to mentor_id = auth.uid(), so an
// empty result here doubles as "not found" and "not yours" — we don't leak
// which case it is.
async function loadOwnStudent(db, mentorId, studentId) {
  const { data, error } = await db
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('mentor_id', mentorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ===================================================================
// GET /api/mentors/me/students — students assigned to this mentor only
// ===================================================================
router.get('/me/students', async (req, res) => {
  const mentorId = req.user.id;
  const db = createScopedClient(req.token);

  try {
    const { data: students, error } = await db
      .from('students')
      .select('id, admission_stage, course_id, university_id, bio')
      .eq('mentor_id', mentorId);
    if (error) throw error;

    if (!students || students.length === 0) {
      return res.json({ students: [] });
    }

    const studentIds = students.map((s) => s.id);
    const courseIds = [...new Set(students.map((s) => s.course_id).filter(Boolean))];

    const [{ data: profiles }, { data: courses }] = await Promise.all([
      db.from('users_profile').select('id, full_name, phone').in('id', studentIds),
      courseIds.length
        ? db.from('courses').select('id, name, category').in('id', courseIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    const courseMap = Object.fromEntries((courses || []).map((c) => [c.id, c]));

    const result = students.map((s) => ({
      id: s.id,
      name: profileMap[s.id]?.full_name ?? null,
      phone: profileMap[s.id]?.phone ?? null,
      admissionStage: s.admission_stage,
      course: courseMap[s.course_id] || null,
    }));

    return res.json({ students: result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load assigned students' });
  }
});

// ===================================================================
// GET /api/mentors/me/students/:id — detail view of one assigned student
// ===================================================================
router.get('/me/students/:id', async (req, res) => {
  const mentorId = req.user.id;
  const studentId = req.params.id;
  const db = createScopedClient(req.token);

  try {
    const student = await loadOwnStudent(db, mentorId, studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found or not assigned to you' });
    }

    const [{ data: profile }, { data: course }, { data: university }, { data: notes }, { data: attendance }] =
      await Promise.all([
        db.from('users_profile').select('full_name, phone').eq('id', studentId).maybeSingle(),
        student.course_id
          ? db.from('courses').select('id, name, category, description').eq('id', student.course_id).maybeSingle()
          : Promise.resolve({ data: null }),
        student.university_id
          ? db.from('universities').select('id, name, country').eq('id', student.university_id).maybeSingle()
          : Promise.resolve({ data: null }),
        db
          .from('mentor_notes')
          .select('id, note_text, created_at')
          .eq('student_id', studentId)
          .eq('mentor_id', mentorId)
          .order('created_at', { ascending: false }),
        db
          .from('attendance')
          .select('id, status, classes(session_date, topic)')
          .eq('student_id', studentId),
      ]);

    const attendanceHistory = (attendance || [])
      .map((row) => ({
        id: row.id,
        status: row.status,
        sessionDate: row.classes?.session_date ?? null,
        topic: row.classes?.topic ?? null,
      }))
      .sort((a, b) => (a.sessionDate || '').localeCompare(b.sessionDate || ''))
      .reverse();

    return res.json({
      student: {
        id: student.id,
        name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        bio: student.bio ?? null,
        admissionStage: student.admission_stage,
      },
      course: course || null,
      university: university || null,
      notes: notes || [],
      attendance: attendanceHistory,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load student detail' });
  }
});

// ===================================================================
// PATCH /api/mentors/me/students/:id/stage — update admission_stage
// ===================================================================
router.patch('/me/students/:id/stage', async (req, res) => {
  const mentorId = req.user.id;
  const studentId = req.params.id;
  const { admission_stage } = req.body || {};

  if (!ADMISSION_STAGES.includes(admission_stage)) {
    return res.status(400).json({ error: `admission_stage must be one of ${ADMISSION_STAGES.join(', ')}` });
  }

  const db = createScopedClient(req.token);

  try {
    const student = await loadOwnStudent(db, mentorId, studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found or not assigned to you' });
    }

    // Column-level restriction (only admission_stage) is enforced here in
    // Express, not by RLS — students_mentor_update only guards which ROW a
    // mentor may touch, same division of responsibility documented in
    // modules/students/index.js for students_update_own.
    const { data: updated, error } = await db
      .from('students')
      .update({ admission_stage })
      .eq('id', studentId)
      .select('id, admission_stage')
      .single();
    if (error) throw error;

    return res.json({ student: { id: updated.id, admissionStage: updated.admission_stage } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update admission stage' });
  }
});

// ===================================================================
// POST /api/mentors/me/notes — add a free-text note for a student
// ===================================================================
router.post('/me/notes', async (req, res) => {
  const mentorId = req.user.id;
  const { student_id, note_text } = req.body || {};

  if (!student_id || !note_text || !note_text.trim()) {
    return res.status(400).json({ error: 'student_id and note_text are required' });
  }
  if (note_text.length > 4000) {
    return res.status(400).json({ error: 'note_text must be 4000 characters or fewer' });
  }

  const db = createScopedClient(req.token);

  try {
    // Confirms the student is actually assigned to this mentor before
    // inserting. RLS's mentor_notes_mentor_insert check only verifies the
    // note's own mentor_id, not that student_id belongs to this mentor —
    // this explicit check is the layer that prevents a mentor from writing
    // notes about another mentor's students.
    const student = await loadOwnStudent(db, mentorId, student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found or not assigned to you' });
    }

    const { data: note, error } = await db
      .from('mentor_notes')
      .insert({ mentor_id: mentorId, student_id, note_text: note_text.trim() })
      .select('id, note_text, created_at')
      .single();
    if (error) throw error;

    return res.status(201).json({ note });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add note' });
  }
});

// ===================================================================
// GET /api/mentors/me/courses — course dropdown for attendance/session UI
// ===================================================================
router.get('/me/courses', async (req, res) => {
  const db = createScopedClient(req.token);
  try {
    const { data, error } = await db.from('courses').select('id, name, category').order('name');
    if (error) throw error;
    return res.json({ courses: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load courses' });
  }
});

// ===================================================================
// GET /api/mentors/me/classes — this mentor's own class sessions
// ===================================================================
router.get('/me/classes', async (req, res) => {
  const mentorId = req.user.id;
  const db = createScopedClient(req.token);

  try {
    const { data: classes, error } = await db
      .from('classes')
      .select('id, course_id, session_date, topic')
      .eq('mentor_id', mentorId)
      .order('session_date', { ascending: false });
    if (error) throw error;

    const courseIds = [...new Set((classes || []).map((c) => c.course_id).filter(Boolean))];
    const { data: courses } = courseIds.length
      ? await db.from('courses').select('id, name').in('id', courseIds)
      : { data: [] };
    const courseMap = Object.fromEntries((courses || []).map((c) => [c.id, c.name]));

    return res.json({
      classes: (classes || []).map((c) => ({ ...c, course_name: courseMap[c.course_id] || null })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load classes' });
  }
});

// ===================================================================
// GET /api/mentors/me/attendance/:classId — existing attendance for a
// class session, so the UI can pre-fill statuses when re-marking
// ===================================================================
router.get('/me/attendance/:classId', async (req, res) => {
  const mentorId = req.user.id;
  const { classId } = req.params;
  const db = createScopedClient(req.token);

  try {
    const { data: cls, error: classError } = await db
      .from('classes')
      .select('id, mentor_id')
      .eq('id', classId)
      .maybeSingle();
    if (classError) throw classError;
    if (!cls || cls.mentor_id !== mentorId) {
      return res.status(404).json({ error: 'Class session not found' });
    }

    const { data, error } = await db.from('attendance').select('id, student_id, status').eq('class_id', classId);
    if (error) throw error;

    return res.json({ attendance: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load attendance' });
  }
});

// ===================================================================
// POST /api/mentors/me/attendance — mark attendance for a class session.
// Creates the class row if class_id isn't given, then upserts an
// attendance row per student in `records`.
// Body: { class_id? , course_id?, session_date?, topic?,
//         records: [{ student_id, status }] }
// ===================================================================
router.post('/me/attendance', async (req, res) => {
  const mentorId = req.user.id;
  const { class_id, course_id, session_date, topic, records } = req.body || {};

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records must be a non-empty array of { student_id, status }' });
  }
  for (const r of records) {
    if (!r.student_id || !ATTENDANCE_STATUSES.includes(r.status)) {
      return res.status(400).json({ error: `Each record needs a student_id and status in ${ATTENDANCE_STATUSES.join(', ')}` });
    }
  }

  const db = createScopedClient(req.token);

  try {
    // Verify every student in this submission is actually assigned to this
    // mentor before writing anything.
    const studentIds = [...new Set(records.map((r) => r.student_id))];
    const { data: ownStudents, error: studentsError } = await db
      .from('students')
      .select('id')
      .eq('mentor_id', mentorId)
      .in('id', studentIds);
    if (studentsError) throw studentsError;

    const ownIds = new Set((ownStudents || []).map((s) => s.id));
    const notOwned = studentIds.filter((id) => !ownIds.has(id));
    if (notOwned.length > 0) {
      return res.status(403).json({ error: 'Some students are not assigned to you', student_ids: notOwned });
    }

    let classId = class_id;

    if (classId) {
      const { data: cls, error: classError } = await db
        .from('classes')
        .select('id, mentor_id')
        .eq('id', classId)
        .maybeSingle();
      if (classError) throw classError;
      if (!cls || cls.mentor_id !== mentorId) {
        return res.status(404).json({ error: 'Class session not found' });
      }
    } else {
      if (!session_date) {
        return res.status(400).json({ error: 'session_date is required to create a new class session' });
      }
      const { data: newClass, error: createError } = await db
        .from('classes')
        .insert({ course_id: course_id || null, mentor_id: mentorId, session_date, topic: topic || null })
        .select('id')
        .single();
      if (createError) throw createError;
      classId = newClass.id;
    }

    // Upsert per student: update the existing row for (class, student) if
    // present, otherwise insert. Avoids duplicate attendance rows when a
    // mentor re-marks the same session.
    const { data: existing, error: existingError } = await db
      .from('attendance')
      .select('id, student_id')
      .eq('class_id', classId)
      .in('student_id', studentIds);
    if (existingError) throw existingError;

    const existingByStudent = Object.fromEntries((existing || []).map((row) => [row.student_id, row.id]));

    const toInsert = [];
    const updates = [];
    for (const r of records) {
      if (existingByStudent[r.student_id]) {
        updates.push(db.from('attendance').update({ status: r.status }).eq('id', existingByStudent[r.student_id]));
      } else {
        toInsert.push({ class_id: classId, student_id: r.student_id, status: r.status });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await db.from('attendance').insert(toInsert);
      if (insertError) throw insertError;
    }
    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
    }

    return res.status(201).json({ class_id: classId, marked: records.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

module.exports = router;
