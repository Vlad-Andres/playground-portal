# Iteration 5 — Shared Guidelines & Setup

**Status:** Approved by the owner on 2026-11-12. Do not redesign it.
**Start gate — do NOT start until both are true:**
1. Iteration 4 is merged (`git fetch origin && git log origin/main --oneline -30` in `playground-portal` shows `feat: creators can edit or delete their site` and `feat: admin overview and course takedown`).
2. The owner says in chat `"start iteration 5"`.

**Branch setup (when starting Iteration 5, push nothing yet):**
- `playground-portal` (`PORTAL`): `git switch -c iteration-5 origin/main`
- `playground-template` (`TEMPLATE`): `git switch -c iteration-5 origin/iteration-3`

**Package order:** [`package-P.md`](package-P.md) → [`package-A.md`](package-A.md) → [`package-B.md`](package-B.md) → [`package-C.md`](package-C.md) → [`package-D.md`](package-D.md) → [`package-E.md`](package-E.md)

**Goal:** A person uploads material and at most answers one or two questions. The portal infers language, level, and teaching structure, shows one recommended design (and up to two genuinely distinct alternatives), writes the course, and previews it. Signed-in owners can refine a course up to three times, append material, keep files privately (opt-in), and restore recent versions.

**Approved dependency (`PORTAL` only):** `arctic@^3.7.0` (Task C1). Nothing added to `TEMPLATE` (`core/` imports only `zod` and its own files — enforced by test). `iron-session` is already installed in `PORTAL`.

**Iteration-5 extra hard rules:**
- Never change an existing lecture of a published course unless the owner of that course asked for it in that request (a refinement) or chose `"reorganize"`.
- Uploaded files are kept after a job **only** when a signed-in owner switched on `"Keep my files"`.
- For packages that change `TEMPLATE` (A, E1), also push `TEMPLATE`'s `iteration-5` branch and list its commits in the `PORTAL` PR body (no separate `TEMPLATE` PR needed; `PORTAL` deploys its synced `vendor/` copy).

---

## Decisions already made (do not reopen)

| Topic | Decision |
| --- | --- |
| What the user gives | Files, an optional note, an access code. Language, level, depth, colour and quiz/widget/exam switches move into a closed `"Advanced"` section and default to automatic. |
| Course language | Decided by **code**, not the model: explicit user choice → clear material language → portal language. Mixed material → one question. |
| Questions | At most two: `"language"` (mixed material only) and `"focus"` (empty user note + model proposed 2–4 valid options). Always skippable. |
| Design review | One recommended structure + up to two alternatives kept only when code verifies they differ. Alternatives are outlines, expanded only if chosen. Replaces outline review and keeps rename/remove controls. |
| Teaching forms | Chosen by content fit (no `"5 kinds"` rule). Model-written `custom` exercise allowed only where planned, max `0 / 1 / 2` per lecture for `cram / standard / deep`. |
| Durable execution | Keep existing step machine. No Vercel Workflow, queue, or database. |
| Accounts | Google sign-in via `arctic` + `iron-session`. No passwords, e-mail sending, or user table; cookie stores hashed `uid` + `name` only. |
| Guests | Works without an account. When accounts are configured, guests get 1 course per browser (`pg_guest` cookie soft limit; access code + daily limit remain hard guards). |
| Signed-in owners | 3 refinement rounds per course. Adding material is separate (not counted). 5 jobs/user/day. |
| Kept files | Off by default, opt-in per course for signed-in owners. Limit 4 MB text and 12 files/course. Deleted when switched off, or with course/account. |
| Versions | Every change snapshots the previous course; 3 newest earlier versions kept. Restore is itself a change. |
| Reorganize | Offered only when appending material and the model names 2+ affected existing lectures. Requires kept files. Never automatic. |
| Preview | Finished course shown in an `<iframe>` of the real course page; `"Open"` animates the frame full-screen then navigates. No auto-redirect. |

---

## Technical guidelines (apply to every task)

### G1. Code decides, the model proposes
Never trust the model to decide anything a rule can decide. Code decides: course language, whether to ask a question, which alternatives survive, where `custom` blocks are allowed, whether reorganisation is offered, and every limit/count. The model only fills validated JSON.

### G2. Shape of every model call (`TEMPLATE/core/generate/`)
Follow `planCourse` in `core/generate/plan.ts`:
1. Prompt function in `prompts.ts` returns `{ system, user }`: `TASK` constant first (for `fakeModel`), one-sentence role, `SAFETY`, exact JSON shape, short rules; `user` carries data.
2. One `ModelClient.complete` call parsed with `extractJson`.
3. `prepare` step where **code overwrites** every field the model must not control.
4. Validate with Zod.
5. On failure: **at most one** retry call listing the problems. Never a third.
6. Second failure: use the task's exact fallback (default, dropped item, or exact `Error`). Never invent content. Pass only validated outputs + relevant pages (never whole prior replies).

**Call budget per job** (`DEFAULT_BUDGET` token cap unchanged):
- Create: `≤ 2` (context) + `2` (design) + `2` (expand, only if alternative chosen) + `4` per lecture
- Refine: `≤ 2` (plan) + `2` per rewritten lecture (max 3 lectures)
- Add material: `≤ 2` (plan) + `4` per new lecture

