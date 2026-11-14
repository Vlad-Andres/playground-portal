# Iteration 5 — Package B: Guided Creation in the Portal

> Read [`00-guidelines.md`](00-guidelines.md) first (especially G5, G6, G7, G8).
> **Scope:** `playground-portal` (`iteration-5`).

---

### Task B1: The step machine learns context, questions and design

**Files:** modify `lib/jobs/state.ts`, `lib/jobs/steps.ts`, `lib/api/handlers.ts`, `app/api/jobs/route.ts`, `components/create/Builder.tsx` (only send `request` — today's fields plus `locale` from `useLocale()` — instead of `brief`); create `app/api/jobs/[id]/answers/route.ts`, `app/api/jobs/[id]/design/route.ts`; delete `app/api/jobs/[id]/outline/`; tests. On `app/jobs/[id]/page.tsx`, temporarily point `"Build my site"` to `PUT …/design` with `choice: "recommended"` and read lectures from `design.options[0].lectures` until B3.

```ts
// lib/jobs/state.ts
export type JobKind = "create" | "refine" | "append" | "rebuild";
export type Step = "context" | "ask" | "design" | "review" | "expand" | `lecture:${number}` | "finish" | "done"
  | "refine-plan" | `refine:${number}` | "append-plan" | "choice";      // last four used in Package D
export interface JobState {
  /* every existing field */
  kind: JobKind;                                   // stored state without kind defaults to "create"
  waiting?: "answers" | "design" | "choice";       // set exactly while status === "awaiting-review"
}
```

Job files: `request.json`, `materials.json`, `context.json`, `brief.json`, `design.json` (`CourseDesign`), `plan.json`, `outline.json`, `lectures/<n>.json`.

Steps of a `create` job:
- `context`: `inferContext` → write `context.json`. No questions → write `brief.json` (`resolveBrief`), step `design`, `idle`. Questions → step `ask`, `awaiting-review`, `waiting: "answers"`.
- `ask`: waits for answers route.
- `design`: `designCourse` → write `design.json` and `plan.json` (`= recommended`), step `review`, `awaiting-review`, `waiting: "design"`, `lecturesTotal` = recommended lectures.
- `review`: waits for design route.
- `expand`: `expandOutline` with `outline.json` → write `plan.json`, step `lecture:1`, `idle`, `lecturesTotal` set.
- `lecture:n`, `finish`: as today.

Routes & handlers:
- `createJob(store, { request, materials }, now)` writes `request.json` and starts at `context`.
- `createJobHandler`: body `{ accessCode, request, materials }` validated with `requestSchema` (`bad-request`); `language` is `"auto"` or in `LANGUAGES`; `level` is `"auto"` or in `LEVELS`.
- `advance` returns early for `ask` and `choice` (as for `review`).
- **Old jobs:** stored step `"plan"` treated as `"design"`; missing `context.json` in `design` uses `defaultContext(brief, brief.title ?? "")`; job at `review` without `design.json` serves `plan.json` as recommendation with `alternatives: []`.
- `PUT /api/jobs/:id/answers`, body `{ answers: Record<string, string> }` (strict, `<= 4` keys): requires `waiting === "answers"` (else `wrong-state` 409); `answerContext` (`!ok` → `bad-answer` 400); writes `context.json` + `brief.json`, step `design`, `idle`, clears `waiting`.
- `PUT /api/jobs/:id/design`, body `{ choice: "recommended" | "alt-1" | "alt-2", keep: string[], titles: Record<string, string> }` (today's `outlineSchema` limits): requires `waiting === "design"` (else `wrong-state` 409). Validates `keep`/`titles` against chosen design's slugs (unknown slug / nothing kept / unknown choice → `bad-design` 400). `recommended` → write updated `plan.json`, step `lecture:1`; alternative → write updated outline to `outline.json`, step `expand`. Both set `idle`, `lecturesDone: 0`, `attempts: 0`, clear `waiting`.
- `PublicJob` / `getJobHandler`: add `kind` and `waiting`; replace `outline` with:
  ```ts
  questions?: ContextQuestion[];                 // only while waiting === "answers"
  design?: {                                      // only while waiting === "design"
    language: string; level: string; subject: string; goals: string[]; assumptions: string[];
    options: { id: "recommended" | "alt-1" | "alt-2"; approach: string; why: string;
               lectures: { slug: string; title: string; summary: string; forms: string[] }[] }[];
  }; // forms: distinct block kinds of lecture sections (first 4) for recommended; [] for alternatives
  ```
- New error codes in `messages/{en,ro}.json` under `errors`: `bad-answer` (400), `bad-design` (400). (`plan-failed` covers `design` and `expand`.)

Tests: clear-language + note goes `context → design → review` with `brief.json`; mixed fixture stops at `ask`, wrong answer → `bad-answer`, valid answer continues; `[ask-focus]` stops at `ask` only when note is empty; accepting `recommended` with rename/remove updates `plan.json` and enters `lecture:1`; choosing `alt-1` on `[alternatives]` runs `expand → lecture:1` with alt titles; `alt-2` when absent → `bad-design`; design route in wrong state → `wrong-state`; legacy `plan` step with `brief.json` reaches `review`; `publicJob` omits `request`, `brief`, note, `usage`; full job finishes `done`.

Commit: `feat: jobs infer context, ask, and present a design`.

---

### Task B2: A builder that asks for almost nothing

**Files:** `components/create/Builder.tsx`, `messages/en.json`, `messages/ro.json`, CSS module.

Show: file picker; one optional note textarea (`create.note`: EN `"Anything we should know? (optional)"` / RO `"Ceva ce ar trebui să știm? (opțional)"`) bound to `request.context`; access code; submit button. Below, a closed `<details>` `"Advanced"` / `"Avansat"` containing: course language (first option `"Automatic"`, value `"auto"`, default), level (first option `"Automatic"`, default), depth, accent colour, and the three switches. `locale` = `useLocale()`.

Helper line under files (`create.autoHint`): EN `"We work out the language, the level and the structure from your files. You confirm the structure before anything is written."` / RO `"Stabilim limba, nivelul și structura din fișierele tale. Confirmi structura înainte să fie scris ceva."`

Check by hand: desktop & 375 px, EN & RO, keyboard only; `"Advanced"` closed by default; submitting only files + code starts a job.

Commit: `feat: the builder asks only for files and a note`.

---

### Task B3: Questions and the design screen

**Files:** create `components/job/Questions.tsx`, `components/job/DesignPreview.tsx`, `components/job/job.module.css`; modify `app/jobs/[id]/page.tsx`, messages.

- `phaseOf`/`PHASES`: `context` (`"Read your material"` / `"Citim materialul"`), `design` (steps `ask`, `design`, `review`, `expand`: `"Design the course"` / `"Proiectăm cursul"`), `lectures`, `finish`, `done`. Keep polling unchanged.
- `Questions` (`job.questions`): one `<fieldset>` per question with radios:
  - `language`: `"Your files use more than one language. Which one should the course be in?"` / `"Fișierele tale sunt în mai multe limbi. În ce limbă să fie cursul?"`
  - `focus`: `"What should this course focus on?"` / `"Pe ce să se concentreze cursul?"` + extra radio `"Let the AI decide"` / `"Lasă AI-ul să decidă"` (`value="skip"`, default).
  - `"Continue"` / `"Continuă"` sends `PUT …/answers`.
- `DesignPreview` (`job.design`):
  1. Summary `"<subject> · <language name> · <level>"`, goals list under `"After this course you can"` / `"După acest curs poți"`, assumptions (if any) under `"We assumed"` / `"Am presupus"`.
  2. Radio cards per option (visible selected state; first badge `"Recommended"` / `"Recomandat"`): translated approach (`follow-source`: `"Follows your files"` / `"Urmează fișierele tale"`; `by-topic`: `"Grouped by topic"` / `"Grupat pe teme"`; `problem-first`: `"Starts from problems"` / `"Pornește de la probleme"`; `exam-focused`: `"Built for the exam"` / `"Construit pentru examen"`; `timeline`: `"In time order"` / `"În ordine cronologică"`), `why`, lecture count, and compact diagram (lecture number, title, and form chips for `recommended`).
  3. Below cards: selected option's lecture list with rename input + `"Remove"` checkbox.
  4. `"Build this course"` / `"Construiește cursul"` sends `PUT …/design` (disabled when 0 lectures kept).

Check by hand (fake model markers): plain file → 1 card; `[alternatives]` → 2 cards, second builds 1-lecture course; `[ask-focus]` + empty note → focus question; mixed fixture → language question; desktop & 375 px, EN & RO, keyboard only, 120-char title does not overflow.

Commit: `feat: questions and design preview before the course is written`.

---

### Task B4: Honest progress with jokes you can switch off

**Files:** create `components/job/Waiting.tsx`; modify `app/jobs/[id]/page.tsx`, messages, CSS module.

- While `status` is `idle` or `working`: show real progress bar (`lecturesDone / lecturesTotal` during lecture steps; indeterminate before that) + step label. Never invent percentages or countdowns.
- Below it: one line from `job.waitingLines` rotating every 6 s in order (`aria-live="off"`), plus toggle `"Hide the jokes"` / `"Ascunde glumele"` storing `pg-jokes-off = "1"` in `localStorage` (wrapped in `try/catch`); when hidden, show `"Show the jokes"` / `"Arată glumele"`. Hide lines when waiting on user, done, or failed.
- Top-bar note: `"You can close this page. We keep working and the link stays valid."` / `"Poți închide pagina. Lucrăm în continuare, iar linkul rămâne valabil."`
- `job.waitingLines` array in `messages/{en,ro}.json` (update `tests/messages.test.ts` to compare arrays by index):
  1. `"Highlighting everything in yellow, just like you did."` / `"Subliniem totul cu galben, exact ca tine."`
  2. `"Asking the slides what they really meant."` / `"Întrebăm slide-urile ce au vrut, de fapt, să spună."`
  3. `"Turning 80 slides into something a human can survive."` / `"Transformăm 80 de slide-uri în ceva la care se poate supraviețui."`
  4. `"Writing quiz questions. Yes, that one will be on the exam."` / `"Scriem întrebări de test. Da, aceea chiar pică la examen."`
  5. `"Pretending to understand page 47. Then actually understanding it."` / `"Ne prefacem că înțelegem pagina 47. Apoi chiar o înțelegem."`
  6. `"No, we can't sit the exam for you. We asked."` / `"Nu, nu putem da examenul în locul tău. Am întrebat."`
  7. `"Still faster than rewriting your notes the night before."` / `"Tot mai rapid decât să-ți rescrii notițele în noaptea dinainte."`
  8. `"Removing the sentence your professor repeated on every slide."` / `"Scoatem fraza pe care profesorul a repetat-o pe fiecare slide."`

Check by hand: bar advances with lectures; reload preserves progress and joke preference; reduced motion disables slide/fade.

Commit: `feat: honest progress and optional waiting jokes`.

---

### Task B5: Preview the finished course and grow into it

**Files:** create `components/job/CoursePreview.tsx`; modify `app/jobs/[id]/page.tsx`, `lib/security-headers.ts`, `tests/course-routes.test.ts`, messages, CSS module.

- `courseContentSecurityPolicy`: change `frame-ancestors 'none'` to `frame-ancestors 'self'`. Keep `'none'` in the portal policy (assert both in tests).
- `CoursePreview` (done view, above edit-link box): `<iframe src={job.siteUrl}>` with `title` `"Preview of your course"` / `"Previzualizarea cursului tău"`, `loading="lazy"`, `tabIndex={-1}`, `pointer-events: none`, 16:10 rounded frame, alongside `<a href={siteUrl}>` `"Open your site"` / `"Deschide site-ul"`.
- On unmodified click with motion allowed: animate frame to `position: fixed; inset: 0` over 400 ms then `window.location.assign(job.siteUrl)`. Reduced motion or modifier-click: navigate normally without animation. No auto-redirect.

Check by hand (`npm run build && npx next start -p 3100`): preview renders real course home; zero CSP errors on job or course pages; `[custom]` exercise still runs; dark mode & 375 px clean.

Commit: `feat: preview the course and expand into it`.

---

## Calls made / problems
