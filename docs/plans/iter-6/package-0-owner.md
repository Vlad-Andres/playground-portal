# Iteration 6 — Package 0: Owner Gate (no code)

> Read [`00-guidelines.md`](00-guidelines.md) first. These are owner actions; an agent may prepare material but must not change provider, Vercel or Google settings.

| # | Action | Why it blocks | Done when |
| --- | --- | --- | --- |
| 0.1 | Finish iteration-5 testing (see `NEXT.md`) | Iteration 6 builds on accounts, refine and append | Owner says testing is done or lists bugs |
| 0.2 | Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SESSION_SECRET` in Vercel Production and redeploy | Beta students need "my courses" to come back to their course | Sign-in works on production |
| 0.3 | Top up model credit and say in chat which real runs are allowed | Course quality has never been checked with the real model | Credit available; run budget named (e.g. "up to 7 runs") |
| 0.4 | Real-model run on the five iteration-5 fixtures, scored with [`../../notes/2026-11-content-fit-rubric.md`](../../notes/2026-11-content-fit-rubric.md) | Students must not test unverified output; problems found here become template fixes before Package A | Scores recorded in `notes/2026-11-real-run-scores.md`; any criterion scoring ≤ 2 gets a fix task |
| 0.5 | Decide the unmerged `PORTAL` branch `landing-polish` (6 commits, 12 Nov, warm editorial landing) | Package V/E would rewrite the same page | Either: mine it for Package V and delete, or merge first. Delete the stale opencode worktrees afterwards |
| 0.6 | Confirm the name "Study with AI" and whether `study-with-ai.eu` points to the portal | Brand appears in course header, footer and landing | Owner confirms |
| 0.7 | Name the beta groups (2–4) and who will be invited | Package C creates one invite code per group | List in chat (no real codes in files) |

The agent may run 0.4 only after 0.3, with `PORTAL_FAKE_MODEL` unset **only for that run**, and must report the number of runs used.
