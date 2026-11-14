# Iteration 6 — Package F: Beta Measurement

> Read [`00-guidelines.md`](00-guidelines.md) first.
> **Scope:** `playground-portal` (`iteration-6`), plus a tiny event hook in `playground-template`. After D.

**Rule:** daily counts only. No cookies, no user or browser IDs, no IP, no course text, titles, answers or file names. So no consent banner is needed during the beta.

### F1: Counters

**Files:** new `lib/metrics.ts` (`increment(name, { day, courseKey?, code? })`), store next to settings in private Blob, tests.
- Names (allowlist, typed): `landing_view`, `demo_open`, `job_submitted`, `job_published`, `job_failed`, `course_open`, `quiz_completed`, `review_completed`, `exam_completed`, `assistant_question`, `share_copied`, `report_sent`.
- Server-side increments at the authoritative place (job steps, assistant route, report route, landing/course server render).
- **Commit:** `feat: privacy-safe daily counters`

### F2: Study events from the course page

**Files:** `TEMPLATE` dispatches a `CustomEvent("study-event", { detail: { type } })` on quiz/review/exam completion (no network code in the template); `PORTAL` course layout listens and `POST`s `{ type, courseKey }` to `app/api/metrics/route.ts` (allowlist, rate-limited, `sendBeacon`).
- **Commits:** `feat: course pages announce study events` (template), `feat: count study events` (portal)

### F4: Private feedback (added 2026-11-14 at the owner's request)

**Files:** new `lib/feedback.ts`, `app/api/feedback/route.ts`, `components/feedback/FeedbackPrompt.tsx`; `app/jobs/[id]/page.tsx` (after a course is built), `app/courses/[key]/layout.tsx` (under every course), messages EN/RO, tests.
- "How useful is this?" with 1–5 stars and an optional comment (≤ 1000 characters). Stored: rating, comment, where it was given (`created` or `course`), course key, time. No name, e-mail or identifier.
- Only the owner sees it, in `/admin`, with the average per course. 10 per course per hour.
- Course pages may not post forms, so the prompt sends with `fetch` and never uses a form action.
- **Commit:** `feat: private 1-5 feedback on courses`

### F3: Admin view

**Files:** `app/admin/*`.
- Feedback (F4): newest first, with the average rating per course.
- Per day and per beta group: jobs submitted / published / failed (success rate), courses opened, study actions, Ask AI questions, share copies, reports. Per course: opens and study actions over the last 14 days, so we can see which courses get *returning* use.
- **Commit:** `feat: beta numbers in admin`
