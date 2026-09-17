const express = require('express');
const { createScopedClient: scopedClient } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

// All /api/students/me* routes require an authenticated student. Identity is
// always resolved from req.user.id (verified JWT) — never from the URL,
// query string or request body.
router.use(requireAuth, requireRole('student'));

// GET /api/students/me — own profile, admission stage, course, mentor
router.get('/me', async (req, res) => {
  const studentId = req.user.id;
  const db = scopedClient(req.token);

  try {
    const { data: student, error: studentError } = await db
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    let course = null;
    if (student.course_id) {
      const { data } = await db
        .from('courses')
        .select('id, name, description, category')
        .eq('id', student.course_id)
        .single();
      course = data || null;
    }

    let mentor = null;
    if (student.mentor_id) {
      const [{ data: mentorRow }, { data: mentorProfile }] = await Promise.all([
        db.from('mentors').select('id, expertise, max_students').eq('id', student.mentor_id).single(),
        // users_profile_select_assigned_mentor now allows a student to read
        // their own mentor's profile row, so this runs through the scoped
        // (RLS-enforced) client rather than the service-role one.
        db.from('users_profile').select('id, full_name, phone').eq('id', student.mentor_id).single(),
      ]);

      if (mentorRow || mentorProfile) {
        mentor = {
          id: student.mentor_id,
          name: mentorProfile?.full_name ?? null,
          phone: mentorProfile?.phone ?? null,
          expertise: mentorRow?.expertise ?? [],
        };
      }
    }

    return res.json({
      student: {
        id: student.id,
        name: req.profile.full_name ?? null,
        phone: req.profile.phone ?? null,
        bio: student.bio ?? null,
        admissionStage: student.admission_stage,
      },
      course,
      mentor,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

const EDITABLE_FIELDS = ['bio', 'phone'];
const MAX_BIO_LENGTH = 2000;
const MAX_PHONE_LENGTH = 30;

// PUT /api/students/me — update own editable fields only (bio, phone).
// Protected fields (id, role, admission_stage, course_id, mentor_id,
// university_id, created_at) are never accepted from the client.
router.put('/me', async (req, res) => {
  const studentId = req.user.id;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const keys = Object.keys(body);

  if (keys.length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  const rejected = keys.filter((key) => !EDITABLE_FIELDS.includes(key));
  if (rejected.length > 0) {
    return res.status(400).json({ error: `These fields cannot be updated: ${rejected.join(', ')}` });
  }

  for (const field of EDITABLE_FIELDS) {
    if (field in body && typeof body[field] !== 'string') {
      return res.status(400).json({ error: `${field} must be a string` });
    }
  }

  const bio = 'bio' in body ? body.bio.trim() : undefined;
  const phone = 'phone' in body ? body.phone.trim() : undefined;

  if (bio !== undefined && bio.length > MAX_BIO_LENGTH) {
    return res.status(400).json({ error: `bio must be ${MAX_BIO_LENGTH} characters or fewer` });
  }
  if (phone !== undefined && phone.length > MAX_PHONE_LENGTH) {
    return res.status(400).json({ error: `phone must be ${MAX_PHONE_LENGTH} characters or fewer` });
  }

  try {
    // students_update_own and users_profile_update_own both exist now, so
    // every write here runs through the RLS-scoped client (auth.uid() =
    // studentId), never the service-role client. The row is always scoped
    // to req.user.id from the verified JWT, never a client-supplied id;
    // which fields may be set is enforced above by the EDITABLE_FIELDS
    // allowlist, not by RLS.
    const writeDb = scopedClient(req.token);

    if (bio !== undefined) {
      const { error } = await writeDb.from('students').update({ bio }).eq('id', studentId);
      if (error) throw error;
    }

    if (phone !== undefined) {
      const { error } = await writeDb.from('users_profile').update({ phone }).eq('id', studentId);
      if (error) throw error;
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  try {
    const db = scopedClient(req.token);
    const { data: student, error: studentError } = await db
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();
    const { data: profile } = await db
      .from('users_profile')
      .select('full_name, phone')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    return res.json({
      student: {
        id: student.id,
        name: profile?.full_name ?? req.profile.full_name ?? null,
        phone: profile?.phone ?? null,
        bio: student.bio ?? null,
        admissionStage: student.admission_stage,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load updated profile' });
  }
});

// GET /api/students/me/attendance — own attendance, joined to classes
router.get('/me/attendance', async (req, res) => {
  const studentId = req.user.id;
  const db = scopedClient(req.token);

  try {
    const { data: student, error: studentError } = await db
      .from('students')
      .select('id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const { data, error } = await db
      .from('attendance')
      .select('id, status, classes(session_date, topic)')
      .eq('student_id', studentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to load attendance' });
    }

    const attendance = (data || [])
      .map((row) => ({
        id: row.id,
        status: row.status,
        sessionDate: row.classes?.session_date ?? null,
        topic: row.classes?.topic ?? null,
      }))
      .sort((a, b) => (a.sessionDate || '').localeCompare(b.sessionDate || ''))
      .reverse();

    return res.json({ attendance });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load attendance' });
  }
});

// GET /api/students/me/universities — universities/fellowships filtered by
// the student's course category via the university_categories join table.
// If the student has no course, or their course has no category, there is
// nothing to filter by, so the full university list is returned instead of
// fabricating a match.
router.get('/me/universities', async (req, res) => {
  const studentId = req.user.id;
  const db = scopedClient(req.token);

  try {
    const { data: student, error: studentError } = await db
      .from('students')
      .select('course_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    let course = null;
    if (student.course_id) {
      const { data } = await db
        .from('courses')
        .select('id, name, category')
        .eq('id', student.course_id)
        .single();
      course = data || null;
    }

    const universitiesQuery = course?.category
      ? db
          .from('universities')
          .select('id, name, country, fellowship_available, university_categories!inner(category)')
          .eq('university_categories.category', course.category)
          .order('name', { ascending: true })
      : db
          .from('universities')
          .select('id, name, country, fellowship_available')
          .order('name', { ascending: true });

    const { data: rawUniversities, error } = await universitiesQuery;

    if (error) {
      return res.status(500).json({ error: 'Failed to load universities' });
    }

    const universities = (rawUniversities || []).map(({ university_categories, ...university }) => university);

    return res.json({ course, universities });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load universities' });
  }
});

module.exports = router;
