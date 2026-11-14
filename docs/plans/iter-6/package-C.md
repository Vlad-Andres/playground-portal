# Iteration 6 — Package C: Portal Sync and Beta Limits

> Read [`00-guidelines.md`](00-guidelines.md) first.
> **Scope:** `playground-portal` (`iteration-6`). Depends on A and B merged in `TEMPLATE`.

---

### Task C1: Sync and use the host config

**Files:** `npm run sync:core`; `app/courses/[key]/layout.tsx`; tests in `tests/{core-vendor,site-vendor,course-routes}.test.*`.
- Set the host config: `brand.name = "Study with AI"`, `brand.homeUrl` = the portal origin.
- Apply the B4 prompt change in `app/api/assistant/route.ts`.
- **Commit:** `chore: sync vendored core from template <sha>` then `feat: course pages carry the Study with AI brand`

### Task C2: Exam on by default

**Files:** `components/create/Builder.tsx` (the `examMode` checkbox is `defaultChecked`), `messages/{en,ro}.json` (hint: "Appears when your material gives at least 5 questions across 2 lectures. Scores are practice feedback."), tests.
- **Commit:** `feat: practice exam is on by default`

### Task C3: A job cap per beta group

**Files:** `lib/settings.ts` (`InviteCode` gains `monthlyJobLimit: number | null`, `null` = no extra cap), `lib/guard.ts`, `lib/api/handlers.ts`, `app/admin/SettingsForm.tsx`, tests.
- Count jobs per code per UTC month (store a small counter next to the existing daily counter). Reject with code `group-limit` and a translated message when reached. The existing global daily limit still applies.
- Admin shows each code's label, limit and this month's count.
- **Commit:** `feat: monthly course limit per invite code`

### Task C4: Rename user-facing "playground." to "Study with AI"

**Files:** `messages/{en,ro}.json`, `app/layout.tsx` metadata, `components/TopBar.tsx`. Leave repo names, package names and internal identifiers alone.
- Test: no `playground` (case-insensitive) in EN/RO message values.
- **Commit:** `chore: Study with AI in user-facing copy`

**Check by hand:** fake-model course with a code that has `monthlyJobLimit: 1`: first job works, second shows the group-limit message in EN and RO; the course page shows the brand, footer link and exam.
