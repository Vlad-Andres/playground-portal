# Iteration 5 — Package D: Courses That Change Safely

> Read [`00-guidelines.md`](00-guidelines.md) first (especially G3, G4, G5, G8).
> **Scope:** `playground-portal` (`iteration-5`).

---

### Task D1: Versions and restore

**Files:** modify `lib/sites/library.ts`, `app/manage/[token]/actions.ts`, `app/manage/[token]/page.tsx`; create `components/course/Versions.tsx`, tests in `tests/library.test.ts`, messages.

```ts
// lib/sites/library.ts
export const VERSIONS_KEPT = 3;
export type UpdateReason = "edit" | "refine" | "append" | "rebuild" | "restore";
export interface VersionInfo { n: number; savedAt: string; reason: UpdateReason; title: string; lectures: number }
export async function updateCourse(store: Store, key: string, next: SiteData, reason: UpdateReason, now: Date,
  metaPatch?: Partial<Pick<SiteMeta, "keepSources">>): Promise<SiteMeta>;
export async function listVersions(store: Store, key: string): Promise<VersionInfo[]>;          // newest first
export async function restoreVersion(store: Store, key: string, n: number, now: Date): Promise<SiteMeta | null>;
```

`updateCourse`, in exact order:
1. `readSite` + `readMeta`; either missing → throw `Error("not-found")`.
2. Validate `next` with `siteDataSchema` and `next.key === key`; else throw `Error("invalid")`.
3. Write `courses/<key>/versions/<meta.version>.json` = `{ n: meta.version, savedAt: now, reason, title: currentTitle, lectures: currentCount, site: currentSite }` (`reason` = what replaces this snapshot).
4. `writeSite(next)` with `version: meta.version + 1`, `updatedAt: now`, new `title` and `lectures`, `metaPatch` applied, other fields preserved. If step 4 throws, delete the file written in step 3 and rethrow.
5. List `courses/<key>/versions/` and delete all except the `VERSIONS_KEPT` highest `n`.
6. `logEvent("course.updated", { key, reason, version })`; return new meta.

`restoreVersion`: read version `n` (missing / bad JSON / fails `siteDataSchema` → `null`); `updateCourse(store, key, thatSite, "restore", now)`; `logEvent("course.restored", { key, from: n, version })`.

- Manage `saveCourse` now calls `updateCourse(…, "edit", …)` instead of `writeSite`. Add `restore(token, n)` action (access check, `restoreVersion`, `updateTag(courseTag(key))`; `not-found` if missing).
- `Versions` component (on `/manage/<token>` and `/my/<key>`): `"Earlier versions"` / `"Versiuni anterioare"` showing date, title, lecture count, reason (`edit`: `"edited by hand"` / `"editat manual"`; `refine`: `"refined"` / `"îmbunătățit"`; `append`: `"material added"` / `"materiale adăugate"`; `rebuild`: `"reorganised"` / `"reorganizat"`; `restore`: `"a restore"` / `"o restaurare"`), and `"Restore"` / `"Restaurează"` button with `window.confirm`.

Tests: 1st change writes v1 and sets `meta.version = 2`; after 4 changes only v2–v4 remain and current is 5; restoring v2 snapshots v5 and restores v2 content; missing `n` returns `null`; invalid `next` writes nothing; simulated `meta.json` write failure leaves old site intact and deletes orphan snapshot; `deleteSite` removes versions; `saveCourse` creates a version.

Commit: `feat: keep and restore recent course versions`.

---

### Task D2: The owner's course page and kept files

**Files:** create `app/my/[key]/page.tsx`, `app/my/[key]/actions.ts`, `components/course/KeptFiles.tsx`; modify `lib/sites/library.ts`, `lib/sites/publish.ts`, `lib/jobs/state.ts`, `lib/jobs/steps.ts`, `lib/api/handlers.ts`, `components/create/Builder.tsx`, `app/my/page.tsx`, messages, `README.md`, tests.

