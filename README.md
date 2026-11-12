# Learning Playground Portal

Turn lecture slides or notes into an interactive study website, in English or Romanian.
A person uploads PDFs, text or Markdown; the portal plans the course, lets them review the outline,
writes every lecture with a language model, validates it, and **hosts the finished site itself** at
`/courses/<course>-<id>/`. Nothing is published to GitHub and no repository is created per course.

Live: <https://playground-portal-bay.vercel.app> (Vercel deploys `main` to production).

## How it works

```
Browser                                   Server (Next.js on Vercel)                  Storage (private Vercel Blob)
───────                                   ──────────────────────────                  ─────────────────────────────
1. pick PDF / .txt / .md
2. extract text in the browser
   (pdf.js); only text leaves the PC ───▶ POST /api/jobs  (access code, options,       jobs/<id>/brief.json
                                          text) → checks, daily limit, new job ─────▶  jobs/<id>/materials.json
3. job page polls and calls          ───▶ POST /api/jobs/<id>/advance  (one step      jobs/<id>/state.json
   "advance" until done                    per request, atomic claim)
      plan      model → course plan (lectures, page ranges, sections) ───────────────▶  jobs/<id>/plan.json
      review    PAUSE: user renames / removes lectures (PUT …/outline)
      lecture:n model → one lecture as JSON; every block validated, one repair ───────▶  jobs/<id>/lectures/n.json
                call, invalid blocks dropped, one "improve" call for thin lectures
      finish    validate the whole course, publish, delete the uploaded text ────────▶  courses/<key>/site.json + meta.json
4. "Open your site" → /courses/<key>/ ◀── rendered on demand by the shared template UI
   + a private edit link /manage/<token>
```

Key ideas:

- **Content is data, not code.** A course is strict, schema-validated JSON (`vendor/core`): lectures,
  concepts, quiz questions and 15 block kinds (prose, table, steps, timeline, formula, code, recall
  cards, practice, interactive widgets, and a sandboxed `custom` exercise). The model never writes
  React or routes. Invalid output is repaired once, then dropped, never published.
