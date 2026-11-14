# Iteration 5 — Package A: Generator Infers, Designs & Adapts

> Read [`00-guidelines.md`](00-guidelines.md) first (especially G1, G2, G7).
> **Scope:** `playground-template` (`iteration-5`), then sync into `playground-portal` (`iteration-5`) after A7. All paths below are in `TEMPLATE` unless marked `PORTAL`.

---

### Task A1: The agent guide allows the sandboxed custom exercise

**Files:** `AGENTS.md`, `docs/agent/04-write-lecture.md`, `tests/reference-docs.test.ts`.

In `AGENTS.md` "Hard interface", replace `"Content may contain Markdown, but not executable code or raw HTML."` with:

> Content may contain Markdown, but not executable code or raw HTML — with one exception: a `custom` block (see `docs/agent/blocks/`) carries one self-contained exercise in its `html` field. It runs only inside a sandboxed frame without network or storage, must pass `scanCustomHtml` (`core/custom.ts`), and is used only when no catalogue widget can teach the idea.

Add the same two sentences to `docs/agent/04-write-lecture.md` under a heading `"Custom exercises"`.

Test: `AGENTS.md` contains both `"not executable code or raw HTML"` and `"scanCustomHtml"`.

Commit: `docs: custom block is the one allowed HTML exception`.

---

### Task A2: Detect the language of the material (no model)

**Files:** create `core/generate/language.ts`, `tests/generate-language.test.ts`, `tests/fixtures/eval/` (five files + `load.ts`); modify `core/generate/index.ts` (export it).

```ts
// core/generate/language.ts
export const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr", "es", "it", "pt", "ro", "pl"] as const;
export interface LanguageGuess { kind: "clear" | "mixed" | "unknown"; top: string | null; second: string | null; share: number }
export function detectLanguage(materials: Material[]): LanguageGuess;
export type LanguageDecision =
  | { language: string; source: "user" | "material" | "portal" }
  | { ask: string[] };            // 2 or 3 language codes, no duplicates
export function decideLanguage(input: { requested: string; locale: string; guess: LanguageGuess }): LanguageDecision;
```

`detectLanguage`, exactly:
1. For each page: lower-case text, remove diacritics (`normalize("NFKD")` and drop `\p{M}`), split into words on `/[^\p{L}]+/u`.
2. Count per language how many words appear in that language's stopword list (already without diacritics, no 1-letter words):
   - `en`: `the and of to in is that for with as are this be by on or from which an it can not we has have`
   - `nl`: `de het een en van is dat op te voor met zijn niet aan er ook als bij door naar wordt deze maar om uit`
   - `de`: `der die das und ist nicht mit den von zu ein eine auf fur dem des sich auch als wird bei oder sind dass werden`
   - `fr`: `le la les des et est un une du dans que pour qui pas sur au par avec ce sont ne plus cette ou aux`
   - `es`: `el la los las de que en un una es por con para del se no como mas su al lo son pero este`
   - `it`: `il la di che un una per in con non del della le sono si da come piu anche dei nel alla gli`
   - `pt`: `os as de que em um uma para com nao do da por se dos das mais como ao sao na`
   - `ro`: `si in de la cu este un care pe din sau pentru nu se mai sunt ca prin al ale aceasta fie intre`
   - `pl`: `nie na sie do to ze jest jak ale po co tak za od dla przez sa lub oraz byc moze`
3. A page **counts for** its best language when that language has `>= 5` hits and `>= 1.3 *` the second-best language's hits; otherwise it counts for none.
4. `share` of a language = pages counting for it ÷ pages counting for any language.
5. No page counts → `{ kind: "unknown", top: null, second: null, share: 0 }`. Best share `>= 0.8` → `clear`. Else second-best share `>= 0.2` → `mixed`. Else → `clear`. `top`/`second` are best and second-best (`second` is `null` when only one scored).

`decideLanguage`, in order:
1. `requested !== "auto"` → `{ language: requested, source: "user" }`.
2. `guess.kind === "clear"` → `{ language: guess.top, source: "material" }`.
3. `guess.kind === "mixed"` → `{ ask: [guess.top, guess.second, locale] }` deduplicated.
4. Otherwise → `{ language: locale in SUPPORTED_LANGUAGES ? locale : "en", source: "portal" }`.

