# PRD 2 — Student Profile & Dashboard
**Owner:** Person 2 · **Branch:** `feature/student-dashboard`
**Prerequisite:** Person 1's `feature/foundation` merged to `main`. Branch off `main` after that.

## Your scope — files you touch (and ONLY these)
- Backend: `modules/students/index.js` (stub already exists — fill it in)
- Frontend: `features/student-dashboard/*` (`StudentDashboard.jsx` exists as a stub — fill it in; add as many files as you want inside this folder)

**Do not touch:** `server.js`, `App.jsx`, `schema.sql`, `modules/tests/*`, `features/tests/*`, `features/ai-summary/*`, anyone else's folder.

## API endpoints you own
- `GET /api/students/me` — own profile, admission stage, course, mentor
- `PUT /api/students/me` — update own editable fields (bio, contact, goals)
- `GET /api/students/me/attendance` — own attendance records (read from `attendance` table, joined to `classes`)
- `GET /api/students/me/universities` — suggested universities/fellowships filtered by the student's course category (simple query, not a scoring algorithm)

**Not yours:** test-taking/results endpoints (Person 4 owns the whole Tests domain, even the `/api/students/me/tests/...` paths — see PRD 4) and the AI summary endpoint (Person 6 — you just render what they return, see below).

## Features to build
1. **Profile view/edit** — name, contact, education background, goals
2. **Dashboard home** — current admission stage shown prominently (Looking for Opportunities → Applied → Offer Received), enrolled course + mentor's profile card
3. **Suggested universities/fellowships** — simple list filtered by course category
4. **Attendance record** — own attendance history, simple table or calendar-style view
5. **Embed the test-taking flow and AI summary** — import, don't rebuild:
   ```jsx
   import TestAttempt from '../tests/TestAttempt';
   import SummaryPanel from '../ai-summary/SummaryPanel';
   ```
   Render them as tabs/sections inside your `StudentDashboard.jsx`. These are stubs until Person 4 / Person 6 finish their branches and merge — your dashboard will just show "Coming soon" until then, which is fine.

## UI notes
- Follow Person 1's design tokens (teal accent, Sora/Inter, no gradients)
- Admission stage should read like a progress tracker (3 steps, current one highlighted) — not a generic badge

## Merge instructions
Your diff is contained to `modules/students/` and `features/student-dashboard/`. If your PR touches anything else, undo it before opening the PR.