- **One renderer, two hosts.** The course UI and the generator live in
  [playground-template](https://github.com/Vlad-Andres/playground-template). The portal holds a vendored
  copy in `vendor/core` (`@core/*`) and `vendor/site` (`@site/*`), refreshed only by `npm run sync:core`
  from the sibling `../playground-template` checkout. Never edit `vendor/` by hand.
- **Jobs survive serverless limits.** A job advances one step per HTTP request. Each step takes an atomic
  claim (`store.create`) so two tabs cannot run it twice; a claim older than 330 s counts as abandoned,
  a step is retried up to 3 times, then the job fails with a stable error code. State is persisted after
  every step, so a user can close the tab and come back to the same link.
- **Budget guards.** Each job has a token budget (600k input / 120k output); limits on files (12), pages
  (400), characters (600k) and request size (4 MB); an access code; a daily job limit.

## Features

**For people creating a course**
- Landing page (`/`) with an animated background; builder at `/create`; job page at `/jobs/<id>`.
- English and Romanian everywhere (language switch in the top bar; stored in a cookie, URLs do not change).
- Options: site title, course language (9 languages), level, depth (cram / standard / deep), accent colour,
  quizzes, interactive widgets, exam mode, a short free-text context.
- Outline review before anything is written: rename or remove lectures.
- A private **edit link** (`/manage/<token>`) shown when the course is done: rename the site and lectures,
  change the description and accent colour, edit paragraph/note text, remove blocks or lectures, or delete
  the site. Changes are live at once. A wrong link is a plain 404.

**For people studying**
- Lectures with explanations, tables, worked steps, quizzes, flashcards, interactive exercises (ordering,
  matching, sorting, charts), a "difficult parts" review and an optional timed mock exam. Works on phones,
  light and dark mode. No account needed.

**For the owner** (`/admin`, English only; needs `ADMIN_TOKEN`)
- Pause generation, set the daily job limit, override the model, post an announcement (EN/RO).
- Edit any portal text in English and Romanian at `/admin/translations` (search, see the default, reset).
- Invite codes: create (shown once, stored only as a hash), disable, enable, delete.
- Overview: jobs today, all courses, tokens and an **estimated** cost, recent jobs with the invite code used.
- Take a course down: the page and its owner link return 404 immediately.

Users never see model names, token counts, costs, internal file names or stack traces; those stay in
server logs and on `/admin`.

## Routes

| Route | What |
| --- | --- |
| `/` | Landing page |
| `/create` | Upload form and options |
| `/jobs/<id>` | Progress, outline review, result and edit link |
| `/courses/<key>/…` | The published course (own CSP, Tailwind-styled template UI) |
| `/manage/<token>` | Owner editor (404 for any wrong token) |
| `/admin` | Owner dashboard (404 until `ADMIN_TOKEN` is set) |
| `/admin/translations` | Edit the portal's English and Romanian texts |
| `POST /api/jobs` | Create a job |
| `GET /api/jobs/<id>` | Public job state (progress, outline, result; no internals) |
| `POST /api/jobs/<id>/advance` | Run the next step |
| `PUT /api/jobs/<id>/outline` | Save the reviewed outline |
| `GET /api/cron/cleanup` | Daily cleanup, protected by `CRON_SECRET` (`vercel.json`, 03:00 UTC) |

Every API error is `{ "error": "<English sentence>", "code": "<code>" }`; the browser translates the code
(`generation-off`, `too-large`, `bad-request`, `wrong-code`, `daily-limit`, `bad-id`, `not-found`,
`wrong-state`, `bad-outline`, plus material codes `empty`, `too-many-files`, `too-many-pages`, `too-long`,
`scanned`). A failed job carries `course-too-big`, `plan-failed`, `lecture-failed`, `busy`, `material-gone`
or `step-failed`.

## Translations

Portal texts (not the course pages, which use the template's own UI) come from `messages/en.json` and
`messages/ro.json`, shipped with each deploy and loaded by `next-intl` (`i18n/request.ts`). The language is
a cookie, defaulting to the browser's language. On top of the shipped texts, the owner's overrides from
`/admin/translations` are applied on every request (cached, refreshed at once when saved). An override must
keep the same placeholders (`{max}`, plural forms) and tags (`<em>…</em>`) as the default, or it is refused.
A test fails when a key exists in one language but not the other. New texts still need a code change.

## Storage

One `Store` interface (`lib/jobs/store.ts`) with three adapters: Vercel Blob (production, private),
`.data/` files (local development), and an in-memory store (tests). There is no database.

| Key | Content | Lifetime |
| --- | --- | --- |
| `jobs/<id>/…` | brief, uploaded text, plan, lectures, state, claims | deleted after 7 days; the text is deleted when the course is published |
| `days/<YYYY-MM-DD>/<id>` | one marker per job, for the daily limit | 7 days |
| `courses/<key>/site.json`, `meta.json` | the course and its metadata (title, usage, owner hash) | kept until deleted |
| `owners/<sha256>.json` | owner-token lookup (only the hash of the token is stored) | with the course |
| `config/settings.json` | admin settings and hashed invite codes | kept |
| `config/messages.json` | text overrides from `/admin/translations` | kept |

A course key is `<slug>-<first 8 hex of the job id>`.

## Security

- **Two content security policies.** Portal pages: `default-src 'self'`, no eval. Course pages
  (`/courses/*`): the template's policy (in-browser PostgreSQL needs `wasm-unsafe-eval`), no framing.
- **Custom exercises** run only in `<iframe sandbox="allow-scripts">` with an opaque origin and no
  network or storage; they must also pass a static scan (`scanCustomHtml`) at generation time.
- **Secrets**: the owner token and invite codes are stored only as SHA-256 hashes and compared in constant
  time; `/admin` uses an `iron-session` cookie (8 h, httpOnly, sameSite strict); settings changes apply on the
  next request. The fake model only works outside production.
- Uploaded text is sent only to the model provider for generation, then deleted.

## Environment

Do not commit `.env.local`; see `.env.example`.

| Variable | Purpose |
| --- | --- |
| `PORTAL_ENABLE_GENERATION` | must be `true` to accept jobs |
| `PORTAL_ACCESS_CODE` | shared access code, 12+ characters (invite codes from `/admin` work too) |
| `PORTAL_DAILY_JOB_LIMIT` | jobs per UTC day, default `10` (overridable in `/admin`) |
| `GEMINI_API_KEY` | server-side model key |
| `GEMINI_MODEL` | model id, default `gemini-3.1-flash-lite` (overridable in `/admin`) |
| `BLOB_READ_WRITE_TOKEN` | private Vercel Blob store; without it local files are used |
| `CRON_SECRET` | protects the daily cleanup |
| `ADMIN_TOKEN` | password for `/admin`, 24+ characters; unset means `/admin` is a 404 |
| `PORTAL_FAKE_MODEL` | development only: deterministic fake model, no cost |

## Local development

```bash
npm install
BLOB_READ_WRITE_TOKEN= PORTAL_FAKE_MODEL=true PORTAL_ENABLE_GENERATION=true \
PORTAL_ACCESS_CODE=local-check-code-123 ADMIN_TOKEN=local-admin-token-0123456789 \
npm run dev
```

The values above are made up for local use. Open `/create`, add a text-readable file, enter the access
code, review the outline and build. Data goes to `.data/`.

```bash
npm run lint    # tsc --noEmit
npm test        # vitest
npm run build   # also copies the pdf.js worker and the in-browser PostgreSQL
npm run sync:core   # refresh vendor/ from ../playground-template
```

Stack: Next.js 16 (App Router), React 19, TypeScript, Zod 4, `next-intl`, `iron-session`,
`@paper-design/shaders-react`, Vercel Blob, Vitest.

## Deployment and monitoring

Vercel deploys `main` to production and every other branch to a preview (previews have no model key or
admin token). CI runs lint, build and `npm audit`. Create a **private** Blob store and connect it, set the
variables above for Production, and keep `PORTAL_ENABLE_GENERATION=false` until the access code and limits
are set. The server writes one JSON line per event to stdout (`job.step`, `job.failed`, `course.published`,
`course.updated`, `course.deleted`, `admin.login`, `request.error`, …) without material text, tokens or
codes; read them in the Vercel logs.