**Fixtures** `tests/fixtures/eval/` — original text, 3 pages of ~250 words each separated by `---page---`: `cs-en.md` (binary search), `math-en.md` (derivatives with `$…$` formulas), `vocab-ro.md` (Romanian: 20 biology terms with definitions), `history-en.md` (causes of WWI), `mixed-en-ro.md` (page 1 English, pages 2–3 Romanian). Helper `tests/fixtures/eval/load.ts`: `loadEval(name): Material` (splits on `---page---`). *(If a fixture test fails after two honest attempts because of hand-written word lists, stop and report; do not loosen thresholds.)*

Tests: each English fixture → `clear`/`en`; `vocab-ro.md` → `clear`/`ro`; `mixed-en-ro.md` → `mixed` (`top: "ro"`, `second: "en"`); numbers-only → `unknown`; English text using `a, i, o, e` variables stays `en`; all four `decideLanguage` rules, plus mixed with `locale === top` gives 2 options, and `locale: "sv"` with `unknown` → `en`.

Commit: `feat: detect the language of the material`.

---

### Task A3: The request and the inferred context

**Files:** create `core/generate/context.ts`, `tests/generate-context.test.ts`; modify `core/generate/types.ts`, `core/generate/prompts.ts`, `core/generate/fake.ts`, `core/generate/index.ts`.

```ts
// core/generate/types.ts — add (Brief and briefSchema stay unchanged)
export const requestSchema: z.ZodType<CourseRequest>;   // strict
export interface CourseRequest {
  language: string;            // "auto" or a code matching Brief's language pattern
  level: "auto" | "school" | "university" | "professional";
  depth: Depth; examMode: boolean; quizzes: boolean; widgets: boolean;
  title?: string; accent?: string; context: string;      // same limits as Brief
  locale: string;              // /^[a-z]{2}$/
}

// core/generate/context.ts
export interface ContextQuestion { id: "language" | "focus"; options: { id: string; label: string }[] }
export interface CourseContext {
  language: string | null;                 // null only while "language" question is open
  languageSource: "user" | "material" | "portal" | null;
  level: "school" | "university" | "professional";
  subject: string;                         // <= 120 chars
  goals: string[];                         // 0..5, each <= 160
  assumptions: string[];                   // 0..4, each <= 200
  questions: ContextQuestion[];            // 0..2
}
export const courseContextSchema: z.ZodType<CourseContext>;
export const CONTEXT_SAMPLE_CHARACTERS = 12_000;
export function sampleMaterials(materials: Material[]): string; // renderMaterials of first 2 pages/file, cut to CONTEXT_SAMPLE_CHARACTERS
export async function inferContext(materials: Material[], request: CourseRequest, model: ModelClient): Promise<CourseContext>;
export function resolveBrief(request: CourseRequest, context: CourseContext): Brief;   // throws when context.language is null
export function answerContext(context: CourseContext, request: CourseRequest, answers: Record<string, string>):
  { ok: true; context: CourseContext; brief: Brief } | { ok: false };
export function defaultContext(brief: Brief, subject: string): CourseContext;
// language from brief, source "user", level from brief, no goals, no assumptions, no questions
```

`inferContext`:
1. `decideLanguage({ requested: request.language, locale: request.locale, guess: detectLanguage(materials) })`. Language → `language`/`languageSource`; `{ ask }` → `language: null` and `{ id: "language", options: ask.map((code) => ({ id: code, label: languageName(code) })) }`.
2. One model call (pattern G2) with `contextPrompt` (`TASK.context = "TASK: context"`), passing `sampleMaterials(materials)` and user note. JSON shape: `{ "subject": "...", "level": "school | university | professional", "goals": ["..."], "assumptions": ["..."], "focus": null | { "options": [{ "id": "a", "label": "..." }] } }`. Prompt rules: goals = what a learner can do after the course from the material only; assumptions = things not in the material that had to be guessed; set `focus` only when material could reasonably be taught for clearly different purposes (2–4 options, `<= 80` chars, in `languageName(request.locale)`), else `null`.
3. Code decides: `level` = `request.level !== "auto" ? request.level : validModelLevel ?? "university"`; `subject` cut to 120; lists cut to limits.
4. Keep `focus` question **only when** `request.context.trim() === ""` **and** options are 2–4 objects with unique ids matching `/^[a-z0-9-]{1,20}$/` and labels of 1–80 chars.
5. Fallback after two failed calls (never throw on bad reply; `BudgetExceeded` still throws): `subject` = first file's name without extension, `level` from step 3, empty goals/assumptions, no focus question; language from step 1 preserved.

`answerContext`: every open question requires an answer (`language`: one of its option ids; `focus`: option id or `"skip"`; missing/unknown → `{ ok: false }`). Result has `questions: []`, chosen language with `languageSource: "user"`, and `brief` via `resolveBrief`. Chosen focus (`!== "skip"`) appends `\nFocus chosen by the learner: <label>` to `brief.context` (cut to `LIMITS.contextCharacters`).