```ts
// lib/sites/library.ts
export const SOURCE_LIMIT_BYTES = 4 * 1024 * 1024;
export const SOURCE_LIMIT_FILES = 12;
export async function saveBrief(store: Store, key: string, brief: Brief): Promise<void>;
export async function readBrief(store: Store, key: string, site: SiteData): Promise<Brief>;
// fallback if missing/invalid: language + level (default "university") from site.course, depth "standard",
// examMode = site.exam !== null, quizzes true, widgets true, context ""
export async function readSources(store: Store, key: string): Promise<Material[]>;  // name order; skip invalid
export async function sourceUsage(store: Store, key: string): Promise<{ files: number; bytes: number }>;
export async function addSources(store: Store, key: string, materials: Material[]): Promise<"ok" | "sources-full">;
// same-name replaces stored; refuse and write nothing if result exceeds 4 MB or 12 files
export async function deleteSources(store: Store, key: string): Promise<void>;
export async function setKeepSources(store: Store, key: string, keep: boolean, now: Date): Promise<SiteMeta>;
// updates meta.keepSources only (no version); keep === false deletes sources; logs "sources.changed"
```

- `JobState` gains `keepSources?: boolean` (hidden from browser); `createJobHandler` stores it **only for signed-in users**.
- `Builder` (signed-in only): unchecked checkbox `"Keep my files privately so I can reorganise this course later"` / `"Păstrează-mi fișierele în privat, ca să pot reorganiza cursul mai târziu"` + helper `"Only you can use them. You can delete them at any time."` / `"Doar tu le poți folosi. Le poți șterge oricând."`
- `finish` (`create` job): `saveBrief`; if `state.keepSources` and owned, call `addSources` (`sources-full` → keep nothing, `keepSources: false`, else `keepSources: true`); delete `materials.json`.
- `/my/<key>` (`robots: noindex`): `requireUser` + `resolveAccess({ uid, key })` (`null` → `notFound()`). Renders `Editor` (session-backed actions), `Versions`, `KeptFiles`, and `"Delete this course"`. Link `"Manage"` on `/my` to `/my/<key>`.
- `app/my/[key]/actions.ts` (every action checks `requireUser` + `resolveAccess`, else `{ ok: false, code: "not-found" }`): `saveMyCourse(key, patch)`, `removeMyCourse(key)`, `restoreMyVersion(key, n)`, `setKeep(key, keep)`.
- `KeptFiles`: switch `"Keep my files"`, usage `"N files · X MB of 4 MB"` (`next-intl`), button `"Delete my files"` / `"Șterge-mi fișierele"`.
- `README.md`: short `"Privacy"` section covering stored data and opt-in file retention/deletion.

Tests: guest `keepSources: true` ignored; signed-in default stores none; signed-in opt-in stores materials and deletes `materials.json`; `addSources` enforces 4 MB / 12 files and same-name replacement; `setKeepSources(false)` deletes all `sources/`; `deleteSite` deletes sources + brief; other user's session gets `not-found`; `readBrief` fallback works.

Commit: `feat: owner page and opt-in kept files`.

---

### Task D3: Refinement rounds

**Files:** create `app/api/courses/[key]/jobs/route.ts`, `components/course/Refine.tsx`; modify `lib/sites/library.ts`, `lib/jobs/state.ts`, `lib/jobs/steps.ts`, `lib/api/handlers.ts`, `app/my/[key]/page.tsx`, `app/jobs/[id]/page.tsx`, messages, tests.

```ts
// lib/sites/library.ts
export const ROUNDS_MAX = 3;
export const BUSY_TTL_SECONDS = 7_200;
export async function roundsUsed(store: Store, key: string): Promise<number>;
export async function claimRound(store: Store, key: string, jobId: string, now: Date): Promise<number | null>; // store.create rounds/1..3.json
export async function releaseRound(store: Store, key: string, round: number): Promise<void>;
export async function claimBusy(store: Store, key: string, jobId: string, now: Date): Promise<boolean>; // store.create busy.json; expire > BUSY_TTL_SECONDS
export async function releaseBusy(store: Store, key: string, jobId: string): Promise<void>; // deletes only if matching jobId

// lib/jobs/state.ts — JobState gains: courseKey?: string; round?: number; summary?: string;
// lib/api/handlers.ts
export async function courseJobHandler(key: string, request: Request, store: Store, env: NodeJS.ProcessEnv, user: User | null, now?: Date): Promise<Response>;
```

