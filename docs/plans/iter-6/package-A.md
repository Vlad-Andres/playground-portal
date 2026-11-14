# Iteration 6 — Package A: Honest, Branded Course Page

> Read [`00-guidelines.md`](00-guidelines.md) first (H2, H3, H5).
> **Scope:** `playground-template` (`iteration-6`). No new model calls.

---

### Task A1: Exam only when there is enough to practise

**Files:** `core/generate/finish.ts`, its tests.
- Export `EXAM_MIN_QUESTIONS = 5`, `EXAM_MIN_LECTURES = 2`.
- `finishCourse` emits the exam only when exam mode is on **and** the assembled lectures contain ≥ 5 valid quiz questions spread over ≥ 2 lectures. Otherwise the course has no exam and no error.
- Tests: 4 questions → no exam; 5 questions in one lecture → no exam; 5 across 2 → exam; exam mode off → no exam.
- **Commit:** `feat: build the practice exam only when enough questions exist`

### Task A2: The home page promises only what the course has

**Files:** `src/screens/HomeScreen.tsx`, `src/components/home/*`, `src/components/layout/SiteHeader.tsx`, tests.
- Hide links and cards for "Expected at the exam", open questions, principles and the exam when the course JSON lacks that data. No dead link anywhere in navigation.
- The exam card/link says "Practice exam — built from the lecture questions" (EN/RO).
- Tests render a course without exam/expected data and assert no link to `/exam` or `/expected`.
- **Commit:** `fix: course home shows only features the course has`

### Task A3: Host brand and footer link

**Files:** `core/site.ts`, `src/components/layout/{SiteHeader,SiteFooter}.tsx`, tests.
- Add to the host config: `brand: { name: string; homeUrl: string | null }` (standalone default: course title, `null`).
- Header shows `brand.name` when set. When `homeUrl` is set, the footer shows "Made with {name} — make your own" linking to `${homeUrl}?from=course`.
- Ask AI and every other screen must not show model or provider names (check and fix if any remain).
- **Commit:** `feat: host brand and a make-your-own footer link`

**Check by hand:** render one fixture with and one without exam at 375 px and 1280 px, light and dark.
