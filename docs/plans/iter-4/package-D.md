# Iteration 4 — Package D: Creator Site Editing

> **Scope:** `playground-portal` on branch `iteration-4`. Do **not** touch `playground-template`.
> **Current state:** Task D1 (`19e3ec4`) is committed on `iteration-4` (along with Package C `cbdcbef`..`eb00caf`). Start directly at **Task D2**. When D2 is done, push `iteration-4` and open the PR (include the `ADMIN_TOKEN` reminder from Package C in the PR body).
> **Styles & i18n:** CSS Modules (`*.module.css`) reusing `app/globals.css` tokens; no Tailwind on portal pages; work at 375 px with keyboard focus. All visible strings in `messages/en.json` and `messages/ro.json` (informal singular "tu"; comma-below diacritics `ă, â, î, ș, ț`; brand `"playground."` untranslated; glossary: course site → `"site de studiu"`, lecture → `"lecție"`, outline → `"cuprins"`).

---

### Task D1: Patch logic (pure, no UI) *(committed: `19e3ec4`)*

**Files:** create `lib/sites/edit.ts`, `tests/site-edit.test.ts`.

```ts
// lib/sites/edit.ts
export interface CoursePatch {
  title?: string;                                   // 1..120 characters after trim
  description?: string;                             // 0..400
  accent?: string;                                  // #rrggbb
  lectures?: { slug: string; title?: string; remove?: boolean }[];
  blocks?: { slug: string; sectionId: string; index: number; remove?: boolean; md?: string }[];   // at most 200
}
export const coursePatchSchema: z.ZodType<CoursePatch>;       // strict objects
export type PatchError = "unknown-lecture" | "unknown-block" | "not-editable" | "last-lecture" | "empty-lecture" | "invalid";
export function applyCoursePatch(site: SiteData, patch: CoursePatch): { ok: true; site: SiteData } | { ok: false; code: PatchError };
export function blockSummary(block: Block): { kind: string; text: string; editable: boolean };
// text: the first 140 characters a person would recognise the block by (md, title, prompt, caption, first item…);
// editable: true only for kinds "prose" and "info"
```

Rules for `applyCoursePatch` (never mutate the input; work on a deep copy):

1. `title` sets `course.title`; when `course.shortTitle` was equal to the old title, set it too. `description` sets `course.description`. `accent` sets `course.theme.accent` (create `theme` when missing; keep `corners`).
2. `lectures[].title` sets `meta.title` of that lecture. An unknown `slug` → `unknown-lecture`.
3. `blocks[]` address a block by lecture `slug`, section `id` and the block's **original** index in that section. Unknown → `unknown-block`. `md` is allowed only when the block's kind is `prose` or `info` (it replaces the block's `md` field; at most 6,000 characters) → otherwise `not-editable`. Apply all `md` changes first, then removals from the highest index to the lowest.
4. A section with no blocks left is removed. A lecture with no sections left → `empty-lecture`.
5. Lectures with `remove: true` are dropped. No lecture left → `last-lecture`. Renumber `meta.number` 1, 2, 3 … in the remaining order.
6. Rebuild `site.index` from the lectures with `toIndexEntry` (`@core/assemble`).
7. The result must pass `siteDataSchema` → otherwise `invalid`.

Tests: one test per rule and per error code; input object unchanged after a call (`structuredClone` before, deep equal after); empty patch returns a site deep-equal to input; removing a `custom` block works; `md` on a `table` block gives `not-editable`.

Commit: `feat: course patch logic`.

---

### Task D2: The manage page

**Files:** create `app/manage/[token]/page.tsx`, `app/manage/[token]/actions.ts`, `components/manage/Editor.tsx`, `app/manage/manage.module.css`, `tests/manage-actions.test.ts`; add the `manage` messages in both languages.

- `page.tsx` (server): `key = await findCourseByOwnerToken(store, token)`; `null` → `notFound()`. Read the site with `readSite` (**not** the cached `loadSite`). Render the top bar (brand, `LanguageSwitch`) and `<Editor token site />`. `metadata.robots` = no index.
- `actions.ts`:
  - `saveCourse(token: string, patch: unknown): Promise<{ ok: true } | { ok: false; code: string }>` — find the course by token (`not-found` when missing); parse with `coursePatchSchema` (`bad-request`); `applyCoursePatch`; `writeSite` with the old meta plus a new `updatedAt`, the new `title` and `lectures` count (keep `ownerHash`, `usage`, `publishedAt`, `jobId`); `updateTag(courseTag(key))`; `logEvent("course.updated", { key })`.
  - `removeCourse(token: string): Promise<{ ok: boolean }>` — find by token; `deleteSite`; `updateTag`; `logEvent("course.deleted", { key, by: "owner" })`.
  - Neither action logs or returns the token.
- `Editor` (client), translated:
  - Fields: site title, description, accent colour (`<input type="color">`).
  - One `<details>` per lecture: title field, checkbox "Remove this lecture", then per section the blocks: a label with the block kind (translated names for all 15 kinds), the `blockSummary` text, a checkbox "Remove", and for editable blocks a `<textarea>` with the Markdown.
  - "Save changes" builds one patch with only what changed and calls `saveCourse`. Show "Saved." or the translated error (`manage.errors.<code>`). After a successful save, `router.refresh()`.
  - Link "Open your site" (`/courses/<key>/`, new tab).
  - A separate "Delete this site" area: button → `window.confirm` with the translated question → `removeCourse` → go to `/`.
- Add message keys for every `PatchError`, for `not-found` and `bad-request`.

Tests (memory store, mock `next/cache`): `saveCourse` with a wrong token returns `not-found` and writes nothing; a valid title change is stored and `meta.title`/`updatedAt` change while `ownerHash` and `publishedAt` do not; an invalid patch (`last-lecture`) leaves `site.json` byte-identical; `removeCourse` deletes the course and its `owners/` file; a second `removeCourse` returns `{ ok: false }`.

Check by hand (see `ARCHITECTURE.md` for local run command): finish a fake-model job, open the private link from the job page, rename the site and a lecture, edit one paragraph, remove one block, save, open the site: changes are visible at once. Open `/manage/` plus 32 wrong characters: 404.

Commit: `feat: creators can edit or delete their site`.

---

## Calls made / problems

- D1: when empty sections are dropped, `lecture.meta.outline` is rebuilt from the remaining sections so assembled outline metadata stays aligned with `lecture.sections`.
