const express = require('express');
const { supabaseAdmin } = require('../../supabaseClient');
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

// Apply auth and role protection for all mentor routes
router.use(requireAuth);
router.use(requireRole('mentor', 'teacher', 'admin'));

const VALID_ADMISSION_STAGES = ['looking', 'applied', 'offer_received'];
const VALID_ATTENDANCE_STATUSES = ['present', 'absent', 'excused'];

/**
 * GET /api/mentors/me/students
 * List of students assigned to this mentor only
 */
router.get('/me/students', async (req, res) => {
  try {
    const mentorId = req.user.id;

    // Fetch students assigned to this mentor
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, admission_stage, course_id, mentor_id, university_id, bio')
      .eq('mentor_id', mentorId);

    if (studentsError) {
      return res.status(500).json({ error: studentsError.message });
    }

    if (!students || students.length === 0) {
      return res.json([]);
    }

    const studentIds = students.map((s) => s.id);
    const courseIds = [...new Set(students.map((s) => s.course_id).filter(Boolean))];
    const universityIds = [...new Set(students.map((s) => s.university_id).filter(Boolean))];

    // Fetch related users_profile
    const { data: profiles } = await supabaseAdmin
      .from('users_profile')
      .select('id, full_name, phone, created_at')
      .in('id', studentIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Fetch related courses
    let courseMap = new Map();
    if (courseIds.length > 0) {
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('id, name, category')
        .in('id', courseIds);
      courseMap = new Map((courses || []).map((c) => [c.id, c]));
    }

    // Fetch related universities
    let universityMap = new Map();
    if (universityIds.length > 0) {
      const { data: universities } = await supabaseAdmin
        .from('universities')
        .select('id, name, country, fellowship_available')
        .in('id', universityIds);
      universityMap = new Map((universities || []).map((u) => [u.id, u]));
    }

    // Fetch notes count for each student
    const { data: notes } = await supabaseAdmin
      .from('mentor_notes')
      .select('student_id')
      .in('student_id', studentIds);

    const notesCountMap = new Map();
    (notes || []).forEach((n) => {
      notesCountMap.set(n.student_id, (notesCountMap.get(n.student_id) || 0) + 1);
    });

    const enrichedStudents = students.map((student) => {
      const profile = profileMap.get(student.id) || {};
      const course = student.course_id ? courseMap.get(student.course_id) : null;
      const university = student.university_id ? universityMap.get(student.university_id) : null;

      return {
        id: student.id,
        full_name: profile.full_name || 'Unknown Student',
        phone: profile.phone || null,
        joined_at: profile.created_at || null,
        admission_stage: student.admission_stage || 'looking',
        bio: student.bio || '',
        course_id: student.course_id,
        course_name: course ? course.name : null,
        course_category: course ? course.category : null,
        university_id: student.university_id,
        university_name: university ? university.name : null,
        university_country: university ? university.country : null,
        notes_count: notesCountMap.get(student.id) || 0,
      };
    });

    return res.json(enrichedStudents);
  } catch (err) {
    console.error('Error fetching mentor students:', err);
    return res.status(500).json({ error: 'Internal server error fetching students' });
  }
});

/**
 * GET /api/mentors/me/students/:id
 * Detail view of one assigned student
 */
router.get('/me/students/:id', async (req, res) => {
  try {
    const mentorId = req.user.id;
    const studentId = req.params.id;

    // Verify student is assigned to this mentor
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, admission_stage, course_id, mentor_id, university_id, bio')
      .eq('id', studentId)
      .eq('mentor_id', mentorId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found or not assigned to you' });
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('users_profile')
      .select('id, full_name, phone, created_at')
      .eq('id', studentId)
      .single();

    // Fetch course details
    let course = null;
    if (student.course_id) {
      const { data: courseData } = await supabaseAdmin
        .from('courses')
        .select('id, name, description, category')
        .eq('id', student.course_id)
        .single();
      course = courseData;
    }

    // Fetch university details
    let university = null;
    if (student.university_id) {
      const { data: universityData } = await supabaseAdmin
        .from('universities')
        .select('id, name, country, fellowship_available')
        .eq('id', student.university_id)
        .single();
      university = universityData;
    }

    // Fetch notes timeline
    const { data: notes } = await supabaseAdmin
      .from('mentor_notes')
      .select('id, mentor_id, student_id, note_text, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    // Fetch attendance history for this student
    const { data: attendanceRecords } = await supabaseAdmin
      .from('attendance')
      .select('id, class_id, status')
      .eq('student_id', studentId);

    let detailedAttendance = [];
    if (attendanceRecords && attendanceRecords.length > 0) {
      const classIds = attendanceRecords.map((a) => a.class_id).filter(Boolean);
      const { data: classes } = await supabaseAdmin
        .from('classes')
        .select('id, session_date, topic, course_id')
        .in('id', classIds);

      const classMap = new Map((classes || []).map((c) => [c.id, c]));

      detailedAttendance = attendanceRecords
        .map((a) => {
          const cls = classMap.get(a.class_id) || {};
          return {
            id: a.id,
            class_id: a.class_id,
            status: a.status,
            session_date: cls.session_date || null,
            topic: cls.topic || 'Untitled Class',
          };
        })
        .sort((a, b) => new Date(b.session_date || 0) - new Date(a.session_date || 0));
    }

    // Fetch test results
    const { data: testResults } = await supabaseAdmin
      .from('test_results')
      .select('id, test_id, score, submitted_at')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    let detailedTestResults = [];
    if (testResults && testResults.length > 0) {
      const testIds = testResults.map((t) => t.test_id).filter(Boolean);
      const { data: testItems } = await supabaseAdmin
        .from('tests')
        .select('id, title, course_id')
        .in('id', testIds);

      const testMap = new Map((testItems || []).map((t) => [t.id, t]));

      detailedTestResults = testResults.map((tr) => {
        const test = testMap.get(tr.test_id) || {};
        return {
          id: tr.id,
          test_id: tr.test_id,
          title: test.title || 'Untitled Test',
          score: tr.score,
          submitted_at: tr.submitted_at,
        };
      });
    }

    // Fetch progress summaries
    const { data: summaries } = await supabaseAdmin
      .from('progress_summaries')
      .select('id, summary_text, generated_at, generated_by')
      .eq('student_id', studentId)
      .order('generated_at', { ascending: false });

    return res.json({
      student: {
        id: student.id,
        full_name: profile?.full_name || 'Unknown Student',
        phone: profile?.phone || null,
        joined_at: profile?.created_at || null,
        admission_stage: student.admission_stage || 'looking',
        bio: student.bio || '',
        course,
        university,
      },
      notes: notes || [],
      attendance: detailedAttendance,
      test_results: detailedTestResults,
      summaries: summaries || [],
    });
  } catch (err) {
    console.error('Error fetching student detail:', err);
    return res.status(500).json({ error: 'Internal server error fetching student details' });
  }
});

/**
 * PATCH /api/mentors/me/students/:id/stage
 * Update admission_stage (looking -> applied -> offer_received)
 */
router.patch('/me/students/:id/stage', async (req, res) => {
  try {
    const mentorId = req.user.id;
    const studentId = req.params.id;
    const stage = req.body.admission_stage || req.body.stage;

    if (!stage || !VALID_ADMISSION_STAGES.includes(stage)) {
      return res.status(400).json({
        error: `Invalid admission stage. Must be one of: ${VALID_ADMISSION_STAGES.join(', ')}`,
      });
    }

    // Verify ownership
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('id, mentor_id')
      .eq('id', studentId)
      .eq('mentor_id', mentorId)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({ error: 'Student not found or not assigned to you' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ admission_stage: stage })
      .eq('id', studentId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({
      message: 'Admission stage updated successfully',
      student_id: studentId,
      admission_stage: stage,
    });
  } catch (err) {
    console.error('Error updating admission stage:', err);
    return res.status(500).json({ error: 'Internal server error updating stage' });
  }
});

/**
 * POST /api/mentors/me/notes
 * Add a free-text note for an assigned student
 */
router.post('/me/notes', async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { student_id, note_text } = req.body || {};

    if (!student_id || !note_text || typeof note_text !== 'string' || !note_text.trim()) {
      return res.status(400).json({ error: 'student_id and non-empty note_text are required' });
    }

    // Verify student ownership
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, mentor_id')
      .eq('id', student_id)
      .eq('mentor_id', mentorId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found or not assigned to you' });
    }

    const { data: createdNote, error: insertError } = await supabaseAdmin
      .from('mentor_notes')
      .insert({
        mentor_id: mentorId,
        student_id,
        note_text: note_text.trim(),
      })
      .select('id, mentor_id, student_id, note_text, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json(createdNote);
  } catch (err) {
    console.error('Error adding mentor note:', err);
    return res.status(500).json({ error: 'Internal server error adding note' });
  }
});

/**
 * POST /api/mentors/me/attendance
 * Mark attendance for a class session (create classes row if needed, then insert/upsert attendance rows)
 */
router.post('/me/attendance', async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { class_id, course_id, session_date, topic, records } = req.body || {};

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array with student attendance is required' });
    }

    // Validate attendance statuses
    for (const record of records) {
      if (!record.student_id || !VALID_ATTENDANCE_STATUSES.includes(record.status)) {
        return res.status(400).json({
          error: `Invalid record: student_id is required and status must be one of: ${VALID_ATTENDANCE_STATUSES.join(', ')}`,
        });
      }
    }

    let targetClassId = class_id;
    let classRecord = null;

    if (targetClassId) {
      // Verify class belongs to mentor
      const { data: existingClass, error: classError } = await supabaseAdmin
        .from('classes')
        .select('*')
        .eq('id', targetClassId)
        .eq('mentor_id', mentorId)
        .single();

      if (classError || !existingClass) {
        return res.status(404).json({ error: 'Class session not found or not owned by you' });
      }

      classRecord = existingClass;
    } else {
      // Create new class session
      if (!session_date || !topic) {
        return res.status(400).json({
          error: 'session_date and topic are required to create a new class session',
        });
      }

      const { data: newClass, error: createClassError } = await supabaseAdmin
        .from('classes')
        .insert({
          mentor_id: mentorId,
          course_id: course_id || null,
          session_date,
          topic: topic.trim(),
        })
        .select('*')
        .single();

      if (createClassError) {
        return res.status(500).json({ error: createClassError.message });
      }

      targetClassId = newClass.id;
      classRecord = newClass;
    }

    // Fetch existing attendance records for this class to update or insert
    const { data: existingAttendance } = await supabaseAdmin
      .from('attendance')
      .select('id, student_id')
      .eq('class_id', targetClassId);

    const existingMap = new Map((existingAttendance || []).map((a) => [a.student_id, a.id]));

    const results = [];
    for (const record of records) {
      const existingId = existingMap.get(record.student_id);
      if (existingId) {
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('attendance')
          .update({ status: record.status })
          .eq('id', existingId)
          .select('id, class_id, student_id, status')
          .single();

        if (!updateErr && updated) {
          results.push(updated);
        }
      } else {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('attendance')
          .insert({
            class_id: targetClassId,
            student_id: record.student_id,
            status: record.status,
          })
          .select('id, class_id, student_id, status')
          .single();

        if (!insertErr && inserted) {
          results.push(inserted);
        }
      }
    }

    return res.json({
      success: true,
      class: classRecord,
      attendance: results,
    });
  } catch (err) {
    console.error('Error marking attendance:', err);
    return res.status(500).json({ error: 'Internal server error marking attendance' });
  }
});

