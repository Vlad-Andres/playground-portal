# Iteration 6 — Closed Beta: Shared Guidelines

**Status:** Approved by the owner on 2026-11-14. Do not redesign it.
**Start gate — do NOT start a code package until both are true:**
1. Iteration 5 owner testing is finished (see `NEXT.md`).
2. The owner says in chat `"start iteration 6"` (or names a single package to start).

**Goal:** 20–30 invited students turn their own material into a course, study with it, share it, and come back. We learn whether they recommend it before we open creation to everyone or charge money.

**Package order:**

| Order | Package | Repo | Can run in parallel with |
| --- | --- | --- | --- |
| 0 | [`package-0-owner.md`](package-0-owner.md) — owner gate (no code) | — | everything below starts after it |
| 1 | [`package-A.md`](package-A.md) — honest, branded course page | `TEMPLATE` | V |
| 2 | [`package-B.md`](package-B.md) — study-loop features that sell it | `TEMPLATE` | V |
| 3 | [`package-C.md`](package-C.md) — portal sync and beta limits | `PORTAL` | V |
| 4 | [`package-D.md`](package-D.md) — trust and sharing | `PORTAL` | V, G |
| — | [`package-V.md`](package-V.md) — visual redesign: refine in Figma, then build | Figma, then `PORTAL` + `TEMPLATE` | A–D (design part only) |
| 5 | [`package-G.md`](package-G.md) — the demo course (EN + RO) | `TEMPLATE/examples`, admin | needs A–C merged; notes can be written any time |
| 6 | [`package-E.md`](package-E.md) — landing and create flow in the new design | `PORTAL` | needs V design approved and G courses |
| 7 | [`package-F.md`](package-F.md) — beta measurement | `PORTAL` (+ small `TEMPLATE` hook) | after D |
| 8 | [`package-R.md`](package-R.md) — run the beta and decide | — | after E and F |

**Branches:** `TEMPLATE`: `iteration-6` from `origin/iteration-5`. `PORTAL`: `iteration-6` from `origin/main`. One package = one PR, as in iteration 5. Package V's build tasks get their own branch `iteration-6-visual` so design work never blocks feature PRs.

---

## Decisions already made (do not reopen)

| Topic | Decision |
| --- | --- |
| Milestone | **Closed beta**, not an open public launch. Creation stays behind invite codes (one code per student group). |
| Public name | **"Study with AI"** (wordmark `study / with ai`, as in the Figma concept). "playground." is retired from user-facing copy; repo names stay. |
| Positioning | Exam preparation from your own material: read it, recall it, try it, revisit it. Never promise official grading, a personal tutor that knows you, or automatic mastery diagnosis. |
| Ask AI | Stays as it is on `main` (`/api/assistant`, server key with its own provider-side limit set by the owner). Package B only improves *how* answers point back into the course. |
| Selling features | Built in the browser from data the course already has (quiz scores, exam breakdown, review schedule). **No new model calls** except the Ask AI citation change. |
| Exam | On by default. Generated only when a course has **≥ 5 valid quiz questions across ≥ 2 lectures** (`EXAM_MIN_QUESTIONS = 5`, `EXAM_MIN_LECTURES = 2`). It is labelled practice built from the lecture questions. |
| Footer link | Every portal-hosted course shows a plain link "Made with Study with AI — make your own" to the landing page. No tracking parameters except a fixed `?from=course`. |
| Demo | Two **real** generations (EN, RO) of our own notes on *Electricity basics: circuits and Ohm's law*, school level. Not the hand-made `examples/showcase`. |
| Visual design | The Figma file *Learning Playground — Website Concept* is the source of truth for landing, create and course screens **after** the owner approves the refined version (Package V). Until then, keep current styling. |
| Measurement | Server-side daily counts only (no cookies, no personal identifiers, no consent banner). Consent-based per-user analytics is deferred to the public launch. |
| Deferred to after the beta | Open creation without codes, job-link authorization, atomic spend reservations, consent analytics, referral codes, pricing/payments, collaborative editing, newly generated practice. These live in [`../launch/pr-plan.md`](../launch/pr-plan.md) as reference. |

---

## Technical guidelines

Iteration 5 guidelines **G1–G8** in [`../iter-5/00-guidelines.md`](../iter-5/00-guidelines.md) still apply (code decides, model proposes; one retry; no `vendor/` edits; fake model in tests). Additionally:

### H1. Browser-only study data
Everything Package B shows is computed from the course JSON and the browser's existing stores (`useProgress`, `useDifficult`, exam results). Add a store only through `createPersistentStore` with a versioned key (`exam:v1`). Never send it to the server. Every new panel says in one short line that it is based on answers in this browser.

### H2. Honest labels
Words allowed: "practice exam", "study next", "based on your answers", "due today". Words not allowed in UI copy: "mastery", "AI tutor", "grade", "diagnosis", "guaranteed". Tests assert the EN and RO message files do not contain the forbidden words.

### H3. Host configuration, not forks
Anything that differs between a standalone course and a portal course (brand, footer link, demo label) is a typed field in `core/site.ts` host config with a standalone default. No `if (portal)` checks scattered in components.

### H4. Design tokens before components
Package V turns the Figma styles into CSS custom properties (`--color-*`, `--font-*`, `--space-*`, `--radius-*`) in one file per repo before any component is restyled. Components use tokens only; no new hard-coded colours.

### H5. Both languages, both widths
Every new string is added to EN **and** RO in the same commit. Every new screen is checked at 375 px and 1280 px, in light and dark mode.

---

## Glossary

| Term | Meaning |
| --- | --- |
| Beta group | A set of students sharing one invite code, e.g. "TU/e DIS class". |
| Study next | The ranked list of lectures/sections to revisit, shown on the course home (B1). |
| Due today | Difficult-parts items whose scheduled review time has passed (B2). |
| Demo course | One of the two real generations selected in `/admin` as `demoCourseKey.en` / `.ro`. |
