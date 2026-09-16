# PRD 6 — AI Summarization (OpenAI)
**Owner:** Person 6 · **Branch:** `feature/ai-summary`
**Prerequisite:** Person 1's `feature/foundation` merged to `main`. Branch off `main` after that.

## Your scope — files you touch (and ONLY these)
- Backend: `modules/ai/index.js` (stub already exists — fill it in)
- Frontend: `features/ai-summary/*` (`SummaryPanel.jsx` exists as a stub — fill it in; add as many files as you want inside this folder)

**Do not touch:** `server.js`, `App.jsx`, `schema.sql`, `modules/students/*`, `modules/mentors/*`, `modules/admin/*`, `modules/tests/*`, any `features/` folder besides your own.

## API endpoints you own
- `POST /api/ai/summarize/:studentId` (role: mentor, admin) — pulls that student's `mentor_notes` + `test_results` + `attendance` from Supabase (read-only queries — you're reading tables other people's endpoints write to, which is fine and expected, just don't add write logic to those tables), constructs a prompt, calls the OpenAI API **server-side only**, stores the result in `progress_summaries`, returns the summary text
- `GET /api/ai/summary/:studentId` (role: student — own only, mentor, admin) — fetch the latest stored summary, no OpenAI call needed (just a DB read)

**Security requirement from the spec:** the OpenAI API key lives only in your backend's `.env` (`OPENAI_API_KEY`), never sent to or callable from the frontend. `SummaryPanel.jsx` calls your Express endpoint, never the OpenAI API directly.

## Features to build
1. **Prompt construction** — combine the student's notes, test scores, and attendance into a clear prompt asking for a concise progress summary (2–4 sentences, plain language suitable for a funder report)
2. **`SummaryPanel.jsx`** — a self-contained component that:
   - Takes a `studentId` prop
   - Shows the latest stored summary if one exists (calls `GET /api/ai/summary/:studentId`)
   - Shows a "Generate summary" button (mentor/admin view only — hide it in the student's own view) that calls `POST /api/ai/summarize/:studentId` and displays the result
3. **Loading/error states** — OpenAI calls can be slow or fail; show a spinner and a friendly retry option

## Integration contract (how Persons 2, 3, 5 use your work)
They'll do:
```jsx
import SummaryPanel from '../ai-summary/SummaryPanel';
// <SummaryPanel studentId={id} viewerRole="mentor" />
```
Accept a `viewerRole` prop (`'student' | 'mentor' | 'admin'`) to control whether the generate button shows. Keep this component fully self-contained so it drops into any of their pages without them needing to touch your files.

## UI notes
- Follow Person 1's design tokens
- The summary should read as a card with a subtle "AI-generated" label (small, unobtrusive — not a flashy sparkle-icon badge, which reads as generic AI-product styling)

## Merge instructions
Your diff is contained to `modules/ai/` and `features/ai-summary/`. Push and merge reasonably early since Persons 2, 3, and 5 all import `SummaryPanel` — tell the team once it has real content.
