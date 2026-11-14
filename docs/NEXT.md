# NEXT — Live Hand-off

- **Iteration 4: complete and merged.** `playground-portal` `main` is at `3e56fac`: packages A (#4), B (#5), C+D (#6), the README (`b11f465`) and admin translation editing (#7, `/admin/translations`).
- **Iteration 4 verification:** lint, tests and build green; the E1 flow, header, 375 px and console checks are recorded in [`plans/iter-4/package-E.md`](plans/iter-4/package-E.md).
- **Fixed (course pages):** `SiteShell` now skips service-worker registration when the site is served under a path (e.g. `/courses/<key>/`), so portal-hosted courses no longer log a 404 for `/sw.js`. Synced to the portal in PR #15.
- **Not tested yet:** a real model run (the model account has no credit); test once it is topped up.

## Iteration 5 (merged, owner testing)

- **Merged to production:** P (PR #8), the course service-worker fix (PR #9), and A–E (PR #10, `a02e044`). Template: branch `iteration-5` at `c8fe480`, vendored into the portal.
- **What was checked (2026-11-12, fake model only):** portal 162 tests and template 450 tests pass; CI green. A scripted whole-flow run passed 37/37: guest flow and guest limit, every marker, language decisions, kept files on/off at creation, refine (summary, version, lock, refine-empty, concurrency, round limit), append, the append-or-reorganise choice both ways, another user and guests locked out, an old `plan`-step job. By hand in the browser: claim, restore, kept files off, delete a course, delete an account, design screen in EN/RO at 375 px, building from an alternative. Production build: course pages may be framed only by the portal (`frame-ancestors 'self'`), portal pages `'none'`; dev sign-in is 404 in production.
- **Found and fixed during the check:** "keep my files" at creation was rejected by the request schema; the local file store could be read half-written by two job drivers; the level was not translated on the design screen.
- **Not checked (stopped at the owner's request, who tests it):** console/CSP errors in a browser on the production build, a `[custom]` exercise in the sandbox after these changes, dark mode on a course, real Google sign-in, and any real-model run (the model has no credit). The content-fit rubric for real runs is in [`notes/2026-11-content-fit-rubric.md`](notes/2026-11-content-fit-rubric.md).
- **Owner actions:** create the Google OAuth client (redirect `https://playground-portal-bay.vercel.app/api/auth/google/callback`) and set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SESSION_SECRET` (32+ chars) in Vercel Production, then redeploy. Until then accounts stay off and the portal behaves as in iteration 4.
- **Next:** the owner's testing; after that, a real-model run on the five fixtures (at most 5 runs, with the owner's go-ahead) scored with the rubric.
- **Note:** the owner's opencode agent has temporary worktrees on both `iteration-5` branches that are now behind; delete them before reusing that agent.

## Iteration 6 — closed beta (A–C merged, D in review)

- **Plan:** [`plans/iter-6/00-guidelines.md`](plans/iter-6/00-guidelines.md). Invite-only beta for 20–30 students; the owner said "start" on 2026-11-14.
- **Merged (PR #17, `90dcd20`):** packages A (honest course page, host brand, make-your-own footer), B (exam history, study next, due today, Ask AI section links) and C (template sync, Ask AI citation prompt, practice exam on by default, monthly limit per invite code, "Study with AI" in portal copy). Template branch `iteration-6` at `e42ba69` is vendored.
- **In review (PR on branch `iteration-6-d`):** package D — share card that copies only the course link; required rights checkbox at creation (`rights-not-confirmed`); `/privacy` and `/terms` (EN/RO, marked beta); "Report a problem" on every course → `/report?course=<key>` → admin queue with Dismiss and Take down. Also: the top bar wraps on phones.
- **Next package:** [`plans/iter-6/package-F.md`](plans/iter-6/package-F.md) (beta measurement) after D is merged. Package E waits for the approved Figma design (V1) and the demo courses (G).
- **Can start any time:** Figma refinement ([`package-V.md`](plans/iter-6/package-V.md) V1) and the demo source notes ([`package-G.md`](plans/iter-6/package-G.md) G1).
- **Owner actions:** review and merge the D PR; set `CONTACT_EMAIL` in Vercel (shown on `/privacy`; until then it says "the person who gave you your invite code"); decide at the legal review whether the privacy page must name the AI provider (today it says "an AI provider", following the rule that learners never see provider names); the owner-gate items in [`package-0-owner.md`](plans/iter-6/package-0-owner.md). Admin translation overrides stored before C may still show the old title "playground."; check `/admin/translations`.
- **Not checked:** Ask AI citations with the real model (needs a real model call).
- **Found for Package V:** on a 375 px screen the practice exam's "Unanswered" label overflows its box; the exam page is titled "Exam training" while links say "Practice exam"; the "Report a problem" link sits below the course footer.
- **Superseded:** the public-launch documents in `product/` and `plans/launch/` are background only until the beta review (Package R).

## On-demand reference

- [`README.md`](README.md) — map of all docs

- [`plans/iter-5/00-guidelines.md`](plans/iter-5/00-guidelines.md) — decisions, technical guidelines G1–G8, glossary, local run command
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — repo sync flow, storage model, CSP/styling boundaries, local dev command
- [`notes/2026-11-code-runtimes.md`](notes/2026-11-code-runtimes.md) — deferred `code-runner` browser sandbox findings