### G3. Storage (`PORTAL/lib/jobs/store.ts`)
Single `Store` interface (`read`, `write`, `create`, `delete`, `list`); tests use `memoryStore()`.
- **At-most-once claims** (refinement round, course busy lock): `store.create(key, body)` (`false` if exists). Never read-increment-write counters.
- **Counts**: `store.list(prefix).length`.
- **Course writes**: fixed order inside `updateCourse` (Task D1); routes/actions never write `site.json` or `meta.json` directly after D1.
- All per-course data lives under `courses/<key>/` so `deleteSite` removes everything:
  - `courses/<key>/site.json`, `meta.json` (existing)
  - `courses/<key>/brief.json` (D2), `versions/<n>.json` (D1), `sources/<n>.json` (D2), `rounds/<1..3>.json` (D3), `busy.json` (D3)
  - `users/<uid>/courses/<key>.json` (C2), `users/<uid>/days/<YYYY-MM-DD>/<jobId>` (C3), `jobs/<id>/…` (B1)

### G4. Access & privacy
- Job UUIDs and `/manage/<token>` links remain bearer secrets.
- Every `/my` server action and `/api/courses/` route handler must verify session **and** `meta.ownerId === session.uid` itself, returning 404 / `not-found` on failure (never reveal course existence).
- Never log or return tokens, session data, `ownerId`, user notes, or material text.

### G5. Next.js 16
Read `node_modules/next/dist/docs/` before calling Next APIs (`after.md`, `updateTag.md`, `revalidateTag.md`):
- Uploaded material goes to **route handlers** (never server actions — small body limit).
- Invalidate `courseTag(key)` with `updateTag` in server actions and `revalidateTag` in route handlers.
- Keep `lib/` free of `next/*` imports so unit tests run without Next.

### G6. i18n, Romanian glossary, styles, motion
- All visible portal strings live in `messages/en.json` and `messages/ro.json` (`next-intl`). Model-generated text is rendered as-is.
- Romanian rules: informal singular `"tu"` (`"Adaugă fișierele"`, not `"Adăugați"`); comma-below diacritics `ă, â, î, ș, ț` (never cedilla `ş, ţ`); brand `"playground."` untranslated.
- Glossary: course site → `"site de studiu"`, lecture → `"lecție"`, outline → `"cuprins"`, quiz → `"test"`, interactive widget → `"exercițiu interactiv"`, access code → `"cod de acces"`, materials → `"materiale"`, exam mode → `"mod examen"`, flashcards → `"fișe de memorare"`, design → `"structură"`, refine → `"îmbunătățește"`, version → `"versiune"`, restore → `"restaurează"`, sign in → `"conectează-te"`, my courses → `"cursurile mele"`.
- Styles: CSS Modules + `app/globals.css` tokens (no Tailwind on portal pages), responsive at 375 px with zero horizontal scroll, full keyboard support, animations wrapped in `@media (prefers-reduced-motion: no-preference)`.

### G7. Tests
- `TEMPLATE`: `tests/generate-*.test.ts`, using `fakeModel` with call counters to test bad-first / good-second replies and assert exact call counts.
- `PORTAL`: `memoryStore()` (wrap `write` to simulate mid-update failures). One test per rule and per error code.

### G8. Structured logs (`PORTAL/lib/log.ts` `logEvent` — allowed fields only)
- `job.created`: `jobId`, `kind`, `signedIn` (boolean)
- `course.updated`: `key`, `reason`, `version`
- `course.restored`: `key`, `from`, `version`
- `course.claimed`: `key`
- `sources.changed`: `key`, `kept` (boolean), `files`, `bytes`
- `auth.signin`: `ok` (boolean)
- `account.deleted`: `courses` (count)

---

## Local dev & markers

```bash
BLOB_READ_WRITE_TOKEN= PORTAL_FAKE_MODEL=true PORTAL_ENABLE_GENERATION=true \
PORTAL_ACCESS_CODE=local-check-code-123 ADMIN_TOKEN=local-admin-token-0123456789 \
AUTH_GOOGLE_ID=local AUTH_GOOGLE_SECRET=local SESSION_SECRET=local-session-secret-0123456789abcdef \
npx next dev -p 3100
```

Fake-model markers in uploaded text / notes: `[ask-focus]`, `[alternatives]`, `[custom]`, `[restructure]`, and `[empty]` (in refine note). Local sign-in helper (dev + fake model only): `/api/auth/dev?name=anna`.

**Not in Iteration 5:** new catalogue widgets (`true-false`, `code-trace`, `table-fill`), `code-runner`, DB/Redis/queues/Workflow, email/password auth, payments, teams/sharing, translating course UI or `/admin`, guest kept files, >3 versions or >3 refine rounds.

**Plan author notes:** Iter-4 file/symbol names (`messages/*.json`, `Builder.tsx`, `app/manage/[token]/actions.ts`, `Editor`, `saveCourse`, `removeCourse`) should follow merged `main` if any name differed slightly (log under `Calls made`). Read `node_modules/arctic/` and Next docs rather than guessing signatures.
