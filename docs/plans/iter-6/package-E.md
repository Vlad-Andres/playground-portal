# Iteration 6 — Package E: Landing and Create Flow in the New Design

> Read [`00-guidelines.md`](00-guidelines.md) first (H2, H4, H5) and [`package-V.md`](package-V.md).
> **Scope:** `playground-portal` (`iteration-6-visual`). Needs: V1 approved, V2 tokens merged, G3 demo keys set.

### E1: Landing

**Files:** `app/page.tsx`, `app/landing.module.css`, `components/landing/*`, `messages/{en,ro}.json`, tests.
- Build *01 · Landing / desktop* and *04 · Landing / mobile* as approved. The course mock-up uses a real screenshot or a live, read-only render of the demo course — never invented content.
- "Explore a demo" opens the demo for the current language (G3); hidden when unset.
- Beta notice: "Free during the beta — ask us for an invite code" with a contact link.
- Tests: no forbidden words (H2), demo CTA absent when unset, EN/RO keys equal.
- **Commit:** `feat: Study with AI landing page`

### E2: Create flow

**Files:** `components/create/Builder.tsx` (split into step components if it helps), `app/create/page.tsx`, `app/jobs/[id]/page.tsx`, messages, tests.
- Frames *02 · Create / materials* and *03 · Create / outline*: three-step rail, drop zone with per-file status, "A little direction" (exam date, level, language — all optional), invite code, rights checkbox (D2), then outline review and build progress with the share card at the end.
- Existing behaviour and API calls stay identical; this is a layout change. All current create/job tests stay green.
- **Commit:** `feat: create flow in the new design`

**Check by hand:** full fake-model flow EN and RO at 375 px and 1280 px; Lighthouse mobile performance ≥ 90 on the landing.
