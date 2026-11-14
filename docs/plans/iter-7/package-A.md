# Iteration 7 — Package A: Scripted Walkthrough and Recording

> Read [`00-guidelines.md`](00-guidelines.md) first (storyline, S1–S4).
> **Scope:** `playground-portal` (`iteration-7`), `scripts/showcase/` and `public/showcase/`. Needs: owner gate done, demo courses live (iteration 6 G3), course screens in the new design (iteration 6 V3).
> **New dev dependencies (allowed for this package only):** `playwright` (browser automation and video capture), `ffmpeg-static` (encoding without a system ffmpeg).

### A1: Walkthrough script

**Files:** `scripts/showcase/record.ts`, `scripts/showcase/beats.ts`, `scripts/showcase/overlay.ts`, `package.json` (script `showcase:record`), `.gitignore` (`scripts/showcase/.cache/`), tests.
- `npm run showcase:record -- --lang en --course-url <demo course URL> --create-url <local /create URL> --notes <path to demo notes PDF>`; all values from arguments or environment (S2).
- Viewport 390 × 844, device scale factor 2, light mode, the page language's locale.
- **Warm-up (not recorded):** in a separate context, open the demo course, answer a few quiz questions and mark one section difficult, then save the browser storage state so beat 2 shows real *Study next* and *Due today* (data is browser-only, iteration 6 H1).
- **Recorded run:** a context with that storage state and Playwright video capture. Each beat in `beats.ts` is one function that waits on selectors (no fixed sleeps except deliberate "reading" pauses) and returns when its screen has settled. The script stores each beat's real start time.
- Beat 1 runs against the **local** portal create screen with `PORTAL_FAKE_MODEL=true` and a test invite code from the project's seed/fixture files, and stops right after "Build" is tapped — no fake-model output is ever on screen. `overlay.ts` then shows the "A few minutes later…" card (text from the message files) while the page switches to the real demo course.
- `overlay.ts` also adds the tap indicator: a small circle that appears at each tap point for ~300 ms.
- Beat 3 picks the widget by a list of preferred selectors (parameter explorer → function plot → steps → categorize) and logs which one it used.
- Tests (vitest): beat list matches the storyline order; chapter output matches the schema in A3; nothing under `app/`, `components/` or `lib/` imports from `scripts/showcase/`.
- **Commit:** `feat: scripted showcase walkthrough of the demo course`

### A2: Ask AI capture and replay

**Files:** `scripts/showcase/record.ts`, `scripts/showcase/askai.ts`, tests.
- `--capture-ask-ai`: runs beat 7 once against the real assistant (owner go-ahead, one call per language) and saves the request/response to `scripts/showcase/.cache/ask-ai-<lang>.har`.
- Normal runs replay that file with Playwright's HAR routing, so re-recording never calls the model. If the file is missing, the script stops with a clear message instead of calling the model.
- The question asked is fixed per language in `askai.ts` and answerable from lecture 2 (e.g. "Why does a longer wire have more resistance?").
- **Commit:** `feat: replay a captured Ask AI answer in the showcase`

### A3: Encode and publish files

**Files:** `scripts/showcase/encode.ts`, `public/showcase/{en,ro}/showcase.mp4`, `showcase.webm`, `poster.jpg`, `chapters.json`, tests.
- Trim the recording to the first beat's start, then encode with `ffmpeg-static`: H.264 MP4 and VP9 WebM at 390 px CSS width × 2, no audio track, `+faststart`; poster = a frame from beat 2 (course home).
- `chapters.json`: `{ "version": 1, "duration": number, "chapters": [{ "id": "drop" | "course" | "try" | "quiz" | "recall" | "exam" | "askai", "start": number }] }` — seconds, ascending, measured by A1.
- Fail the run if a file is over the S3 budget, and say by how much.
- Tests: schema validation of both committed `chapters.json` files; ids in storyline order; sizes within budget.
- **Commit:** `feat: showcase recordings for EN and RO`

**Check by hand:** watch both videos end to end: no fake content, no loading spinners left on screen, tap indicator visible, cut card in the right language, Ask AI link jumps to the right section, loop point is clean. Record which beat-3 widget was used in `Calls made / problems` if it is not the parameter explorer.
