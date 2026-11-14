# Iteration 5 — Package E: Evaluation, Security Check & Hand-over

> Read [`00-guidelines.md`](00-guidelines.md) first.
> **Scope:** `playground-template` (E1), `playground-portal` (E1 sync, E2, E3), and `playground-portal/docs/` (E1 rubric, E3 `NEXT.md`).

---

### Task E1: Does the course fit the material?

**Files:** `TEMPLATE/tests/generate-eval.test.ts`; `DOCS` `notes/2026-11-content-fit-rubric.md`.

- `generate-eval.test.ts`: runs the full pipeline (`inferContext` → `designCourse` → `writeLecture` → `finishCourse`) with the canned model on all 5 fixtures (`cs-en`, `math-en`, `vocab-ro`, `history-en`, `mixed-en-ro`) and asserts: zero validation errors; expected language decision (`en`, `en`, `ro`, `en`, question on mixed); every block carries `source`; total model calls stay within G2 budget.
- `notes/2026-11-content-fit-rubric.md` (1 page): human 1–5 scoring rubric for real generated courses covering: source coverage; correct language; teaching forms fit content (table for comparisons, steps for procedures, formula for maths, recall for vocabulary); zero invented facts; custom exercises work and were needed; mobile readability. Must explicitly state: `"Do not score the number of different block kinds or widgets."`
- **No real-model run in E1.** Push `TEMPLATE`, run `npm run sync:core` in `PORTAL`, and commit `chore: sync vendored core from template <7-char sha>`.

Commit (`TEMPLATE`): `test: content-fit evaluation set`.

---

### Task E2: Whole-flow and security check

By hand with the fake model (`00-guidelines.md`), desktop & 375 px, EN & RO, browser console open on every page:

1. **Guest flow:** files only → design → course → preview → open. With local account vars set, a 2nd guest course in the same browser is refused (`guest-limit`).
2. **Markers & background continuation:** test every marker of Task B3 (`[alternatives]`, `[ask-focus]`, mixed-language) and closing the tab mid-job (Task P3).
3. **Signed-in flows (`/api/auth/dev?name=anna` — note in report that real Google OAuth requires production credentials):** claim a guest course; refine once; append a file; test `[restructure]` both ways; toggle kept files on and off; restore a version; delete a course; delete the account. Sign in as `/api/auth/dev?name=ben` and verify anna's `/my/<key>` returns 404.
4. **Course runtime checks:** dark mode on a course; lecture progress persists across reload; `[custom]` exercise runs in its sandboxed frame and cannot access `top`, cookies, storage, or network.
5. **Confirm all 10 risk items** (by test or by hand, logging one line each under **Calls made / problems**):
   1. Weak model reply ends in valid output, dropped item, or clear failure code in `<= 2` calls.
   2. English slides on RO portal produce an English course unless overridden; mixed material asks.
   3. Clear-language upload + user note asks zero questions.
   4. Another user's session against any `/my` action or `/api/courses` route gets 404 and mutates nothing.
   5. Concurrent refine requests never share a round; failed refinements release their round.
   6. Mid-update storage write failure leaves the previous course valid and readable.
   7. Kept files never exist without opt-in and never survive switching off, course deletion, or account deletion.
   8. Pre-iteration-5 jobs/courses (`step: "plan"`, no `kind`, `meta.json` without `ownerId`/`version`) still work.
   9. Course preview frames only portal courses (`frame-ancestors 'self'`), and portal pages remain `'none'`.
   10. With Google sign-in env vars unset, portal behaves identically to Iteration 4 (no sign-in UI, no guest cookie limit, `/my` returns 404).
6. **Production build CSP check** (`npm run build && npx next start -p 3100`): zero CSP console errors on `/`, `/create`, job preview page, `/my`, and `/courses/<key>/`.

Fix any defect found with a failing test first (`fix: …`).

---

### Task E3: Documents and final pull request

1. Update `playground-portal/README.md`: routes (`/my`, `/my/<key>`, `/api/auth/google`, `/api/courses/<key>/jobs`), new env vars, guests vs accounts, refinement rounds, adding material, kept files, versions, limits, and G3 storage keys table.
2. Confirm `playground-portal/.env.example` documents `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SESSION_SECRET` (empty, 1-line comment each).
3. Update `playground-portal/docs/NEXT.md` with Iteration 5 completion status.
4. Open the final Iteration 5 PR (`iteration-5 → main`), repeating the Google OAuth + Vercel env var instructions from Package C in the PR body.
5. Ask the owner once in chat: *"May I run the real model on the five fixtures (at most 5 runs) and score them with the rubric?"* (Run only if approved.)

---

## Calls made / problems
