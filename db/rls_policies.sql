-- Eklavya Foundation — Row Level Security policies (Supabase)
-- Owner: Person 1. Run after schema.sql. Implements the access matrix from
-- Eklavya_Requirements.pdf section 5 / PRD-1-foundation.md section 2.
--
-- Role source of truth: users_profile.role, keyed to auth.uid().
-- Express also checks role via JWT claims before hitting the DB — RLS here
-- is the second line of defense, not the only one.

-- ------------------------------------------------------------
-- Helper: current caller's role, used inside policies below
-- ------------------------------------------------------------
create or replace function current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from users_profile where id = auth.uid();
$$;

-- ============================================================
-- users_profile
-- ============================================================
alter table users_profile enable row level security;

create policy users_profile_select_own on users_profile
  for select using (id = auth.uid());

create policy users_profile_select_admin on users_profile
  for select using (current_user_role() = 'admin');

create policy users_profile_update_own on users_profile
  for update using (id = auth.uid());

create policy users_profile_admin_all on users_profile
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ============================================================
-- students
-- Student: SELECT own | Mentor: SELECT/UPDATE where mentor_id = self | Admin: full
-- ============================================================
alter table students enable row level security;

create policy students_select_own on students
  for select using (id = auth.uid());

create policy students_mentor_select on students
  for select using (mentor_id = auth.uid());

create policy students_mentor_update on students
  for update using (mentor_id = auth.uid());

create policy students_admin_all on students
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ============================================================
-- test_results
-- Student: SELECT own | Mentor: SELECT/INSERT for own students | Admin: full
-- ============================================================
alter table test_results enable row level security;

create policy test_results_select_own on test_results
  for select using (student_id = auth.uid());

create policy test_results_mentor_select on test_results
  for select using (
    exists (select 1 from students s where s.id = test_results.student_id and s.mentor_id = auth.uid())
  );

create policy test_results_mentor_insert on test_results
  for insert with check (
    exists (select 1 from students s where s.id = test_results.student_id and s.mentor_id = auth.uid())
  );

create policy test_results_admin_all on test_results
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ============================================================
-- attendance
-- Student: SELECT own | Mentor: SELECT/INSERT for own students | Admin: full
-- ============================================================
alter table attendance enable row level security;

create policy attendance_select_own on attendance
  for select using (student_id = auth.uid());

create policy attendance_mentor_select on attendance
  for select using (
    exists (select 1 from students s where s.id = attendance.student_id and s.mentor_id = auth.uid())
  );

create policy attendance_mentor_insert on attendance
  for insert with check (
    exists (select 1 from students s where s.id = attendance.student_id and s.mentor_id = auth.uid())
  );

create policy attendance_admin_all on attendance
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ============================================================
-- mentor_notes
-- Student: none | Mentor: SELECT/INSERT own notes | Admin: SELECT all
-- ============================================================
alter table mentor_notes enable row level security;

create policy mentor_notes_mentor_select on mentor_notes
  for select using (mentor_id = auth.uid());

create policy mentor_notes_mentor_insert on mentor_notes
  for insert with check (mentor_id = auth.uid());

create policy mentor_notes_admin_select on mentor_notes
  for select using (current_user_role() = 'admin');

-- ============================================================
-- progress_summaries
-- Student: SELECT own | Mentor: SELECT own students' | Admin: SELECT all
-- ============================================================
alter table progress_summaries enable row level security;

create policy progress_summaries_select_own on progress_summaries
  for select using (student_id = auth.uid());

create policy progress_summaries_mentor_select on progress_summaries
  for select using (
    exists (select 1 from students s where s.id = progress_summaries.student_id and s.mentor_id = auth.uid())
  );

create policy progress_summaries_admin_select on progress_summaries
  for select using (current_user_role() = 'admin');

-- ============================================================
-- courses / universities
-- Everyone: SELECT all | Admin: full CRUD
-- ============================================================
alter table courses enable row level security;

create policy courses_select_all on courses
  for select using (true);

create policy courses_admin_all on courses
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

alter table universities enable row level security;

create policy universities_select_all on universities
  for select using (true);

create policy universities_admin_all on universities
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ============================================================
-- mentors — not explicit in the matrix, but students need to read their
-- assigned mentor's profile (PRD 2.1) and admins manage mentor records.
-- ============================================================
alter table mentors enable row level security;

create policy mentors_select_all on mentors
  for select using (true);

create policy mentors_admin_all on mentors
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ============================================================
-- classes, tests, questions — not explicit in the matrix. Scoped
-- conservatively: students/mentors read what applies to them, admins
-- manage everything, mentors manage what they created.
-- ============================================================
alter table classes enable row level security;

create policy classes_select_all on classes
  for select using (true);

create policy classes_mentor_write on classes
  for all using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

create policy classes_admin_all on classes
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

alter table tests enable row level security;

create policy tests_select_all on tests
  for select using (true);

create policy tests_mentor_write on tests
  for all using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy tests_admin_all on tests
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

alter table questions enable row level security;

create policy questions_select_all on questions
  for select using (true);

create policy questions_mentor_write on questions
  for all using (
    exists (select 1 from tests t where t.id = questions.test_id and t.created_by = auth.uid())
  )
  with check (
    exists (select 1 from tests t where t.id = questions.test_id and t.created_by = auth.uid())
  );

create policy questions_admin_all on questions
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