/**
 * GET /api/mentors/me/classes
 * Get all class sessions created by this mentor
 */
router.get('/me/classes', async (req, res) => {
  try {
    const mentorId = req.user.id;

    const { data: classes, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('id, course_id, session_date, topic')
      .eq('mentor_id', mentorId)
      .order('session_date', { ascending: false });

    if (classesError) {
      return res.status(500).json({ error: classesError.message });
    }

    if (!classes || classes.length === 0) {
      return res.json([]);
    }

    const courseIds = [...new Set(classes.map((c) => c.course_id).filter(Boolean))];
    let courseMap = new Map();
    if (courseIds.length > 0) {
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('id, name')
        .in('id', courseIds);
      courseMap = new Map((courses || []).map((c) => [c.id, c.name]));
    }

    const classIds = classes.map((c) => c.id);
    const { data: attendanceList } = await supabaseAdmin
      .from('attendance')
      .select('class_id, status')
      .in('class_id', classIds);

    const statsMap = new Map();
    (attendanceList || []).forEach((att) => {
      if (!statsMap.has(att.class_id)) {
        statsMap.set(att.class_id, { total: 0, present: 0, absent: 0, excused: 0 });
      }
      const stat = statsMap.get(att.class_id);
      stat.total += 1;
      if (att.status === 'present') stat.present += 1;
      if (att.status === 'absent') stat.absent += 1;
      if (att.status === 'excused') stat.excused += 1;
    });

    const enriched = classes.map((cls) => ({
      id: cls.id,
      session_date: cls.session_date,
      topic: cls.topic,
      course_id: cls.course_id,
      course_name: cls.course_id ? courseMap.get(cls.course_id) || 'Unknown Course' : 'General Session',
      stats: statsMap.get(cls.id) || { total: 0, present: 0, absent: 0, excused: 0 },
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('Error fetching classes:', err);
    return res.status(500).json({ error: 'Internal server error fetching classes' });
  }
});

/**
 * GET /api/mentors/me/classes/:id/attendance
 * Get attendance records for a specific class
 */
router.get('/me/classes/:id/attendance', async (req, res) => {
  try {
    const mentorId = req.user.id;
    const classId = req.params.id;

    // Verify class ownership
    const { data: cls, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('mentor_id', mentorId)
      .single();

    if (classErr || !cls) {
      return res.status(404).json({ error: 'Class not found or not owned by you' });
    }

    const { data: attendanceRecords } = await supabaseAdmin
      .from('attendance')
      .select('id, student_id, status')
      .eq('class_id', classId);

    return res.json({
      class: cls,
      records: attendanceRecords || [],
    });
  } catch (err) {
    console.error('Error fetching class attendance:', err);
    return res.status(500).json({ error: 'Internal server error fetching class attendance' });
  }
});

/**
 * GET /api/mentors/me/courses
 * Get list of available courses for class session creation
 */
router.get('/me/courses', async (req, res) => {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('id, name, description, category')
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(courses || []);
  } catch (err) {
    console.error('Error fetching courses:', err);
    return res.status(500).json({ error: 'Internal server error fetching courses' });
  }
});

module.exports = router;