`POST /api/courses/:key/jobs` (`{ kind: "refine", note: string }`):
1. No user → 401 `sign-in-required`; `resolveAccess` null → 404 `not-found`.
2. Generation off/paused → 503 `generation-off`; >4 MB → `too-large`; empty or `> LIMITS.refineNote` trimmed note → 400 `bad-request`.
3. Per-user & global daily limits → `user-daily-limit` / `daily-limit`.
4. `!claimBusy` → 409 `course-busy`; `!claimRound` → `releaseBusy`, 409 `rounds-used`.
5. Create job (`kind: "refine"`, step `refine-plan`, `courseKey`, `round`, `ownerId`), write `note.json` + day markers, `logEvent("job.created", { jobId, kind: "refine", signedIn: true })`, return 202 `{ id }`.

Steps:
- `refine-plan`: `planRefinement` → write `refine.json`, set `lecturesTotal`, next `refine:1` (or `finish` if 0 lectures).
- `refine:n`: `rewriteLecture(toLectureFile(lecture), instruction, pagesText, brief, model)` → write `lectures/<n>.json` (`{ lecture, changed }`). `pagesText` = `renderMaterials(sources, min..max page ranges per file from lecture blocks)` when `meta.keepSources` and sources exist, else `null`.
- `finish`: `replaceLectures(site, changedLectures, plan.course)`; if nothing changed and no course field set → fail immediately with `refine-empty`; else `updateCourse(…, "refine", …)`, `deps.onCourseChanged?.(key)` (`revalidateTag` on `courseTag(key)`), `releaseBusy`, set `done`, `siteUrl`, `summary`.
- On any `failed` transition: `releaseRound` + `releaseBusy`. Map `Error("refine-empty")` to job error `refine-empty` (`"We could not turn that note into a change. Try describing what to change and where."` / `"Nu am putut transforma nota într-o modificare. Descrie ce să schimbăm și unde."`) with **no retries** (fail immediately).
- `Refine` UI on `/my/<key>`: textarea (`<= 1,000` chars + counter), `"Rounds left: N of 3"` / `"Runde rămase: N din 3"`, examples (`"Make lecture 2 simpler"` / `"Simplifică lecția 2"`; `"Add more practice to the last lecture"` / `"Adaugă mai multe exerciții la ultima lecție"`), `"Refine"` / `"Îmbunătățește"` button (disabled when 0 left).
- Job page (`kind === "refine"`): phases `"Understand your note"` / `"Înțelegem nota"`, `"Rewrite the lectures"` / `"Rescriem lecțiile"`, `"Done"`; done view shows `summary`, `"Open your site"`, and `"Not what you wanted? Restore the previous version."` / `"Nu e ce voiai? Restaurează versiunea anterioară."` → `/my/<key>`.
- Error codes: `sign-in-required` (401), `course-busy` (409), `rounds-used` (409).

Tests: full refine updates subtitle + `meta.version`, keeps `rounds/1.json`, clears `busy.json`; 4th job gets `rounds-used`; concurrent `Promise.all` → one 202 + one `course-busy`; `[empty]` fails immediately with `refine-empty`, releases round, leaves site untouched; 3x failure in `refine:1` releases round; other user → 404; guest → 401; stale `busy.json` (>2 h) recovered; kept sources include `=== … — page` in prompt, unkept does not.

Commit: `feat: owners can refine a course three times`.

---

### Task D4: Add material, and reorganise only when chosen

**Files:** create `components/course/AddMaterial.tsx`, `app/api/jobs/[id]/choice/route.ts`; modify `lib/api/handlers.ts`, `lib/jobs/steps.ts`, `app/my/[key]/page.tsx`, `app/jobs/[id]/page.tsx`, messages, tests.

Extend `POST /api/courses/:key/jobs` for `{ kind: "append", materials: Material[] }`: same auth/busy/daily checks as D3 (no round claimed); `checkMaterials`; 409 `course-full` if `site.lectures.length >= LIMITS.courseLectures`; dry-check `sources-full` (413) when `meta.keepSources`. Starts at `append-plan` with `materials.json`.

