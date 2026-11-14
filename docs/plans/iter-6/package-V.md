# Iteration 6 — Package V: Visual Redesign (Figma first, then build)

> Read [`00-guidelines.md`](00-guidelines.md) first (H4, H5).
> **Source:** Figma file *Learning Playground — Website Concept* (owner's file, key `vUrnm0qlaa1l3Uldahthu5`). Agents can only read it when the owner shares edit access with the Figma connector or exports frames; otherwise work from exported PNGs the owner places in chat.

## What the concept already has (2026-11-14)

Four frames on one page:
1. **01 · Landing / desktop** — wordmark `study / with ai`, tagline "The study space your notes deserve.", nav (The experience, How it works, Start free). Hero "Make your notes worth *revisiting.*", sub-copy, CTAs "Create your course" + "Explore a demo", note "First course free · PDF / TXT / Markdown · No account required for learners". A live-looking course mock-up on the right (sidebar of lectures, quiz card with explanation, source label "Lecture 02, p. 14"). Lime band "READ IT. RECALL IT. TRY IT. REVISIT IT." Dark section "Less passive reading. More 'I've got this.'" with three cards (recall · quiz with explanation · timed practice exam `20:00`). "Bring the notes. Make them yours." three-step section.
2. **02 · Create / materials** — three-step wizard rail (01 Materials · 02 Outline · 03 Build), "Start with what you already have.", drop zone, file list, "A little direction" panel (exam date, level, language).
3. **03 · Create / outline** — outline review step.
4. **04 · Landing / mobile**.

Visual language: cream background, navy ink, lilac and lime accents, coral for the exam, a grotesk sans with an italic serif accent word.

## V1 — Refine in Figma (owner + agent, before any build)

Done when the owner marks the file "approved for build". Checklist:
- [ ] **Replace Data Intensive Systems content** in every mock-up with the demo topic (Electricity basics, Ohm's law) so screenshots, Figma and demo match.
- [ ] **Fix copy that over-promises** per H2: "Get a final grade" on the exam card → "Practice under time pressure"; "No account required for learners" stays; "First course free" → "Free during the beta — invite code".
- [ ] **Add course screens** (desktop + 375 px): course home with *Study next*, *Due today*, exam history (Package B); lecture page with Ask AI answer showing section links; practice-exam result with per-lecture breakdown.
- [ ] **Add flow screens:** create step 3 (build progress), finished screen with the share card (D1), group-limit and error states, privacy page layout.
- [ ] **Mobile** for create materials, outline and course home.
- [ ] **Dark mode** variants for the course screens (courses support dark mode today).
- [ ] **Romanian copy check**: longest RO strings fit buttons and the hero.
- [ ] **Styles as variables**: colours, type scale, spacing, radii defined as Figma variables so H4 tokens map 1:1.
- [ ] Decide what to reuse from the `landing-polish` branch (Package 0.5).

## V2 — Tokens (build)

**Files:** `PORTAL` `app/globals.css` (or a new `app/tokens.css`), `TEMPLATE` theme file used by `src/lib/theme.ts`; tests snapshot the token list.
- One CSS custom property per Figma variable, light and dark. No component changes yet.
- **Commit:** `feat: design tokens from the Study with AI concept`

## V3 — Course screens in the template

**Files:** `TEMPLATE` `src/screens/*`, `src/components/{home,layout,lecture}/*`, `src/widgets/core/MockExam.tsx`.
- Restyle course home, lecture, quiz, exam and the B features to the approved frames. Behaviour unchanged; existing tests stay green; add visual checks by hand at 375/1280, light/dark.
- **Commit:** `feat: course screens in the new design`

## V4 — Portal screens

Landing and create flow are built in **Package E** (they also need the demo). V4 covers the remaining portal screens: top bar, `/my`, job progress page, share card, privacy/terms layout, admin left as is.
- **Commit:** `feat: portal screens in the new design`

**Order:** V1 can start now. V2 after V1 approval. V3 after Package B is merged (so the new features are restyled once). V4 after D.
