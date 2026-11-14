# Iteration 6 — Package G: The Demo Course (EN + RO)

> Read [`00-guidelines.md`](00-guidelines.md) first.
> **Scope:** `playground-template/examples/demo-electricity/` (source notes only) and portal admin. Real-model runs need the owner's go-ahead (Package 0.3).

**Why:** visitors and TikTok viewers must see what *they* would get, made from notes like theirs, in their language, showing our strongest features. It doubles as the most visible quality check.

### G1: Write the source notes (can start now)

**Files:** `examples/demo-electricity/notes-en.md`, `notes-ro.md` (our own text, no copied material).
- Topic: *Electricity basics: circuits and Ohm's law*, for ages 14–16. 3–4 pages, 3 lectures: (1) charge, current and voltage; (2) resistance and Ohm's law V = I·R with worked numbers; (3) series vs parallel circuits and safety.
- Include on purpose: a formula with units, a small table (conductors vs insulators), a procedure (building a circuit), a comparison (series vs parallel), 2–3 worked examples with numbers — so the generator has reasons to produce a parameter explorer / function plot, steps, categorize, recall cards and enough quiz questions for the exam.
- The RO file is a faithful translation reviewed by the owner.
- **Commit:** `docs: demo source notes on circuits and Ohm's law`

### G2: Generate, score, fix

- After A–C are merged and deployed: create both courses on production with the real model (2 runs; at most 2 re-runs after fixes).
- Score each with the content-fit rubric; record in `notes/2026-11-real-run-scores.md`. Any criterion ≤ 3 → a template fix task, then re-run.
- Check the selling features on the result: exam exists, study next/due today work after a short study session, Ask AI cites sections, footer link present.

### G3: Make them the demo

**Files:** `PORTAL` `lib/settings.ts` (`demoCourseKey: { en: string | null; ro: string | null }`), `app/admin/SettingsForm.tsx` (pick from existing courses, validated), tests.
- The landing (Package E) links to the demo matching the page language; no link when unset.
- **Commit:** `feat: admin picks the demo course per language`

**Owner action:** approve both courses as public demos; record 20–45 s screen captures from them for the landing and TikTok.
