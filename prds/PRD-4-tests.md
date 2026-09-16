# PRD 4 — Tests & Assessments
**Owner:** Person 4 · **Branch:** `feature/tests`
**Prerequisite:** Person 1's `feature/foundation` merged to `main`. Branch off `main` after that.

## Why you own the whole domain
The requirements doc splits test endpoints across both the Student and Mentor role sections, but it's one coherent feature (create → take → score → view results) built on the same tables (`tests`, `questions`, `test_results`). Splitting it between two people would mean two people editing the same scoring logic — so you own it end to end, and Persons 2 and 3 just import your components.

## Your scope — files you touch (and ONLY these)
- Backend: `modules/tests/index.js` (stub already exists — fill it in)
- Frontend: `features/tests/*` (`TestAttempt.jsx` and `TestCreator.jsx` exist as stubs — fill them in; add as many files as you want inside this folder)

**Do not touch:** `server.js`, `App.jsx`, `schema.sql`, `modules/students/*`, `modules/mentors/*`, `features/student-dashboard/*`, `features/mentor-dashboard/*`, `features/ai-summary/*`.

## API endpoints you own
- `GET /api/students/me/tests` — tests available for the student's enrolled course
- `POST /api/students/me/tests/:testId/submit` — submit answers, auto-score against `questions.correct_option`, insert into `test_results`
- `GET /api/students/me/results` — student's own result history
- `POST /api/mentors/me/tests` — create a test with questions (title, course, question list with options + correct answer)
- `GET /api/mentors/me/tests/:id/results` — results for one test, for the mentor's own students

Yes, these live under `/api/students/...` and `/api/mentors/...` URL paths per the spec, but they all live in **your** `modules/tests/index.js` file and get mounted at those paths from `server.js` (already wired by Person 1 — you don't touch that file, just write the route handlers).

## Features to build
1. **`TestCreator.jsx`** — mentor-facing form: title, pick course, add questions (text + multiple options + mark correct one), publish
2. **`TestAttempt.jsx`** — student-facing: list of available tests → pick one → answer questions → submit → see score immediately
3. **Results view** — for a given test, show score distribution across students who took it (a simple table or bar list is enough — the deeper analytics version across the whole platform belongs to Person 5)

## Integration contract (how Person 2 and Person 3 use your work)
They'll do:
```jsx
import TestAttempt from '../tests/TestAttempt';   // Person 2, in student dashboard
import TestCreator from '../tests/TestCreator';   // Person 3, in mentor dashboard
```
Keep both components self-contained (fetch their own data, no required props beyond maybe `studentId`/`mentorId` if you want) so they drop in cleanly.

## UI notes
- Follow Person 1's design tokens
- Question-by-question flow for `TestAttempt` (one question per screen or a single scrollable form — either is fine), clear score reveal at the end

## Merge instructions
Your diff is contained to `modules/tests/` and `features/tests/`. Push and merge reasonably early since Persons 2 and 3 are importing your components — tell the team once your stubs have real content.