`resolveBrief`: copies `depth`, `examMode`, `quizzes`, `widgets`, `title`, `accent`, `context` from request; `language` and `level` from context.

**Fake model:** `TASK.context` returns `subject: "Sample subject"`, `level: "university"`, 1 goal, no assumptions, `focus: null` — unless user text contains `[ask-focus]`, then 2 options (`exam` `"Pass the exam"`, `deep` `"Understand it deeply"`).

Tests: clear EN + RO locale → `en`/`material`, no question; `requested: "ro"` wins; mixed + `locale: "nl"` → `language: null` + options `ro, en, nl` (with `locale: "en"` → 2 options); focus kept on empty note and dropped with note, 5 options, duplicate id, or 81-char label; 2 broken replies → fallback in exactly 2 calls; `level: "auto"` + `"expert"` → `"university"`; `answerContext` (missing, unknown, `"skip"`, real choice into `brief.context`); `resolveBrief` throws when language is null.

Commit: `feat: infer course context and ask only when needed`.

---

### Task A4: Design the course, with real alternatives

**Files:** modify `core/generate/plan.ts`, `core/generate/prompts.ts`, `core/generate/fake.ts`, `core/schema.ts`, `tests/generate-plan.test.ts`, `tests/schema.test.ts`; run `npm run schema`.

```ts
// core/schema.ts — courseSchema gains optional strict field:
home?: { intro?: string /* <= 1200 */; highlights?: { title: string /* <= 80 */; md: string /* <= 400 */ }[] /* 0..4 */; studyPath?: string[] /* 0..6, each <= 160 */ }

// core/generate/plan.ts
export const APPROACHES = ["follow-source", "by-topic", "problem-first", "exam-focused", "timeline"] as const;
export type Approach = (typeof APPROACHES)[number];
export interface PlannedLecture { /* existing fields */ goals: string[] /* 0..4, each <= 160; default [] */ }
export interface CoursePlan { /* existing fields */ approach: Approach /* default "follow-source" */; why: string /* <= 300, default "" */ }
export interface DesignOutline {
  id: "alt-1" | "alt-2"; approach: Approach; why: string;
  lectures: { slug: string; title: string; summary: string; pages: { file: string; from: number; to: number }[] }[];
}
export interface CourseDesign { recommended: CoursePlan; alternatives: DesignOutline[] }
export const designOutlineSchema: z.ZodType<DesignOutline>;
export const courseDesignSchema: z.ZodType<CourseDesign>;
export function keepAlternatives(recommended: CoursePlan, raw: unknown, fileNames: string[]): DesignOutline[];
export async function designCourse(materials: Material[], brief: Brief, context: CourseContext, model: ModelClient): Promise<CourseDesign>;
export async function expandOutline(materials: Material[], brief: Brief, context: CourseContext, outline: DesignOutline, model: ModelClient): Promise<CoursePlan>;
// planCourse(materials, brief, model) stays exported:
// returns (await designCourse(materials, brief, defaultContext(brief, brief.title ?? ""), model)).recommended
```

- `coursePlanSchema` defaults `goals`, `approach`, `why` so old stored plans still parse.
- `designCourse` (uses `TASK.plan`, `designPrompt` replacing `planPrompt`): adds `Subject`, `Goals`, `Assumptions` in `user`, and `"approach"`, `"why"`, per-lecture `"goals"`, `"course.home"`, and `"alternatives"` to JSON shape.
- Prompt rules: `blocks` lists kinds that fit the section (`custom` only when no widget fits); `alternatives`: 0–2 other ways to organise the **same** material with a different `approach` (`[]` if none); `home`: short welcome built only from the material.
- `prepare` keeps deleting the 6 course keys it deletes today, and must **not** delete `home`.
- `alternatives` pass through `keepAlternatives` (bad alternatives never fail the design). Second failure still throws `The course plan was invalid twice: …`.
- `keepAlternatives(recommended, raw, fileNames)` (non-array → `[]`):
  1. Drop entries failing shape (`approach` in `APPROACHES`, `why <= 300`, `1..LIMITS.lectures` lectures each with title, summary, and `>= 1` page range whose `file` is in `fileNames`).
  2. Drop entries whose `approach` matches `recommended.approach` or an already kept alternative.
  3. Drop entries whose trimmed lower-cased lecture titles in order equal `recommended`'s.
  4. Keep first two as `alt-1`, `alt-2`; generate unique slugs with `slugify`.
