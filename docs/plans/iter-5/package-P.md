# Iteration 5 — Package P: Portal Preparation

> Read [`00-guidelines.md`](00-guidelines.md) first (confirm the Iteration 5 start gate and branch setup before touching code).
> **Scope:** `playground-portal` (`iteration-5`).

---

### Task P1: Run the tests in CI

**Files:** `.github/workflows/ci.yml`, `tests/ci.test.ts` (new).

Add the step `- run: npm test` between `npm run lint` and `npm run build`. Keep every other step.

Test: read the workflow file as text and expect the four commands `npm run lint`, `npm test`, `npm run build`, `npm audit --omit=dev --audit-level=high` to appear in that order.

Commit: `ci: run portal tests in pull requests`.

---

### Task P2: A stopped step is picked up again

Today `advance` saves `status: "working"` before it runs a step. When the server stops that request (timeout, deploy), the state stays `working` on disk, and the job page only calls `advance` for `idle` jobs — so the job hangs forever. `advance` itself already handles an expired claim correctly.

**Files:** create `lib/jobs/poll.ts`, `tests/poll.test.ts`; modify `app/jobs/[id]/page.tsx`.

```ts
// lib/jobs/poll.ts  (no imports from next/* or node:*; the page imports it)
export const STALE_AFTER_MS = 345_000;   // CLAIM_TTL_SECONDS (330) + 15 s
export function shouldAdvance(job: { status: string; updatedAt: string }, nowMs: number): boolean;
// true when status is "idle"; true when status is "working" and nowMs - Date.parse(updatedAt) > STALE_AFTER_MS;
// false otherwise (also when updatedAt is not a date)
```

In the page's `tick`, replace `current.status === "idle" && !paused` with `shouldAdvance(current, Date.now()) && !paused`. Change nothing else in the polling logic.

Tests: `idle` → true; `working` 10 s old → false; `working` 346 s old → true; `awaiting-review`, `done`, `failed` → false; a bad date → false. In `tests/jobs.test.ts`: a state saved as `working` with a claim older than 330 s becomes `idle` with `attempts` 1 when advanced, and runs on the next call.

Commit: `fix: resume a job whose step was stopped`.

---

### Task P3: The job keeps going when the tab is closed

Today only the open page drives a job. After this task each finished step starts the next one from the server; the page stays as a second driver (claims already make two drivers safe).

**Files:** modify `lib/api/handlers.ts`, `app/api/jobs/[id]/advance/route.ts`, tests.

```ts
// lib/api/handlers.ts
export function shouldChain(state: Pick<JobState, "status" | "error">): boolean;
// true only when status === "idle" and there is no error: a step that just failed waits for the
// page's "Try again", exactly as today
export async function advanceJob(id: string, deps: () => AdvanceDeps, env: NodeJS.ProcessEnv):
  Promise<{ response: Response; state: JobState | null }>;
// exactly what advanceHandler does today, but it also returns the state (null on an error response).
// advanceHandler stays and returns (await advanceJob(...)).response
```

In the route: call `advanceJob`; when `state && shouldChain(state)`, register with `after()` (read `after.md` in `node_modules/next/dist/docs/`) one request to the same URL: `fetch(request.url, { method: "POST", signal: AbortSignal.timeout(5000) })` with every error swallowed. The timeout only stops **waiting** for the answer; the request it started keeps running on the server. Do not chain when the handler answered with an error.

Tests: `shouldChain` for every status, and `idle` with an error → false; `advanceJob` returns the state for a normal step and `null` for an unknown id and when generation is off.

Check by hand (fake model): create a job, reach the outline/design screen, accept it, close the tab at once, wait one minute, reopen `/jobs/<id>`: it is done. If it is not after two honest attempts, stop and report; do not remove the page's own driving. *(Note: on Vercel this must also be confirmed on the first real job after release.)*

Commit: `feat: jobs continue on the server between steps`.

---

## Calls made / problems

- P3 check by hand (fake model, `next dev` in a separate `iteration-5` worktree): created a job, accepted the outline, then made a single `/advance` POST and did not touch it again; the job cascaded `lecture:1 → lecture:2 → finish → done` in ~1 s via the `after()` chain and ended `done` with a `/courses/<key>/` URL. The literal "close the tab" behaviour cannot be observed without a browser; on Vercel it must still be confirmed on the first real job after release.
- Worked in a separate git worktree so the concurrent `iteration-4` translation work in the original checkout was never touched. That work later landed on `main` via PR #7; Package P's files do not overlap it.
