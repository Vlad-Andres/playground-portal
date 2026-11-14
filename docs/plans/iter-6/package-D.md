# Iteration 6 — Package D: Trust and Sharing

> Read [`00-guidelines.md`](00-guidelines.md) first (H2, H5).
> **Scope:** `playground-portal` (`iteration-6`). After C.

---

### Task D1: Share card

**Files:** `app/jobs/[id]/page.tsx`, `app/my/[key]/*`, `app/manage/[token]/*`, new `components/course/ShareCard.tsx`, messages, tests.
- One "Copy course link" button that copies only `/courses/<key>/` (never a job, manage or token URL), with the line "Anyone with this link can read the course."
- The manage link sits in a separate, visually quieter block: "Private — lets anyone edit or delete this course."
- Test: the copied value never contains `/manage/`, `/jobs/` or a token.
- **Commit:** `feat: share card that copies only the course link`

### Task D2: Rights checkbox at creation

**Files:** `components/create/Builder.tsx`, `lib/api/handlers.ts` (reject `rights-not-confirmed` when missing), messages, tests.
- Required checkbox: "I may use this material, and I understand anyone with the course link can read the course."
- **Commit:** `feat: confirm the right to use and share the material`

### Task D3: Privacy and terms pages

**Files:** new `app/privacy/page.tsx`, `app/terms/page.tsx`, footer links, messages, tests.
- Plain EN/RO text that matches the code: text extracted in the browser; text sent to an AI provider to write the course; job text deleted after publishing and job records after 7 days; kept files only when switched on; course links are unlisted (`noindex`) but readable by anyone with the link; how to delete a course or an account; contact address placeholder `{CONTACT_EMAIL}` filled from an env var the owner sets.
- Mark both pages "Beta — reviewed before public launch".
- **Commit:** `feat: privacy and terms pages for the beta`

### Task D4: Report a problem

**Files:** new `app/api/reports/route.ts`, `app/courses/[key]/layout.tsx` (link in footer), `app/admin/*` (queue with "dismiss" and the existing takedown), `lib/sites/*` storage, tests.
- Form fields: category (wrong content / copyright / other), optional message ≤ 1000 chars, optional reply e-mail. Store category, course key, message, e-mail, timestamp, status in private storage. Rate-limit 5 reports per course per hour.
- **Commit:** `feat: report a problem with a course`

**Check by hand:** copy link → paste in a clean browser (reads, cannot manage); submit a report → appears in admin → takedown → course 404.
