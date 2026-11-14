# Iteration 4 — Package C: Admin Page

> **Scope:** `playground-portal` on branch `iteration-4`. Do **not** touch `playground-template`.
> **Current state:** Package C is complete and committed locally on `iteration-4` (`cbdcbef` C1, `4793bd5` C2, `eb00caf` C3).
> **Styles:** CSS Modules (`*.module.css`) reusing `app/globals.css` tokens; no Tailwind on portal pages.

The owner controls the portal without changing code or redeploying. Settings live in one JSON file in the Blob store and are read on every request that needs them (no caching).

---

### Task C1: Admin login *(committed: `cbdcbef`)*

**Files:** create `lib/admin/session.ts`, `app/admin/page.tsx`, `app/admin/actions.ts`, `app/admin/admin.module.css`, `tests/admin-session.test.ts`; modify `.env.example`, `README.md`. Approved dependency: `iron-session@^9.1.0`.

- New environment variable `ADMIN_TOKEN` (the owner sets it; at least 24 characters). Add it, empty, to `.env.example` with a one-line comment, and describe it in `README.md`.
- `adminConfigured(env): boolean` — `ADMIN_TOKEN` has 24+ characters. When false, `/admin` calls `notFound()` and every admin action throws.
- `tokenMatches(given: string, env): boolean` — compare sha256 digests with `timingSafeEqual`.
- Session with `iron-session` `getIronSession` on `cookies()`: cookie name `pg_admin`; password = sha256 hex of `ADMIN_TOKEN` (64 characters); `ttl` 8 hours; cookie options `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "strict"`, `path: "/admin"`. Session data: `{ admin?: true }`.
- `requireAdmin(): Promise<void>` — throws `Error("Not authorised.")` when not configured or no session. **Every** server action in `app/admin/actions.ts` calls it first (except `login`).
- Actions: `login(formData)` — on a wrong token wait 500 ms, `logEvent("admin.login", { ok: false })`, return `{ error: "Wrong token." }`; on success save the session and `logEvent("admin.login", { ok: true })`. `logout()`.
- `/admin` without a session shows only a password field and a button. With a session it shows the dashboard of Tasks C2 and C3 and a "Log out" button.
- Exports `metadata` with `robots: { index: false, follow: false }`. English only.

Tests: `adminConfigured` (unset, 23 characters, 24 characters); `tokenMatches` (right, wrong, empty, different length); calling an action without a session rejects (mock `next/headers` `cookies`).

Commit: `feat: admin login`.

---

### Task C2: Settings and invite codes *(committed: `4793bd5`)*

**Files:** create `lib/settings.ts`, `tests/settings.test.ts`; modify `lib/guard.ts`, `lib/api/handlers.ts`, `lib/jobs/runtime.ts`, `app/api/jobs/**/route.ts`, `app/create/page.tsx`, `app/admin/page.tsx`, `app/admin/actions.ts`, tests.

```ts
// lib/settings.ts — stored at "config/settings.json"
export interface InviteCode { id: string; label: string; hash: string; active: boolean; createdAt: string }
export interface Settings {
  generationPaused: boolean;                 // default false
  dailyJobLimit: number | null;              // 1..500; null = use PORTAL_DAILY_JOB_LIMIT / 10
  model: string | null;                      // /^[a-z0-9][a-z0-9.-]{2,60}$/; null = use GEMINI_MODEL / default
  announcement: { en: string; ro: string };  // each at most 300 characters; "" = none
  codes: InviteCode[];                       // at most 50
}
export const DEFAULT_SETTINGS: Settings;
export const settingsSchema: z.ZodType<Settings>;
export async function readSettings(store: Store): Promise<Settings>;
// DEFAULT_SETTINGS when the file is missing; when it is invalid: logEvent("settings.invalid") and DEFAULT_SETTINGS
export async function writeSettings(store: Store, settings: Settings): Promise<void>;  // validates first
export function newInviteCode(label: string, now: Date): { code: string; entry: InviteCode };
// code = randomBytes(12).toString("base64url") (16 characters); entry.id = 8 random hex; entry.hash = sha256 hex of code
export function matchCode(given: string, env: NodeJS.ProcessEnv, settings: Settings): string | null;
// "env" when it equals PORTAL_ACCESS_CODE (12+ characters); the id of an ACTIVE invite code whose hash matches;
// otherwise null. Compare every candidate with timingSafeEqual; do not return early.
```

