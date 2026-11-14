# Iteration 5 — Package C: Accounts & Ownership

> Read [`00-guidelines.md`](00-guidelines.md) first (especially G3, G4, G5, G8).
> **Scope:** `playground-portal` (`iteration-5`). Approved dependency: `arctic@^3.7.0`.

---

### Task C1: Sign in with Google

**Files:** create `lib/auth/config.ts`, `lib/auth/session.ts`, `lib/auth/google.ts`, `app/api/auth/google/route.ts`, `app/api/auth/google/callback/route.ts`, `app/actions/auth.ts`, `app/api/auth/dev/route.ts`, `components/AccountMenu.tsx`, `tests/auth.test.ts`; modify top bars (`/`, `/create`, `/jobs/<id>`, `/manage/<token>`), `.env.example`, `README.md`, messages. Install `arctic@^3.7.0`.

```ts
// lib/auth/config.ts
export function accountsConfigured(env: NodeJS.ProcessEnv): boolean;
// AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET non-empty AND SESSION_SECRET has 32+ chars
export function userId(provider: "google", subject: string): string; // first 32 hex chars of sha256("google:" + subject)
export const USER_ID: RegExp;                                        // /^[0-9a-f]{32}$/
export function devSignInAllowed(env: NodeJS.ProcessEnv): boolean;
// NODE_ENV !== "production" && PORTAL_FAKE_MODEL === "true" && accountsConfigured(env)

// lib/auth/session.ts
export interface User { uid: string; name: string }
export async function currentUser(): Promise<User | null>;  // null when not configured or no session
export async function requireUser(): Promise<User>;         // throws Error("Not signed in.")
export async function saveUser(user: User): Promise<void>;
export async function clearUser(): Promise<void>;
```

- Session: `iron-session` on `cookies()`, cookie `pg_user`, password `SESSION_SECRET`, `ttl` 30 days, `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`. Stores `{ uid, name }` only (no email, raw Google sub, or avatar).
- `lib/auth/google.ts`: read `node_modules/arctic/` README + `.d.ts` for exact API. Redirect URI `new URL("/api/auth/google/callback", requestUrl).toString()`; authorization-code + PKCE with scopes `openid`, `profile`.
- `GET /api/auth/google`: 404 when not configured. Store `pg_oauth_state`, `pg_oauth_verifier`, and `pg_oauth_next` (`?next=` accepted only if starting with single `/` and not `//`, default `/my`) in 10-min `httpOnly` `sameSite: "lax"` (`secure` in prod) cookies; redirect to Google.
- `GET /api/auth/google/callback`: constant-time `state` check; exchange code; read `sub` and `name` from ID token; `saveUser({ uid: userId("google", sub), name: (name ?? "").slice(0, 60) })`; clear the 3 OAuth cookies; `logEvent("auth.signin", { ok: true })`; redirect to `next`. On any failure: clear cookies, `logEvent("auth.signin", { ok: false })`, redirect to `/?signin=failed` (landing shows `errors.signin-failed`: `"Sign-in did not work. Please try again."` / `"Conectarea nu a reușit. Încearcă din nou."`).
- `GET /api/auth/dev?name=<text>`: 404 unless `devSignInAllowed(process.env)`; saves `{ uid: userId("google", "dev-" + name), name }` (`name`: 1–20 alphanumeric chars, default `tester`) and redirects to `/my`.
- `app/actions/auth.ts`: `signOut()` → `clearUser()`, redirect to `/`.
- `AccountMenu` (rendered only when `accountsConfigured`): signed out → link `"Sign in"` / `"Conectează-te"` to `/api/auth/google?next=<current path>`; signed in → `name` (or `"Account"` / `"Cont"`), link `"My courses"` / `"Cursurile mele"` (`/my`), button `"Sign out"` / `"Deconectează-te"`.

Tests: `accountsConfigured` (missing vars, 31-char secret, valid); `userId` (32 hex, deterministic, distinct); `next` sanitiser (`/my` ok, `//evil.example` and `https://evil.example` rejected); `currentUser` null when unconfigured; `requireUser` throws without session; `devSignInAllowed` false in `production` or without fake model.

Commit: `feat: sign in with Google`.

---

### Task C2: Owned courses, claiming, "My courses"

**Files:** create `lib/sites/library.ts`, `app/my/page.tsx`, `app/my/actions.ts`, `app/my/my.module.css`, `tests/library.test.ts`; modify `lib/sites/store.ts`, `lib/sites/publish.ts`, `lib/jobs/state.ts`, `lib/jobs/steps.ts`, `lib/api/handlers.ts`, `app/api/jobs/route.ts`, `app/manage/[token]/page.tsx`, `app/manage/[token]/actions.ts`, messages, tests.

