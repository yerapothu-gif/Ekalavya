# PRD 1 — Foundation: Supabase Schema, Auth & App Shell
**Owner:** Person 1 · **Branch:** `feature/foundation`

## Why you own this
Schema design, auth, and the routing shell are the only things that genuinely need one brain — everyone else builds against what you produce, so nobody needs to sync live. Push and merge to `main` **first**; everyone else branches off your commit.

## Tech stack (fixed for the whole team)
- Frontend: React (Vite)
- Backend: Node.js + Express
- DB + Auth: **Supabase** (Postgres, Supabase Auth, Row Level Security)
- AI: OpenAI API (`gpt-4o-mini`) — owned by Person 6, but the key lives in your `.env.example`

## Your scope

### 1. Supabase project setup
- Create the Supabase project, get `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`, share with the team via `.env.example` (committed, values blank) + a private message with real values (never commit real keys)
- Run this schema exactly as-is (frozen after you commit `db/schema.sql` — nobody else edits it):
  - `users_profile` (extends `auth.users`: id, full_name, role, phone, created_at)
  - `students` (id, admission_stage, course_id, mentor_id, university_id, bio)
  - `mentors` (id, expertise[], max_students)
  - `courses` (id, name, description, category)
  - `universities` (id, name, country, fellowship_available)
  - `classes` (id, course_id, mentor_id, session_date, topic)
  - `attendance` (id, class_id, student_id, status)
  - `tests` (id, course_id, created_by, title)
  - `questions` (id, test_id, question_text, options jsonb, correct_option)
  - `test_results` (id, test_id, student_id, score, submitted_at)
  - `mentor_notes` (id, mentor_id, student_id, note_text, created_at)
  - `progress_summaries` (id, student_id, summary_text, generated_by, generated_at)

### 2. Row Level Security policies (write once, in `db/rls_policies.sql`)
Implement exactly the access matrix from the requirements doc:
| Table | Student | Mentor | Admin |
|---|---|---|---|
| students | SELECT own | SELECT/UPDATE where mentor_id=self | full |
| test_results | SELECT own | SELECT/INSERT for own students | full |
| attendance | SELECT own | SELECT/INSERT for own students | full |
| mentor_notes | none | SELECT/INSERT own notes | SELECT all |
| progress_summaries | SELECT own | SELECT own students' | SELECT all |
| courses/universities | SELECT all | SELECT all | full |

### 3. Auth endpoints (`backend/src/modules/auth/index.js`)
- `POST /api/auth/signup` — create Supabase Auth user + `users_profile` row
- `POST /api/auth/login` — proxy to Supabase Auth, returns JWT
- `GET /api/auth/me` — current user's profile + role
- JWT verification middleware, used by every other module (`middleware/requireAuth.js`, `middleware/requireRole.js`) — write these once, others import but never edit

### 4. App shell (frontend)
- `App.jsx` — routes: `/login`, `/signup`, `/student` (role-guarded), `/mentor` (role-guarded), `/admin` (role-guarded)
- `components/Layout.jsx`, `Sidebar.jsx`, `Topbar.jsx`
- Design tokens in `index.css`: headings `Sora`, body `Inter`, accent `--accent: #1f6f5c` (deep teal), bg `--bg: #f7f6f2`. No purple/blue gradients, no glassmorphism, no `rounded-2xl` everywhere — this is an internal ops tool, dense tables and sidebar nav, not a marketing page.

### 5. Stub files for every other module — CRITICAL, do this before you stop
Create these as empty-but-real files so nobody else ever touches `server.js`/`App.jsx`:
- Backend: `modules/students/index.js`, `modules/mentors/index.js`, `modules/tests/index.js`, `modules/admin/index.js`, `modules/ai/index.js` — each just `module.exports = require('express').Router();`, and `server.js` already mounts all six at `/api/students`, `/api/mentors`, `/api/tests`, `/api/admin`, `/api/ai`
- Frontend: `features/student-dashboard/StudentDashboard.jsx`, `features/mentor-dashboard/MentorDashboard.jsx`, `features/admin-dashboard/AdminDashboard.jsx` (each rendered by your role-guarded routes above), `features/tests/TestAttempt.jsx` + `features/tests/TestCreator.jsx`, `features/ai-summary/SummaryPanel.jsx` — all stub components (`export default () => <div>Coming soon</div>`)

## Merge instructions
Merge to `main` first. Tell the team the moment `schema.sql`, `rls_policies.sql`, and all stub files are pushed — everyone else branches off that commit and only edits files inside their own module/feature folder, never `server.js`, `App.jsx`, or `schema.sql`.
