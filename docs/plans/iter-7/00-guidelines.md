# Iteration 7 — Landing Showcase: Shared Guidelines

**Status:** Draft, written 2026-11-14 — awaiting the owner's approval. Not started.
**Start gate — do NOT start a code package until all are true:**
1. Iteration 6 packages G (demo courses, incl. G3 demo keys) and E (landing in the new design) are merged.
2. Package V3 (course screens in the new design) is merged, so the recording shows the final course look.
3. The owner says in chat `"start iteration 7"` (or names a single package).

**Goal:** a visitor who has never heard of us — typically arriving from TikTok on a phone — understands in under 40 seconds how easy it is (drop notes → course) and exactly what they would get (a real course with interactive parts, quizzes, recall, a practice exam and Ask AI). The landing hero becomes a short recorded walkthrough of the **real demo course**, shown in a small phone-shaped element.

**Package order:**

| Order | Package | Repo | Can run in parallel with |
| --- | --- | --- | --- |
| 0 | Owner gate (below, no code) | — | — |
| 1 | [`package-A.md`](package-A.md) — scripted walkthrough and recording | `PORTAL` (`scripts/showcase/`) | B1 (Figma) |
| 2 | [`package-B.md`](package-B.md) — showcase in the landing hero | Figma, then `PORTAL` | A (design part only) |

**Branches:** `PORTAL`: `iteration-7` from `origin/main`. One package = one PR. No `TEMPLATE` changes are expected; if the recording exposes a course bug, fix it in the template as its own small PR and re-sync as usual.

---

## Owner gate (package 0)

- [ ] Approve this plan and the storyline below.
- [ ] Confirm both demo courses (EN, RO) are approved as public demos and their keys are set in admin (iteration 6, G3).
- [ ] Go-ahead for **one real Ask AI call per language** to capture the answer used in beat 7 (A2). Re-recordings replay the captured answer; they do not call the model again.
- [ ] Approve the showcase frames in Figma (B1).

---

## Decisions (do not reopen without the owner)

| Topic | Decision |
| --- | --- |
| Audience | Cold visitors from TikTok, on a phone. Design for 375 px first, then 1280 px. |
| Content source | Only the **real** iteration 6 demo course (*Electricity basics: circuits and Ohm's law*), EN and RO. No invented screens, no hand-made mock-ups, no fake-model output on screen. |
| Medium | A **scripted, repeatable recording**: a Playwright script drives the demo course like a user would, the browser's video is captured and encoded into a small looping MP4/WebM. Re-recording after a design change is one command, not a new screen-capture session. |
| Playback | Muted, looping, `playsinline`, autoplays when in view. A visible pause/play control (WCAG 2.2.2). With `prefers-reduced-motion`, show the poster and a play button instead of autoplay. |
| Interactivity | A **chapter rail** next to (desktop) or under (mobile) the video lists the beats; the current beat is highlighted as the video plays, and tapping a beat jumps to it. This gives "go back and forth" without a scroll-scrubbed video. |
| Not scroll-scrubbing | Rejected for now: smooth scrubbing needs every frame to be a keyframe (files several times larger, against the Lighthouse ≥ 90 target) and stutters on iOS Safari. Can be revisited after launch with real traffic numbers. |
| Hosting | Video, poster and chapter files are static files in `public/showcase/<lang>/`, served from our own origin. The current CSP (`default-src 'self'`) already allows them; no header change. |
| Honest labels (H2 from iteration 6) | The build step is shown as a cut with "A few minutes later", never as a real-time claim. A caption says "A real course, made from our sample notes". No "in N minutes" claim until median build time has been measured on real runs (B3). Forbidden words from iteration 6 H2 still apply. |
| End of the showcase | The hero CTAs under the video: **"Try the demo course"** (always; opens the demo in the page language, G3) and **"Create yours"** (goes to `/create`; while creation is invite-only, the iteration 6 beta notice stays next to it). No waitlist or email capture in this iteration. |
| When TikTok traffic is sent here | Unchanged from iteration 6 Package R: TikTok marketing starts only after the beta review chooses to open public creation. This iteration builds the showcase so it is ready by then. |
| Reuse for marketing | The recording is captured at a 9:16 phone viewport so the same run can later be exported for TikTok. TikTok export, music and voice-over are **not** part of this iteration. |

---

## The storyline (approved scenario)

One continuous phone-sized walkthrough of the demo course, about 35–40 s, looping. Every screen is the real product; the script only taps, types and scrolls. A small tap indicator (script-only, never shipped in the product) shows where the "finger" touches.

| Beat | Time (approx.) | What the viewer sees | Chapter label (EN) |
| --- | --- | --- | --- |
| 1 | 0–4 s | The create screen: the demo notes PDF is dropped in, the file shows as ready, "Build" is tapped. A full-screen card "A few minutes later…" covers the cut. | Drop your notes |
| 2 | 4–8 s | The finished course home: three lectures, *Study next* and *Due today* filled from a short earlier study session. | Your course |
| 3 | 8–14 s | The most impressive interactive piece the demo has — ideally an Ohm's law explorer where a slider changes voltage and the current updates. If the generated course has none, the best other interactive widget it does have. | Try it |
| 4 | 14–21 s | A quiz question: an answer is tapped, the explanation appears, the "Source: Lecture 02" link is visible. | Quiz with reasons |
| 5 | 21–25 s | A recall card: the prompt, a short pause ("think first"), then the answer is revealed. | Recall |
| 6 | 25–31 s | The practice exam: the clock is running, a few answers are given, it is submitted, and the result shows a score per lecture. | Practice exam |
| 7 | 31–37 s | Ask AI: a question is typed, the answer appears with a link to its course section, the link is tapped and the page jumps there. | Ask AI |
| — | loop | The video loops back to beat 1. The CTAs live in the page, not in the video. | — |

The order follows the visitor's journey (easy first, then what you get) rather than starting with the flashiest feature: "it's easy" is half the message. The time column is a target; the script measures the real start of each beat and writes it to the chapter file.

---

## Technical guidelines

Iteration 5 G1–G8 and iteration 6 H1–H5 still apply. Additionally:

### S1. Recording is tooling, not product
`scripts/showcase/` runs only on a developer machine. Nothing under it is imported by `app/`, `components/` or `lib/`. The tap indicator, the cut card and any timing helpers are injected into the recording browser only.

### S2. No secrets or real keys in the repo
The demo course URL/key, base URL and invite code are passed as CLI arguments or read from the developer's environment at run time. They are never written into scripts, committed files or logs. Captured network data (A2) stays in the git-ignored `scripts/showcase/.cache/`.

### S3. Size budget
Per language: MP4 (H.264) ≤ 2 MB and WebM (VP9) ≤ 1.5 MB for ~40 s; poster ≤ 60 KB. The video is not fetched before first paint (`preload="none"`, loaded when in view). The poster, not the video, is the hero's largest paint.

### S4. Both languages
Two recordings (EN demo course with EN UI, RO demo course with RO UI). The chapter labels, cut card text and captions are message keys in `messages/{en,ro}.json`; the landing picks the files for the page language.
