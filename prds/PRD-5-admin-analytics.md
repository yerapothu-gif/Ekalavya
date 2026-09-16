# PRD 5 — Admin Panel & Analytics
**Owner:** Person 5 · **Branch:** `feature/admin-analytics`
**Prerequisite:** Person 1's `feature/foundation` merged to `main`. Branch off `main` after that.

## Your scope — files you touch (and ONLY these)
- Backend: `modules/admin/index.js` (stub already exists — fill it in)
- Frontend: `features/admin-dashboard/*` (`AdminDashboard.jsx` exists as a stub — fill it in; add as many files as you want inside this folder)

**Do not touch:** `server.js`, `App.jsx`, `schema.sql`, `modules/tests/*`, `features/tests/*`, `features/ai-summary/*`, anyone else's folder.

## API endpoints you own
- `GET /api/admin/students` — list/filter/search all students
- `POST /api/admin/students` / `PUT /api/admin/students/:id` / `DELETE /api/admin/students/:id` — full CRUD
- `GET /api/admin/mentors` — list all mentors/teachers with current workload (student count)
- `POST /api/admin/mentors` — onboard a new mentor/teacher
- `POST /api/admin/match` — assign/reassign mentor ↔ student
- `POST /api/admin/courses` — create/update a course
- `POST /api/admin/universities` — create/update a university/fellowship
- `GET /api/admin/analytics/overview` — admission-stage funnel, attendance %, average scores
- `GET /api/admin/analytics/universities` — applicants per university
- `GET /api/admin/users` — manage all user accounts & roles

## Features to build
1. **Student management** — searchable/filterable table, create/edit/delete
2. **Mentor management + matching** — mentor list with workload (student count vs `max_students`), an assign/reassign UI (pick student → pick mentor)
3. **Course & university management** — simple CRUD forms
4. **User & role management** — invite users, change roles
5. **Analytics dashboard** (this is the "wow" screen for judges):
   - Admission-stage funnel (Looking → Applied → Offer Received)
   - Attendance % trend
   - Average test scores by course
   - Applicants per university
   - Mentor workload (students per mentor)

## UI notes
- Follow Person 1's design tokens — one accent color (teal) used consistently across all charts, not a rainbow palette (that's a generic-AI-dashboard tell)
- This is the densest screen in the app — use tabs (Students / Mentors / Courses & Universities / Users / Analytics) rather than one long scrolling page
- Real numbers/names in your test data, not "University A", "Mentor 1"

## Merge instructions
Your diff is contained to `modules/admin/` and `features/admin-dashboard/`. If your PR touches anything else, undo it before opening the PR.