Wire it in:
- `generationEnabled(env, settings)`: as today **and** `!settings.generationPaused`.
- `createJobHandler`: read settings once; use `matchCode` (replace `accessCodeMatches`); store result in the job as `codeId`; daily limit = `settings.dailyJobLimit ?? dailyJobLimit(env)`.
- `advanceHandler`: refuse with `generation-off` while paused.
- `runtimeDeps(env, store, settings)`: model name = `settings.model ?? env.GEMINI_MODEL ?? "gemini-3.1-flash-lite"`.
- `/create`: pass `settings.announcement[locale]` to `Builder`.

Admin page, section "Settings" (one form, action `saveSettings`): checkbox "Pause generation", number "Daily job limit" (empty = default), text "Model id" (empty = default), two text areas "Announcement (English)" / "(Romanian)". Section "Invite codes": table (label, created, active); form "New code" (label) → action `createCode` returns the code, shown **once** in a highlighted box with "Copy it now. It is not stored and cannot be shown again."; buttons "Disable"/"Enable" (`setCodeActive`) and "Delete" (`deleteCode`). Environment code listed as fixed row "From the environment (PORTAL_ACCESS_CODE)" without buttons.

Tests: defaults for missing/corrupted file; `writeSettings` rejects limit 0, model id with space, 51 codes, 301-char announcement; `matchCode` returns `"env"`, an id, `null` for disabled/wrong code; job created with invite code has `codeId` and `publicJob` hides it; `generationPaused` returns 503 `generation-off` on create and advance; daily limit 1 in settings blocks second job even when env says 10; `settings.json` never stores clear-text codes.

Commit: `feat: admin settings and invite codes`.

---

### Task C3: Jobs, courses and takedown *(committed: `eb00caf`)*

**Files:** create `lib/admin/overview.ts`, `tests/admin-overview.test.ts`; modify `app/admin/page.tsx`, `app/admin/actions.ts` (plus any client subcomponent needed for `window.confirm`, e.g. `app/admin/CourseTable.tsx`).

```ts
// lib/admin/overview.ts
export const USD_PER_MILLION = { input: 0.25, output: 1.5 };   // estimate, gemini-3.1-flash-lite list prices
export function estimateCost(usage: { inputTokens: number; outputTokens: number }): number;   // USD
export async function listJobs(store: Store, limit?: number): Promise<JobState[]>;
// reads every "jobs/<id>/state.json", newest createdAt first, default limit 50; skips unreadable files
export async function overview(store: Store, now: Date): Promise<{
  jobsToday: number; jobs: JobState[]; courses: { key: string; meta: SiteMeta }[];
  totals: { courses: number; inputTokens: number; outputTokens: number; costUsd: number };
}>;
```

Admin page sections:
- "Today": jobs today / limit; totals (courses, tokens, estimated cost with the note "estimate").
- "Courses": title, key, lectures, published, tokens, cost, link "Open" (`/courses/<key>/`, new tab), button "Delete" → action `deleteCourse(key)`: `requireAdmin`, `deleteSite`, `updateTag(courseTag(key))` (read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md`), `logEvent("course.deleted", { key, by: "admin" })`. The button asks "Delete this course? This cannot be undone." with `window.confirm` before submitting.
- "Recent jobs": created, status, step, lectures done/total, invite code label, tokens, cost, error code, link to the course when done.

Tests: `estimateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 })` is `1.75`; `listJobs` order and limit and that a corrupted state file is skipped; `overview` totals; deleting a course removes it from `listCourses` and `loadSite` returns `null` afterwards (mock `next/cache`).

Commit: `feat: admin overview and course takedown`.

**Package C PR note:** Remind the owner in the PR body: *"Set `ADMIN_TOKEN` (24+ characters) in Vercel for Production, then redeploy, before `/admin` works."*

---

## Calls made / problems