- `expandOutline` (`TASK.expand = "TASK: expand"`): design prompt + `LECTURES ARE FIXED` listing outline lectures (title + pages), requesting full plan without alternatives. Lecture count must match outline (else validation error for retry). Overwrite each lecture's `number`, `slug`, `title`, `summary`, `pages` + plan `approach`/`why` from outline, then `prepare`/`finish`. Second failure throws `The course plan was invalid twice: …`.
- **Fake model:** `TASK.plan` returns `approach: "follow-source"`, `why`, 1 goal/lecture, `home` with intro; if material contains `[alternatives]`, returns 1 `by-topic` alternative with 1 lecture `"Everything"` covering all pages. `TASK.expand` returns as many lectures as listed under `LECTURES ARE FIXED`.

Tests: `[]` when none; 1 valid → `alt-1`; 3 valid → 2 kept; duplicate approach dropped; identical titles dropped; unknown file dropped; `alternatives: "none"` → `[]` without failing; old stored plan parses with defaults; `home` survives `prepare`; `expandOutline` enforces outline titles/pages and fails after 2 wrong-count replies; `planCourse` still returns `CoursePlan`.

Commit: `feat: design courses with a recommendation and real alternatives`.

---

### Task A5: Teaching forms chosen by fit

**Files:** modify `core/generate/prompts.ts`, `core/generate/lint.ts`, `core/generate/lecture.ts`, `core/generate/fake.ts`, `tests/generate-lint.test.ts`, `tests/generate-lecture.test.ts`.

1. `DepthTarget`: remove `retrieval` and `widgets`; add `custom` (`cram: 0`, `standard: 1`, `deep: 2`).
2. `lecturePrompt`: replace `"Use at least 5 different block kinds."` with `"Choose each block kind because it fits that piece of content. Do not add a kind for variety."` Retrieval target → `- At least 1 recall or practice block.`; widget target → `- Widgets are optional: use one only where a type from the list fits the content.` Add rule `"Every goal in the plan must be covered by at least one block."`
3. Custom exercises in prompt: **only when** `brief.widgets && lecturePlan has section with "custom" && DEPTH_TARGETS[brief.depth].custom > 0`, append `CUSTOM EXERCISE` with `blockExamples.custom` and rules: at most `N`, only in marked section, self-contained HTML/CSS/JS in `html` (`<= 60,000` chars), no network/storage/external links, call `pg.done(score)` (`0..1`) on success. Otherwise append `Do not use "custom" blocks.`
4. `writeLecture`: in `blockProblems`, flag `custom` as `W309` (`A custom exercise is not planned here.`) when the 3 conditions above do not hold. After validation/repair, keep at most the first `N` valid `custom` blocks; move extras to `dropped` with `W309`.
5. `lintLecture`: delete `MIN_KINDS` and `W308`. Keep `W301`–`W307` unchanged.
6. **Fake model:** when material has `[custom]`, plan includes `"custom"` in `"practice"` section and lecture emits one valid custom block (button calling `pg.done(1)`).

Tests: 3 block kinds → no `W308`; prompt omits `"5 different"`; prompt includes `Do not use "custom" blocks.` for `cram`, `widgets: false`, and unplanned `custom`; unplanned custom block dropped with `W309`; `standard` keeps 1 of 2 valid custom blocks; custom block with `fetch(` goes to repair then drops; prose-only lecture still gets `W304` and `W305`.

Commit: `refactor: choose teaching forms by fit, not by quota`.

---

### Task A6: The home page shows the model's welcome

**Files:** `src/screens/HomeScreen.tsx`, `tests/screens.test.tsx`.

When `course.home` exists, render above the lecture list: `intro` (via existing `Markdown`), each highlight as a small card (title + `Markdown`), and `studyPath` as a numbered list under `"How to study this course"`. When absent, render unchanged.

Tests: with `home` → intro, highlight titles, and study-path items appear; without → markup unchanged.

Commit: `feat: home page welcome from the course data`.

---

### Task A7: Rewrite a lecture, plan added material, merge into a site

**Files:** create `core/generate/refine.ts`, `core/generate/append.ts`, `tests/generate-refine.test.ts`, `tests/generate-append.test.ts`; modify `core/generate/lecture.ts`, `core/generate/prompts.ts`, `core/generate/fake.ts`, `core/generate/types.ts`, `core/generate/index.ts`, `core/site.ts`, `tests/site-data.test.ts`.

