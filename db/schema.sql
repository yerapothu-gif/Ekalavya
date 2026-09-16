-- Eklavya Foundation — Postgres schema (Supabase)
-- Owner: Person 1. Frozen after first commit — do not edit outside this file.
-- Run in the Supabase SQL editor against a fresh project.

create extension if not exists "pgcrypto";

-- ============================================================
-- users_profile — extends auth.users, single source of role
-- ============================================================
create table if not exists users_profile (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null check (role in ('student', 'mentor', 'teacher', 'admin')),
  phone       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- courses
-- ============================================================
create table if not exists courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text
);

-- ============================================================
-- universities
-- ============================================================
create table if not exists universities (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  country               text,
  fellowship_available  boolean default false
);

-- ============================================================
-- mentors — extends users_profile
-- ============================================================
create table if not exists mentors (
  id            uuid primary key references users_profile(id) on delete cascade,
  expertise     text[] default '{}',
  max_students  int default 0
);

-- ============================================================
-- students — extends users_profile
-- ============================================================
create table if not exists students (
  id              uuid primary key references users_profile(id) on delete cascade,
  admission_stage text not null default 'looking' check (admission_stage in ('looking', 'applied', 'offer_received')),
  course_id       uuid references courses(id),
  mentor_id       uuid references users_profile(id),
  university_id   uuid references universities(id),
  bio             text
);

-- ============================================================
-- classes
-- ============================================================
create table if not exists classes (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid references courses(id),
  mentor_id     uuid references users_profile(id),
  session_date  date,
  topic         text
);

-- ============================================================
-- attendance
-- ============================================================
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references classes(id) on delete cascade,
  student_id  uuid references students(id) on delete cascade,
  status      text not null check (status in ('present', 'absent', 'excused'))
);

-- ============================================================
-- tests
-- ============================================================
create table if not exists tests (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references courses(id),
  created_by  uuid references users_profile(id),
  title       text not null
);

-- ============================================================
-- questions
-- ============================================================
create table if not exists questions (
  id              uuid primary key default gen_random_uuid(),
  test_id         uuid references tests(id) on delete cascade,
  question_text   text not null,
  options         jsonb not null default '[]',
  correct_option  text not null
);

-- ============================================================
-- test_results
-- ============================================================
create table if not exists test_results (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid references tests(id) on delete cascade,
  student_id    uuid references students(id) on delete cascade,
  score         numeric,
  submitted_at  timestamptz not null default now()
);

-- ============================================================
-- mentor_notes
-- ============================================================
create table if not exists mentor_notes (
  id          uuid primary key default gen_random_uuid(),
  mentor_id   uuid references users_profile(id),
  student_id  uuid references students(id) on delete cascade,
  note_text   text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- progress_summaries
-- ============================================================
create table if not exists progress_summaries (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references students(id) on delete cascade,
  summary_text  text,
  generated_by  uuid references users_profile(id),
  generated_at  timestamptz not null default now()
);

-- Helpful indexes for the access patterns in the RLS matrix
create index if not exists idx_students_mentor_id on students(mentor_id);
create index if not exists idx_attendance_student_id on attendance(student_id);
create index if not exists idx_test_results_student_id on test_results(student_id);
create index if not exists idx_mentor_notes_student_id on mentor_notes(student_id);
create index if not exists idx_mentor_notes_mentor_id on mentor_notes(mentor_id);
create index if not exists idx_progress_summaries_student_id on progress_summaries(student_id);
create index if not exists idx_classes_mentor_id on classes(mentor_id);
