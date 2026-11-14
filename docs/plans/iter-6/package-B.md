# Iteration 6 — Package B: Study-Loop Features That Sell It

> Read [`00-guidelines.md`](00-guidelines.md) first (H1, H2, H5).
> **Scope:** `playground-template` (`iteration-6`), plus one prompt change in `playground-portal` (B4). Builds on what exists: per-lecture quiz progress (`src/hooks/useProgress.ts`, `src/lib/progress.ts`), the scheduled difficult-parts review (`src/hooks/useDifficult.ts`, `src/components/difficult/*`) and the per-lecture exam breakdown (`src/widgets/core/MockExam.tsx`).

These are the features the landing page and the demo videos show. Each must look good in the Figma course screens (Package V) — build the logic first with current styling; Package V restyles.

---

### Task B1: Save exam results

**Files:** new `src/hooks/useExamHistory.ts`, `src/widgets/core/MockExam.tsx`, tests.
- On submit, store `{ at, score, total, byLecture: { slug, right, total }[] }` in `exam:v1` (keep the newest 10).
- The result screen adds "Last time: 6/10 → now 8/10" when a previous attempt exists.
- **Commit:** `feat: remember practice exam results in this browser`

### Task B2: "Study next" on the course home

**Files:** new `src/lib/studyNext.ts` (pure function), new `src/components/home/StudyNext.tsx`, `src/screens/HomeScreen.tsx`, tests.
- `studyNext(course, progress, difficult, examHistory)` returns up to 3 items, ranked: (1) lectures whose last exam share was < 60 %, (2) lectures whose best quiz score is below `QUIZ_PASS_RATIO`, (3) lectures with flagged difficult parts, (4) the first unstarted lecture. Each item has a reason ("3 of 5 wrong in the last practice exam") and a link (lecture quiz, section or review).
- Empty state for a new visitor: "Start with lecture 1" — never an empty box.
- Footnote: "Based on your answers in this browser." (H1)
- Tests cover each rank and ties (deterministic order by lecture number).
- **Commit:** `feat: study-next suggestions from your own answers`

### Task B3: "Due today" review

**Files:** `src/components/home/*` (or `ProgressSummary.tsx`), `src/hooks/useDifficult.ts`, tests.
- Show "N cards due today" with one button that starts the existing review session filtered to due items. Hidden when N = 0 and nothing is flagged; when items exist but none is due, show the next due time ("next review tomorrow").
- **Commit:** `feat: due-today review counter on the course home`

### Task B4: Ask AI points back into the course

**Files:** `TEMPLATE` `src/components/assistant/*`, `src/lib/assistant/lectureContext.ts`; `PORTAL` `app/api/assistant/route.ts` system prompt (after sync in Package C).
- Context sent to the assistant labels each part `[L{n} §{m}]`. The prompt asks the answer to cite those labels and to say plainly when the course does not cover the question.
- The chat renders a valid `[L2 §3]` as a link to that section; invalid labels render as plain text (code decides, G1).
- Tests: parser turns valid labels into links, drops unknown ones, leaves other brackets alone.
- **Commit (template):** `feat: assistant answers link to the course sections they use`; **(portal, in C):** `feat: assistant prompt cites course sections`

**Check by hand:** with a fixture course, fail two quiz questions in lecture 2, take the exam, flag one part: home shows lecture 2 first with the right reason, "due today" after the review time passes (use a test clock in dev), exam history after a second attempt. EN and RO, 375 px.
