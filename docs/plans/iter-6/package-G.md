# Iteration 6 — Package G: The Demo Course (EN + RO)

> Read [`00-guidelines.md`](00-guidelines.md) first.
> **Scope:** `playground-template/examples/demo-energy/` (source notes only) and portal admin. Real-model runs need the owner's go-ahead (Package 0.3).

**Why:** visitors and TikTok viewers must see what *they* would get, made from notes like theirs, in their language, showing our strongest features. It doubles as the most visible quality check.

### G1: Write the source notes (can start now)

**Files:** `examples/demo-energy/notes-en.md`, `notes-ro.md`.
- Topic (changed by the owner on 2026-11-14, was *Electricity basics: circuits and Ohm's law*): *Energy on the move: from Newton's cradle to the Tesla coil*, school level. 3 lectures: (1) mechanical energy and the pendulum; (2) momentum, collisions and Newton's cradle; (3) Faraday's law, alternating current, the transformer and the Tesla coil, with safety.
- Source (the owner asked for real lectures on 2026-11-14): adapted from Siyavula *Everything Science: Physical Sciences* — Grade 10 ch. 22, Grade 11 ch. 10, Grade 12 ch. 2 and ch. 11 — **CC BY 3.0**, which allows public use, changes and translation with credit. CK-12 and LibreTexts (non-commercial), OpenStax (no AI use) and Wikibooks (share-alike) were ruled out. The credit and the list of changes are at the top of both files; sections headed "Added for this course" (pendulum swing by swing, Newton's cradle up close, transformer, resonance and the Tesla coil) are ours, because the textbooks do not cover them.
- Kept on purpose: formulas with units, worked examples with numbers, a hands-on activity and a trolley experiment, so the generator has reasons to produce a parameter explorer / function plot, steps, recall cards and enough quiz questions for the exam. Removed: figures, videos, exercises, curriculum lists, impulse sections; figure-dependent sentences reworded; source typos fixed (two units, a LaTeX comment).
- For model-written `custom` blocks, the added sections describe motion as rules, frame-by-frame steps and tables of values (pendulum energy bars, "n balls in, n balls out", coupled pendulums trading energy, the Tesla coil cycle). The notes never instruct the generator.
- The RO file is a translation of the EN file, reviewed by the owner.
- **Owner action at G2:** check that the Siyavula credit appears on the generated course (CC BY requires it); if the generator drops it, add it with the course editor.
- **Commit:** `docs: demo source notes adapted from Siyavula (CC BY)`

### G2: Generate, score, fix

- After A–C are merged and deployed: create both courses on production with the real model at depth **deep** (custom blocks are allowed only at standard (1 per lecture) and deep (2)) (2 runs; at most 2 re-runs after fixes).
- Score each with the content-fit rubric; record in `notes/2026-11-real-run-scores.md`. Any criterion ≤ 3 → a template fix task, then re-run.
- Check the selling features on the result: exam exists, study next/due today work after a short study session, Ask AI cites sections, footer link present; the custom simulations run in the sandbox at 375 px and in dark mode.

### G3: Make them the demo

**Files:** `PORTAL` `lib/settings.ts` (`demoCourseKey: { en: string | null; ro: string | null }`), `app/admin/SettingsForm.tsx` (pick from existing courses, validated), tests.
- The landing (Package E) links to the demo matching the page language; no link when unset.
- **Commit:** `feat: admin picks the demo course per language`

**Owner action:** approve both courses as public demos; record 20–45 s screen captures from them for the landing and TikTok.