Steps & choice route:
- `append-plan`: `planAppend` → write `append.json` and `plan.json` (`{ course: site.course, lectures: plan.lectures, approach: "follow-source", why: "" }`). `restructure === null` → `lecture:1` (`lecturesTotal` set); else → `choice`, `awaiting-review`, `waiting: "choice"`.
- `PUT /api/jobs/:id/choice` (`{ choice: "append" | "reorganize" }`, requires `waiting === "choice"` else `wrong-state`):
  - `append` → `lecture:1`, `idle`.
  - `reorganize` → requires `meta.keepSources` and stored sources (else 409 `sources-missing`). Merge stored + new materials (same-name replaced), run `checkMaterials` (on error return code and stay waiting), switch `kind = "rebuild"`, write `brief.json` (`readBrief`) + `context.json` (`defaultContext`), step `design`, `idle`.
- `finish` (`append`): `appendLectures` → `updateCourse(…, "append", …)` → `addSources` (if `keepSources`) → `onCourseChanged` → delete `materials.json` → `releaseBusy` → `done`.
- `finish` (`rebuild`): `finishCourse` → `siteFromFiles(courseKey, files)` → `updateCourse(…, "rebuild", …)` → replace stored sources with job materials → `onCourseChanged` → delete `materials.json` → `releaseBusy` → `done`.
- Any failed `append`/`rebuild` releases busy and leaves published course untouched.
- `PublicJob` (`waiting === "choice"`): `choice?: { reason: string; affected: { slug: string; title: string }[]; canReorganize: boolean }`.
- `AddMaterial` on `/my/<key>`: shared file-picker hook + `"Add to this course"` / `"Adaugă la acest curs"` + `"New lectures are added at the end. Existing lectures are not changed."` / `"Lecțiile noi se adaugă la final. Lecțiile existente nu se schimbă."`
- Job page (`waiting === "choice"`): `"Your new material overlaps with existing lectures"` / `"Materialul nou se suprapune cu lecții existente"`, reason, affected titles, primary `"Add as new lectures"` / `"Adaugă ca lecții noi"`, secondary `"Reorganise the whole course"` / `"Reorganizează tot cursul"` (disabled when `!canReorganize` with `"Reorganising needs your original files. Switch on 'Keep my files' for this course first."` / `"Reorganizarea are nevoie de fișierele originale. Activează mai întâi «Păstrează-mi fișierele» pentru acest curs."`).
- Error codes: `course-full` (409), `sources-full` (413), `sources-missing` (409).

Tests: append adds lectures after existing ones (existing deep-equal), bumps version, stores new source when kept; `[restructure]` pauses at `choice` with 2 titles; `append` choice leaves existing untouched; `reorganize` without sources → `sources-missing`; `reorganize` with sources runs `design → review → lectures → finish` keeping key, bumping version, keeping old version restorable; failed append leaves site byte-identical and releases busy; `course-full` & pre-job `sources-full`.

Commit: `feat: add material to a course, reorganise only on request`.

---

### Task D5: Delete my account

**Files:** modify `lib/sites/library.ts`, `app/my/actions.ts`, `app/my/page.tsx`, messages, tests.

```ts
export async function deleteAccount(store: Store, uid: string): Promise<number>;
// removeCourse for every owned course, then delete all keys under users/<uid>/; returns deleted course count
```

`/my` bottom section: `"Delete my account"` / `"Șterge-mi contul"` with `"This deletes all your courses, their versions and your kept files. It cannot be undone."` / `"Se șterg toate cursurile tale, versiunile lor și fișierele păstrate. Nu se poate anula."` + button (`window.confirm` → `deleteMyAccount()`: `requireUser`, `deleteAccount`, invalidate each course tag, `logEvent("account.deleted", { courses })`, `clearUser`, redirect `/`).

Tests: 2 owned courses (with versions, sources, rounds) + day markers → `deleteAccount` leaves zero `courses/<key>/`, `users/<uid>/`, or `owners/` keys while leaving another user's course untouched.

Commit: `feat: delete an account with everything it owns`.

---

## Calls made / problems
