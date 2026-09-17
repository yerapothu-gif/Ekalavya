require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/supabaseClient');

async function getOrCreateUser({ email, password, full_name, role, phone }) {
  // Check if auth user exists by listing users
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
  let user = listData?.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      console.error(`Failed to create auth user ${email}:`, createError.message);
      return null;
    }
    user = created.user;
  }

  // Ensure profile row exists
  const { data: profile } = await supabaseAdmin
    .from('users_profile')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const { error: pError } = await supabaseAdmin.from('users_profile').insert({
      id: user.id,
      full_name,
      role,
      phone: phone || null,
    });
    if (pError) console.error(`Error inserting profile for ${email}:`, pError.message);
  } else {
    await supabaseAdmin.from('users_profile').update({ full_name, role, phone }).eq('id', user.id);
  }

  return user.id;
}

async function seed() {
  console.log('🚀 Starting database seed process...');

  // 1. COURSES
  console.log('📚 Seeding Courses...');
  const coursesData = [
    {
      name: 'Computer Science & Software Engineering',
      description: 'Comprehensive curriculum covering algorithms, system design, and scalable backend architectures.',
      category: 'Computer Science',
    },
    {
      name: 'Data Science & Artificial Intelligence',
      description: 'Focus on machine learning, deep neural networks, statistical modeling, and data engineering.',
      category: 'Data Science',
    },
    {
      name: 'Cybersecurity & Ethical Hacking',
      description: 'Hands-on security engineering, cryptography, penetration testing, and network defense.',
      category: 'Cybersecurity',
    },
    {
      name: 'Business Analytics & Information Systems',
      description: 'Bridging technical data analysis with strategic business decision-making and product management.',
      category: 'Business Analytics',
    },
  ];

  const courses = [];
  for (const c of coursesData) {
    const { data: existing } = await supabaseAdmin.from('courses').select('*').eq('name', c.name).maybeSingle();
    if (existing) {
      courses.push(existing);
    } else {
      const { data: inserted, error } = await supabaseAdmin.from('courses').insert(c).select().single();
      if (error) console.error('Course insert error:', error.message);
      else courses.push(inserted);
    }
  }

  // 2. UNIVERSITIES & CATEGORIES
  console.log('🏛️ Seeding Universities & Categories...');
  const universitiesData = [
    { name: 'Massachusetts Institute of Technology (MIT)', country: 'USA', fellowship_available: true, categories: ['Computer Science', 'Data Science', 'Cybersecurity'] },
    { name: 'Stanford University', country: 'USA', fellowship_available: true, categories: ['Computer Science', 'Data Science', 'Business Analytics'] },
    { name: 'Technical University of Munich (TUM)', country: 'Germany', fellowship_available: true, categories: ['Computer Science', 'Cybersecurity'] },
    { name: 'University of Toronto', country: 'Canada', fellowship_available: false, categories: ['Data Science', 'Business Analytics'] },
    { name: 'ETH Zurich', country: 'Switzerland', fellowship_available: true, categories: ['Computer Science', 'Cybersecurity'] },
    { name: 'National University of Singapore (NUS)', country: 'Singapore', fellowship_available: false, categories: ['Data Science', 'Business Analytics'] },
  ];

  const universities = [];
  for (const u of universitiesData) {
    const { categories, ...uRow } = u;
    let uni;
    const { data: existing } = await supabaseAdmin.from('universities').select('*').eq('name', uRow.name).maybeSingle();
    if (existing) {
      uni = existing;
    } else {
      const { data: inserted, error } = await supabaseAdmin.from('universities').insert(uRow).select().single();
      if (error) {
        console.error('University insert error:', error.message);
        continue;
      }
      uni = inserted;
    }
    universities.push(uni);

    // Insert categories
    if (categories && categories.length > 0) {
      await supabaseAdmin.from('university_categories').delete().eq('university_id', uni.id);
      const catRows = categories.map(cat => ({ university_id: uni.id, category: cat }));
      await supabaseAdmin.from('university_categories').insert(catRows);
    }
  }

  // 3. MENTORS & TEACHERS
  console.log('👨‍🏫 Seeding Mentors & Teachers...');
  const mentorsSeedData = [
    {
      email: 'mentor.alan@eklavya.edu',
      password: 'Password123!',
      full_name: 'Dr. Alan Turing',
      role: 'mentor',
      phone: '+1-555-0101',
      expertise: ['Algorithms', 'System Design', 'Machine Learning'],
      max_students: 5,
    },
    {
      email: 'mentor.ada@eklavya.edu',
      password: 'Password123!',
      full_name: 'Prof. Ada Lovelace',
      role: 'mentor',
      phone: '+1-555-0102',
      expertise: ['Data Science', 'Artificial Intelligence', 'Statistics'],
      max_students: 4,
    },
    {
      email: 'teacher.grace@eklavya.edu',
      password: 'Password123!',
      full_name: 'Dr. Grace Hopper',
      role: 'teacher',
      phone: '+1-555-0103',
      expertise: ['Cybersecurity', 'Networks', 'Operating Systems'],
      max_students: 6,
    },
  ];

  const mentorIds = [];
  for (const m of mentorsSeedData) {
    const uid = await getOrCreateUser(m);
    if (uid) {
      mentorIds.push(uid);
      await supabaseAdmin.from('mentors').upsert({
        id: uid,
        expertise: m.expertise,
        max_students: m.max_students,
      });
    }
  }

  // 4. STUDENTS
  console.log('🎓 Seeding Students...');
  const studentsSeedData = [
    {
      email: 'student.alice@eklavya.edu',
      password: 'Password123!',
      full_name: 'Alice Johnson',
      phone: '+1-555-0201',
      admission_stage: 'offer_received',
      courseIndex: 0, // CS
      mentorIndex: 0, // Alan
      uniIndex: 0, // MIT
      bio: 'Passionate about building scalable distributed systems and operating systems.',
    },
    {
      email: 'student.bob@eklavya.edu',
      password: 'Password123!',
      full_name: 'Bob Smith',
      phone: '+1-555-0202',
      admission_stage: 'applied',
      courseIndex: 1, // Data Science
      mentorIndex: 1, // Ada
      uniIndex: 1, // Stanford
      bio: 'Focusing on natural language processing and computer vision applications.',
    },
    {
      email: 'student.charlie@eklavya.edu',
      password: 'Password123!',
      full_name: 'Charlie Brown',
      phone: '+1-555-0203',
      admission_stage: 'applied',
      courseIndex: 2, // Cyber
      mentorIndex: 2, // Grace
      uniIndex: 2, // TUM
      bio: 'Enthusiastic about web security research and reverse engineering.',
    },
    {
      email: 'student.diana@eklavya.edu',
      password: 'Password123!',
      full_name: 'Diana Prince',
      phone: '+1-555-0204',
      admission_stage: 'looking',
      courseIndex: 3, // Business Analytics
      mentorIndex: 0, // Alan
      uniIndex: 3, // Toronto
      bio: 'Aspiring product manager with a strong technical analytics foundation.',
    },
    {
      email: 'student.evan@eklavya.edu',
      password: 'Password123!',
      full_name: 'Evan Wright',
      phone: '+1-555-0205',
      admission_stage: 'offer_received',
      courseIndex: 0, // CS
      mentorIndex: 1, // Ada
      uniIndex: 4, // ETH Zurich
      bio: 'Preparing for graduate studies in high-performance computing.',
    },
  ];

  const studentIds = [];
  for (const s of studentsSeedData) {
    const uid = await getOrCreateUser({
      email: s.email,
      password: s.password,
      full_name: s.full_name,
      role: 'student',
      phone: s.phone,
    });

    if (uid) {
      studentIds.push(uid);
      const course_id = courses[s.courseIndex]?.id || null;
      const mentor_id = mentorIds[s.mentorIndex] || null;
      const university_id = universities[s.uniIndex]?.id || null;

      await supabaseAdmin.from('students').upsert({
        id: uid,
        admission_stage: s.admission_stage,
        course_id,
        mentor_id,
        university_id,
        bio: s.bio,
      });
    }
  }

  // 5. CLASSES & ATTENDANCE
  console.log('📅 Seeding Classes & Attendance...');
  const classesData = [
    {
      course_id: courses[0]?.id,
      mentor_id: mentorIds[0],
      session_date: '2026-09-10',
      topic: 'Advanced Data Structures & Graph Algorithms',
    },
    {
      course_id: courses[1]?.id,
      mentor_id: mentorIds[1],
      session_date: '2026-09-12',
      topic: 'Deep Learning & Neural Network Architectures',
    },
    {
      course_id: courses[2]?.id,
      mentor_id: mentorIds[2],
      session_date: '2026-09-15',
      topic: 'Web Application Security & OWASP Top 10',
    },
  ];

  for (let i = 0; i < classesData.length; i++) {
    const cData = classesData[i];
    if (!cData.course_id || !cData.mentor_id) continue;

    let classObj;
    const { data: existingClass } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('topic', cData.topic)
      .maybeSingle();

    if (existingClass) {
      classObj = existingClass;
    } else {
      const { data: insertedClass, error } = await supabaseAdmin.from('classes').insert(cData).select().single();
      if (error) {
        console.error('Class insert error:', error.message);
        continue;
      }
      classObj = insertedClass;
    }

    // Attendance records for students
    if (classObj && studentIds.length > 0) {
      const attendanceRows = studentIds.map((stId, idx) => ({
        class_id: classObj.id,
        student_id: stId,
        status: (idx + i) % 5 === 0 ? 'absent' : (idx + i) % 7 === 0 ? 'excused' : 'present',
      }));

      // Delete existing attendance for clean seed
      await supabaseAdmin.from('attendance').delete().eq('class_id', classObj.id);
      await supabaseAdmin.from('attendance').insert(attendanceRows);
    }
  }

  // 6. TESTS & QUESTIONS & RESULTS
  console.log('📝 Seeding Tests, Questions & Results...');
  const testsData = [
    {
      courseIndex: 0,
      title: 'Data Structures & Algorithms Diagnostic Test',
      questions: [
        {
          question_text: 'What is the worst-case time complexity of QuickSort?',
          options: ['O(N log N)', 'O(N^2)', 'O(N)', 'O(1)'],
          correct_option: 'O(N^2)',
        },
        {
          question_text: 'Which data structure enforces FIFO (First-In, First-Out)?',
          options: ['Stack', 'Queue', 'Binary Tree', 'Heap'],
          correct_option: 'Queue',
        },
      ],
    },
    {
      courseIndex: 1,
      title: 'Machine Learning Foundations Quiz',
      questions: [
        {
          question_text: 'Which activation function is most prone to the Vanishing Gradient problem?',
          options: ['ReLU', 'Leaky ReLU', 'Sigmoid', 'ELU'],
          correct_option: 'Sigmoid',
        },
        {
          question_text: 'Supervised learning requires which type of dataset?',
          options: ['Unlabeled data', 'Labeled data', 'Streamed data', 'Sparse matrices'],
          correct_option: 'Labeled data',
        },
      ],
    },
  ];

  for (const tData of testsData) {
    const course_id = courses[tData.courseIndex]?.id;
    if (!course_id) continue;

    let testObj;
    const { data: existingTest } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('title', tData.title)
      .maybeSingle();

    if (existingTest) {
      testObj = existingTest;
    } else {
      const { data: insertedTest, error } = await supabaseAdmin
        .from('tests')
        .insert({
          course_id,
          created_by: mentorIds[0],
          title: tData.title,
        })
        .select()
        .single();
      if (error) {
        console.error('Test insert error:', error.message);
        continue;
      }
      testObj = insertedTest;
    }

    // Insert questions
    if (testObj && tData.questions) {
      await supabaseAdmin.from('questions').delete().eq('test_id', testObj.id);
      const qRows = tData.questions.map(q => ({
        test_id: testObj.id,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
      }));
      await supabaseAdmin.from('questions').insert(qRows);
    }

    // Insert test results
    if (testObj && studentIds.length > 0) {
      await supabaseAdmin.from('test_results').delete().eq('test_id', testObj.id);
      const resultsRows = [
        { test_id: testObj.id, student_id: studentIds[0], score: 95 },
        { test_id: testObj.id, student_id: studentIds[1], score: 88 },
        { test_id: testObj.id, student_id: studentIds[2], score: 78 },
        { test_id: testObj.id, student_id: studentIds[3], score: 85 },
      ];
      await supabaseAdmin.from('test_results').insert(resultsRows);
    }
  }

  // 7. MENTOR NOTES & PROGRESS SUMMARIES
  console.log('📌 Seeding Mentor Notes & Progress Summaries...');
  if (mentorIds.length > 0 && studentIds.length > 0) {
    // Notes
    await supabaseAdmin.from('mentor_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('mentor_notes').insert([
      {
        mentor_id: mentorIds[0],
        student_id: studentIds[0],
        note_text: 'Alice completed her mock technical interview with exceptional performance in graph algorithm problem-solving.',
      },
      {
        mentor_id: mentorIds[1],
        student_id: studentIds[1],
        note_text: 'Bob needs extra support in deep learning regularization techniques before submitting his application to Stanford.',
      },
    ]);

    // Summaries
    await supabaseAdmin.from('progress_summaries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('progress_summaries').insert([
      {
        student_id: studentIds[0],
        summary_text: 'Alice has demonstrated high academic consistency with a 95% test average and 100% class attendance. Her application to MIT is strong.',
        generated_by: mentorIds[0],
      },
      {
        student_id: studentIds[1],
        summary_text: 'Bob is making steady progress in Data Science. Attendance is at 90% and test performance sits at 88%. Recommended focus area: ML optimization math.',
        generated_by: mentorIds[1],
      },
    ]);
  }

  console.log('✅ Database seeding complete!');
  console.log('\n--- DEMO USER CREDENTIALS ---');
  console.log('👑 Admin: bhanusrireddy1@gmail.com');
  console.log('👨‍🏫 Mentor: mentor.alan@eklavya.edu / Password123!');
  console.log('🎓 Student (Alice): student.alice@eklavya.edu / Password123!');
  console.log('🎓 Student (Bob): student.bob@eklavya.edu / Password123!');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
