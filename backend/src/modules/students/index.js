const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

// Per-request client scoped to the caller's own JWT so Postgres RLS
// (auth.uid()) applies as a second layer of defense on top of the
// server-side ownership checks below. supabaseClient.js only exports a
// shared anon/admin pair, so a per-user client is built locally here.
function scopedClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

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
        // users_profile RLS only allows selecting your own row, so a student
        // can't read their mentor's name/phone through the scoped client.
        // This single lookup uses the service-role client instead, strictly
        // scoped to the mentor id already resolved from the student's own
        // (RLS-verified) record above — never client-supplied.
        supabaseAdmin.from('users_profile').select('id, full_name, phone').eq('id', student.mentor_id).single(),
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
    if (bio !== undefined) {
      // students has no "update own row" RLS policy (only mentor/admin may
      // update it), so this write uses the service-role client. It stays
      // safe because the row is always scoped to req.user.id from the
      // verified JWT, never a client-supplied id.
      const { error } = await supabaseAdmin.from('students').update({ bio }).eq('id', studentId);
      if (error) throw error;
    }

    if (phone !== undefined) {
      // users_profile_update_own exists, so the RLS-scoped client can do
      // this write and stay covered by RLS as a second layer of defense.
      const db = scopedClient(req.token);
      const { error } = await db.from('users_profile').update({ phone }).eq('id', studentId);
      if (error) throw error;
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  try {
    // Both students_select_own and users_profile_select_own exist, so the
    // confirmation read-back goes through the RLS-scoped client rather than
    // the service-role one — service-role is reserved for the bio write
    // above, which is the only operation actually blocked by RLS.
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

// GET /api/students/me/universities — universities/fellowships, intended to
// be filtered by the student's course category.
//
// LIMITATION: the schema (db/schema.sql, frozen/out of scope) has no field
// or join linking `universities` to a course category — `universities` only
// has name/country/fellowship_available. There is nothing safe to filter on,
// so this returns the full university list alongside the student's course
// rather than fabricating a category match or scoring system.
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

    const { data: universities, error } = await db
      .from('universities')
      .select('id, name, country, fellowship_available')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to load universities' });
    }

    return res.json({ course, universities: universities || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load universities' });
  }
});

module.exports = router;
