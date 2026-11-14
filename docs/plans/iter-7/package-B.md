# Iteration 7 — Package B: Showcase in the Landing Hero

> Read [`00-guidelines.md`](00-guidelines.md) first (decisions, S3, S4) and iteration 6 [`package-E.md`](../iter-6/package-E.md) (the landing this changes).
> **Scope:** Figma (B1), then `playground-portal` (`iteration-7`). Needs: A3 files committed.

### B1: Showcase frames in Figma (owner + agent, before any build)

In the *Learning Playground — Website Concept* file, next to the approved landing frames:
- **Landing / mobile — showcase hero:** short headline + one line, the phone-shaped video frame, the chapter rail under it, then the two CTAs and the beta notice. The CTAs must stay reachable without a long scroll at 375 × 812 (the video frame may shrink to make room).
- **Landing / desktop — showcase hero:** text and CTAs on the left, phone frame on the right (where the iteration 6 course mock-up sat), chapter rail beside the phone.
- States: playing (current chapter highlighted), paused, reduced motion (poster + play button), video missing (falls back to the iteration 6 hero).
- Caption under the frame: "A real course, made from our sample notes."
- Romanian copy check for the chapter labels and caption.
- Done when the owner marks the frames "approved for build".

### B2: Showcase component

**Files:** `components/landing/Showcase.tsx`, `components/landing/showcase.module.css`, `lib/showcase.ts` (load and validate `public/showcase/<lang>/chapters.json`), `app/page.tsx`, `app/landing.module.css`, `messages/{en,ro}.json`, tests.
- Replaces the iteration 6 hero course mock-up with the approved B1 frames. The rest of the landing stays as built in iteration 6 E1.
- `<video muted loop playsinline preload="none" poster=…>` with WebM and MP4 sources for the page language; starts loading and playing when it scrolls into view (IntersectionObserver), pauses when it leaves.
- Pause/play button with an accessible label; `prefers-reduced-motion: reduce` → no autoplay, poster + play button.
- Chapter rail: a list of buttons from `chapters.json` with labels from `landing.showcase.chapters.*`; the current chapter follows `timeupdate`; tapping a chapter seeks to its start and plays.
- CTAs under the showcase: "Try the demo course" (demo URL for the page language from settings; hidden when unset, as in iteration 6 E1) and "Create yours" with the beta notice.
- If `chapters.json` is missing or invalid for the language, render the iteration 6 hero unchanged.
- Uses design tokens only (iteration 6 H4).
- Tests: renders the poster and both sources for EN and RO; chapter buttons in storyline order; clicking a chapter sets `currentTime`; reduced motion → no `autoplay`; missing/invalid chapters → fallback hero; demo CTA hidden when unset; EN/RO keys equal; no forbidden words.
- **Commit:** `feat: demo course showcase in the landing hero`

### B3: Build-time claim (optional, only with data)

**Files:** `docs/notes/2026-<MM>-build-times.md`, then messages if a claim is added.
- From real generations only (iteration 6 G2 runs plus beta jobs in `/admin`), record median and 90th-percentile time from "Build" to a finished course, with the number of runs.
- Only if the 90th percentile supports it, the owner may approve a line such as "Usually ready in about N minutes". Otherwise no time claim.
- **Commit:** `docs: measured course build times` (and `feat: build time line on the landing` if approved)

**Check by hand:** EN and RO at 375 px and 1280 px, light and dark page (the video itself is light): autoplay in view, pause, chapter jumps, reduced motion, fallback with the files removed. Lighthouse mobile performance ≥ 90 on the landing, and the network panel shows no video bytes before the showcase is in view. `npm run build` passes (the task touches the landing route and static assets).
