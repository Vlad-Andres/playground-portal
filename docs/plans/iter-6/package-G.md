# Iteration 6 — Package G: The Demo Course (EN + RO)

> Read [`00-guidelines.md`](00-guidelines.md) first.
> **Scope:** `playground-template/examples/demo-energy/` (source notes only) and portal admin. Real-model runs need the owner's go-ahead (Package 0.3).

**Why:** visitors and TikTok viewers must see what *they* would get, made from notes like theirs, in their language, showing our strongest features. It doubles as the most visible quality check.

### G1: Write the source notes (can start now)

**Files:** `examples/demo-energy/notes-en.md`, `notes-ro.md` (our own text, no copied material).
- Topic (changed by the owner on 2026-11-14, was *Electricity basics: circuits and Ohm's law*): *Energy on the move: from Newton's cradle to the Tesla coil*, for ages 14–16. 3 lectures: (1) energy stores and the pendulum; (2) momentum and Newton's cradle; (3) resonance, induction, the transformer and the Tesla coil, with safety.
- Include on purpose: formulas with units (E_k, E_p, p, T, f, transformer ratio), tables (energy stores, elastic vs inelastic, transformer vs Tesla coil), procedures (measure a pendulum, build a mini cradle), worked examples with numbers — so the generator has reasons to produce a parameter explorer / function plot, steps, categorize, recall cards and enough quiz questions for the exam.
- Also on purpose, for model-written `custom` blocks: things that move and cannot be taught by a catalogue widget, described as rules, frame-by-frame motion and tables of values (pendulum energy bars, the cradle's "n balls in, n balls out", coupled pendulums trading energy, the Tesla coil cycle). The notes never instruct the generator; the material only makes a simulation the natural choice.
- The RO file is a faithful translation reviewed by the owner.
- **Commit:** `docs: demo source notes on energy, Newton's cradle and the Tesla coil`

### G2: Generate, score, fix

- After A–C are merged and deployed: create both courses on production with the real model at depth **deep** (custom blocks are allowed only at standard (1 per lecture) and deep (2)) (2 runs; at most 2 re-runs after fixes).
- Score each with the content-fit rubric; record in `notes/2026-11-real-run-scores.md`. Any criterion ≤ 3 → a template fix task, then re-run.
- Check the selling features on the result: exam exists, study next/due today work after a short study session, Ask AI cites sections, footer link present; the custom simulations run in the sandbox at 375 px and in dark mode.

### G3: Make them the demo

**Files:** `PORTAL` `lib/settings.ts` (`demoCourseKey: { en: string | null; ro: string | null }`), `app/admin/SettingsForm.tsx` (pick from existing courses, validated), tests.
- The landing (Package E) links to the demo matching the page language; no link when unset.
- **Commit:** `feat: admin picks the demo course per language`

**Owner action:** approve both courses as public demos; record 20–45 s screen captures from them for the landing and TikTok.