```ts
// core/generate/types.ts — LIMITS gains: courseLectures: 24, refineNote: 1_000, refineLectures: 3

// core/site.ts
export function toLectureFile(lecture: Lecture): LectureFile;   // lecture without meta.outline
export function appendLectures(site: SiteData, files: LectureFile[]): SiteData;
export function replaceLectures(site: SiteData, files: LectureFile[], course?: { title?: string; description?: string }): SiteData;

// core/generate/lecture.ts
export async function rewriteLecture(existing: LectureFile, instruction: string, pagesText: string | null, brief: Brief, model: ModelClient):
  Promise<{ lecture: LectureFile; changed: boolean }>;

// core/generate/refine.ts
export interface RefinePlan { summary: string /* <= 300 */; course: { title?: string; description?: string }; lectures: { slug: string; instruction: string /* <= 400 */ }[] }
export const refinePlanSchema: z.ZodType<RefinePlan>;
export interface LectureOutline { slug: string; title: string; summary: string; sections: { title: string; kinds: string[] }[] }
export function outlineOf(site: SiteData): LectureOutline[];
export async function planRefinement(note: string, site: SiteData, brief: Brief, model: ModelClient): Promise<RefinePlan>;

// core/generate/append.ts
export interface AppendPlan { lectures: PlannedLecture[]; restructure: { affected: string[]; reason: string } | null }
export const appendPlanSchema: z.ZodType<AppendPlan>;
export async function planAppend(materials: Material[], brief: Brief, site: SiteData, model: ModelClient): Promise<AppendPlan>;
```

- `appendLectures`: convert with `toLecture`; number after existing lectures; unique slugs (`-2`, `-3`…); rebuild `index` (`toIndexEntry`); if `site.exam` exists, add up to 3 quiz questions per new lecture with id `l<number>-<id>` (`finish.ts` rule). Existing lectures untouched; input never mutated.
- `replaceLectures`: replace matching `meta.slug` while keeping original `meta.number` and `meta.slug`; ignore unknown slugs; update `course.title` (1–120) and `course.description` (0–400) when given; rebuild `index`; leave `exam` unchanged.
- `rewriteLecture` (`TASK.refine = "TASK: refine-lecture"`): share validation/repair/drop/assemble helper with `writeLecture`. Prompt passes existing lecture JSON, instruction, and `pagesText` (if non-null); rules: `"Return the whole lecture in the same shape. Change only what the instruction asks. Keep every id."` plus (when `pagesText === null`) `"Use only facts that are already in this lecture."` Force `meta.number` and `meta.slug` from `existing`. No improvement call. On 2 non-JSON replies or nothing valid left, return `{ lecture: existing, changed: false }`.
- `planRefinement` (`TASK.refinePlan = "TASK: refine-plan"`): sees title, description, `outlineOf(site)`, and note; drops unknown/duplicate slugs and empty instructions; caps at `LIMITS.refineLectures`; trims lengths. If no lecture and no course field remains after 2 calls, throw `new Error("refine-empty")`.
- `planAppend` (`TASK.appendPlan = "TASK: append-plan"`): sees new material + existing lectures (slug, title, summary, topics); returns `{ lectures, restructure: { recommended, affected, reason } }`. Validate/slugify/number lectures after existing ones, cap at `Math.max(0, LIMITS.courseLectures - site.lectures.length)`. Keep `restructure` **only when** `recommended === true` and deduplicated known `affected` slugs have `>= 2` entries (else `null`). Two failed calls → throw `The course plan was invalid twice: …`.
- **Fake model:** `TASK.refinePlan` → 1 instruction on first lecture, summary `"Made the first lecture simpler."` (`[empty]` in note → empty object/lectures); `TASK.refine` → sets `meta.subtitle = "Refined"`; `TASK.appendPlan` → 1 lecture per new file, `restructure.recommended = true` with first 2 existing slugs only when material contains `[restructure]`.

Tests: `appendLectures` (numbering, slugs, exam quiz items, immutability); `replaceLectures` (keeps number/slug, ignores unknown, updates title); `rewriteLecture` (enforces slug/number, `changed: false` after 2 non-JSON calls, drops 1 invalid block); `planRefinement` (drops unknown, caps at 3, throws `refine-empty` on `[empty]`); `planAppend` (`restructure: null` on false / 1 slug / unknown slugs, kept on 2 valid slugs, caps 23 + 2 to 1).

Commit: `feat: rewrite lectures, plan added material, merge into a site`.

**After A7:** Push `TEMPLATE` `iteration-5`. In `PORTAL`: run `npm run sync:core`, run full checks (adjusting only test expectations affected by A5's fake model), commit `chore: sync vendored core from template <7-char sha>`, and open the Package A PR.

---

## Calls made / problems
