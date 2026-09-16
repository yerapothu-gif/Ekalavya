# PRD 3 — Mentor / Teacher Dashboard
**Owner:** Person 3 · **Branch:** `feature/mentor-dashboard`
**Prerequisite:** Person 1's `feature/foundation` merged to `main`. Branch off `main` after that.

## Your scope — files you touch (and ONLY these)
- Backend: `modules/mentors/index.js` (stub already exists — fill it in)
- Frontend: `features/mentor-dashboard/*` (`MentorDashboard.jsx` exists as a stub — fill it in; add as many files as you want inside this folder)

**Do not touch:** `server.js`, `App.jsx`, `schema.sql`, `modules/tests/*`, `features/tests/*`, `features/ai-summary/*`, anyone else's folder.

## API endpoints you own
- `GET /api/mentors/me/students` — list of students assigned to this mentor only
- `GET /api/mentors/me/students/:id` — detail view of one assigned student
- `PATCH /api/mentors/me/students/:id/stage` — update `admission_stage`
- `POST /api/mentors/me/notes` — add a free-text note for a student
- `POST /api/mentors/me/attendance` — mark attendance for a class session (create the `classes` row if it doesn't exist yet, then insert `attendance` rows for each student in it)

**Not yours:** test creation/grading (Person 4 owns the whole Tests domain, even `/api/mentors/me/tests/...` paths — see PRD 4) and AI summary generation (Person 6 — you just trigger/display it, see below).

## Features to build
1. **My students list** — only students where `mentor_id = self`, not the full student base
2. **Student detail view** — profile, current admission stage + history, notes timeline
3. **Update admission stage** — simple dropdown/button flow (Looking → Applied → Offer Received)
4. **Add mentor notes** — free-text field, timestamped, shown in the student detail timeline
5. **Mark attendance** — pick a class session (or create one: course + date + topic), mark each of your students present/absent/excused
6. **Embed AI summary trigger** — import, don't rebuild:
   ```jsx
   import SummaryPanel from '../ai-summary/SummaryPanel';
   ```
   Render it in the student detail view with a "Generate summary" button — the button/logic lives inside `SummaryPanel`, you just place it on the page.

## UI notes
- Follow Person 1's design tokens
- This is a caseload view — think inbox/list-then-detail pattern (list on the left, detail on the right), not a grid of cards

## Merge instructions
Your diff is contained to `modules/mentors/` and `features/mentor-dashboard/`. If your PR touches anything else, undo it before opening the PR.