```ts
// lib/sites/store.ts — SiteMeta gains (readMeta defaults old files: "", 1, false)
ownerId: string;        // "" = unowned
version: number;        // 1; used in D1
keepSources: boolean;   // false; used in D2

// lib/jobs/state.ts — JobState gains (never sent to browser)
ownerId?: string;

// lib/sites/library.ts
export async function resolveAccess(store: Store, access: { token: string } | { uid: string; key: string }):
  Promise<{ key: string; meta: SiteMeta } | null>;
// token -> findCourseByOwnerToken; uid+key -> course only when COURSE_KEY matches and meta.ownerId === uid
export async function claimCourse(store: Store, token: string, uid: string, now: Date): Promise<"ok" | "not-found" | "already-claimed">;
export async function listUserCourses(store: Store, uid: string): Promise<{ key: string; meta: SiteMeta }[]>; // newest updatedAt first
export async function removeCourse(store: Store, key: string): Promise<boolean>;
// deleteSite + delete users/<ownerId>/courses/<key>.json when ownerId is non-empty
```

- Every library function taking `uid` throws `Error("Invalid user id.")` if `!USER_ID.test(uid)` before building keys.
- `createJobHandler` takes `user: User | null` (route passes `await currentUser()`); stores `user?.uid` in `state.ownerId`; `logEvent("job.created", { jobId, kind: "create", signedIn })`.
- `publishCourse` takes `ownerId` (default `""`), writes it into `meta.json`, and when non-empty writes `users/<ownerId>/courses/<key>.json` = `{ "key": "<key>" }`. Owner token + `manageUrl` still generated and continue working after claim.
- `claimCourse`: unknown token → `"not-found"`; `meta.ownerId` belongs to another user → `"already-claimed"`; same user → `"ok"`; unowned → set `meta.ownerId`, write user marker, `logEvent("course.claimed", { key })`, return `"ok"`.
- `/manage/<token>`: when `accountsConfigured` and course is unowned, show box `"Keep this course in your account"` / `"Păstrează cursul în contul tău"` (`"Sign in to refine it, add material and restore earlier versions."` / `"Conectează-te ca să-l îmbunătățești, să adaugi materiale și să restaurezi versiuni anterioare."`) + sign-in link (with `next` = this page) when signed out, or `claim(token)` action redirecting to `/my/<key>` when signed in. Update manage `removeCourse` action to call `library.ts` `removeCourse`.
- `/my` (server, `robots: noindex`): unconfigured → `notFound()`; signed out → redirect `/api/auth/google?next=/my`. Lists user's courses (title as plain text until D2, lecture count, last updated via `next-intl`, `"Open"` link `/courses/<key>/`). Empty state: `"No courses yet."` / `"Încă nu ai cursuri."` + button to `/create`.

Tests: signed-in job sets `ownerId` + user marker; guest sets `ownerId: ""` and no marker; `resolveAccess` uid+key rejects other user / bad key / missing course; all 4 `claimCourse` outcomes + token still works; `listUserCourses` ordering & skips deleted courses; `removeCourse` deletes user marker; `readMeta` defaults on Iter-4 meta; `publicJob` hides `ownerId`.

Commit: `feat: courses belong to accounts and can be claimed`.

---

### Task C3: Guest and per-user limits

**Files:** modify `lib/guard.ts`, `lib/api/handlers.ts`, messages, tests.

```ts
// lib/guard.ts
export const USER_DAILY_JOBS = 5;
export const GUEST_COOKIE = "pg_guest";
export function userDayPrefix(uid: string, day: string): string;     // `users/${uid}/days/${day}/`
export function hasGuestCookie(cookieHeader: string | null): boolean;
```

In `createJobHandler`, after access-code check and before global daily limit:
- If `accountsConfigured`, no user, and `hasGuestCookie(request.headers.get("cookie"))` → 403 `guest-limit` (`"You already made a course in this browser. Sign in to make more."` / `"Ai creat deja un curs în acest browser. Conectează-te ca să creezi mai multe."`).
- If signed-in user has `>= USER_DAILY_JOBS` keys under `userDayPrefix(uid, day)` → 429 `user-daily-limit` (`"You reached today's limit. Please try again tomorrow."` / `"Ai atins limita de azi. Încearcă din nou mâine."`).
- On success: signed-in user writes `userDayPrefix(uid, day) + jobId`; guest (when `accountsConfigured`) gets `Set-Cookie: pg_guest=1; Path=/; Max-Age=15552000; HttpOnly; SameSite=Lax` (`+ Secure` in production).
- When `!accountsConfigured`: none of the above applies.
- Cleanup cron also deletes `users/<32-hex>/days/<YYYY-MM-DD>/*` older than `RETENTION_DAYS` without touching `users/<uid>/courses/`.

Tests: guest 1st job sets cookie, 2nd gets `guest-limit`; unconfigured sets no cookie and blocks nothing; signed-in user ignores guest cookie, 6th job same day gets `user-daily-limit`, next day succeeds; cron purges old day markers only.

Commit: `feat: guest and per-user creation limits`.

---

## Owner actions to include in Package C PR body

1. In Google Cloud, create a `"Web application"` OAuth client with redirect URI `https://playground-portal-bay.vercel.app/api/auth/google/callback`.
2. In Vercel (Production), set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `SESSION_SECRET` (32+ random chars), then redeploy. (Sign-in stays hidden until set.)

## Calls made / problems
