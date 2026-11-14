# Study with AI — launch plan review

> **Status (2026-11-14):** background document. For the closed beta, [`plans/iter-6/00-guidelines.md`](../plans/iter-6/00-guidelines.md) decides; items it defers stay here for the public launch.

**Status:** Draft for owner review  
**Date:** 14 November 2026  
**Companion document:** [Product requirements](prd.md)

## Verdict

The colleague's plan identifies a useful outcome: turn course material into a study experience that students use, revisit, and share. Its feature roadmap needs to be grounded in the prototype. Several proposed differentiators already exist, while open public creation, measurement, and a trustworthy public demonstration are the more immediate gaps. No student interviews or usage baseline were supplied, so demand, conversion, retention, and pricing claims remain hypotheses.

This review is based on the checked-out `playground-portal` and its vendored course renderer on 14 November 2026. The production URL could not be reached from this session, so deployment state, actual latency, live configuration, and visual quality remain unverified.

## What the prototype already does

| Plan item | Repository evidence | Refined conclusion |
| --- | --- | --- |
| Upload, outline, course generation | `components/create/Builder.tsx`, `app/jobs/[id]/page.tsx`, `lib/jobs/steps.ts` | Existing end-to-end flow; validate reliability with users before redesigning it. |
| Public course link without learner sign-in | `app/courses/[key]/`, `lib/sites/publish.ts` | Existing. A course URL grants access to its content; treat it as unlisted, not private. |
| Quizzes, flashcards, exercises | `vendor/site/components/content/BlockRenderer.tsx`, `vendor/core/generate/prompts.ts` | Existing. Test usefulness and generated quality instead of listing these as new features. |
| Timed mock exam | `vendor/site/widgets/core/MockExam.tsx`, `vendor/core/generate/finish.ts` | Existing, but exam mode is optional under Advanced and off by default in the creator form. Its launch visibility is a product gap. |
| Difficult-parts revision | `vendor/site/components/difficult/DifficultHub.tsx`, `vendor/site/hooks/useDifficult.ts` | Existing manual flagging and scheduled review. The proposed automatic weakness detector is a distinct, unvalidated feature. |
| Source traceability | `vendor/core/generate/prompts.ts`, `vendor/site/components/content/BlockRenderer.tsx` | Generated blocks can show source file/page labels. This is useful but does not prove factual correctness or provide a full source viewer. |
| Course Q&A | `vendor/site/components/assistant/ConnectForm.tsx`, `ChatPanel.tsx` | Existing course assistant asks learners to supply a provider key and displays model/provider names. This conflicts with the workspace's learner-facing rules; it is **not launch-ready** as a Study with AI tutor. |
| Access control and cost controls | `components/create/Builder.tsx`, `lib/api/handlers.ts`, `lib/guard.ts`, `lib/settings.ts` | Creation currently requires an access code. Global daily, signed-in daily, guest-browser, and per-job token limits exist. Public open creation, abuse resistance, and a hard monetary ceiling remain unresolved. |
| Owner and editing features | `app/my/`, `app/manage/[token]/`, `app/admin/` | Already present. The launch plan understates the maturity of creator controls. |
| Public demo, brand, and conversion measurement | `app/page.tsx`, `messages/en.json`, `vendor/site/components/layout/SiteHeader.tsx`, `lib/log.ts` | Landing page explains the flow but has no accessible demo course or product screenshot/video in source. A course header still says “Study Playground.” Operational logs exist; a creator-to-learner conversion funnel is not evident. |

## Refined priority

1. **Make public free creation safe and understandable.** Remove the access-code barrier for ordinary creators, keep the guest first course, ask for sign-in before additional courses, explain quotas, add durable abuse controls and a global spend stop. Confirm that the live deployment has the needed provider and storage configuration before broad EN/RO promotion.
2. **Show the actual output before upload.** Provide a legally usable demo course and authentic screenshots or a short recording. Enable exam training by default when enough valid questions exist, make it easy to discover, and state exactly which functions are available. Use “Study with AI” consistently in public copy and shared courses.
3. **Close trust and sharing gaps.** Let creators understand that anyone with the link can see the generated course, require acknowledgment of rights to share source-derived content, provide deletion and takedown paths, and ensure owner/job links are treated as sensitive.
4. **Instrument the learning loop.** Measure landing-to-upload, upload-to-outline, outline-to-publish, first study action, repeat study, and link sharing without logging source text, answers, or access credentials. Establish a baseline before optimizing percentages.
5. **Run focused student research.** Observe at least one real creation and study session per participant, inspect failed generations, and ask whether the generated course improves exam preparation. Prioritize quality fixes from this evidence.

The existing assistant should be hidden from the public course experience until a service-backed, source-grounded version satisfies the learner-facing rules, privacy review, and cost limits. Automatic weakness detection and more AI-generated practice are follow-on experiments after the basic study loop has evidence of use. Paid subscriptions, ambassador programs, and a fixed 4–5-post weekly social schedule are launch experiments, not product requirements.

## Changes to the proposed 30-day sequence

| Stage | Exit criterion |
| --- | --- |
| Launch readiness | A guest can create and study a course without an access code; quota, spend stop, deletion, demo, and privacy/share disclosures work in the deployed environment. |
| First cohort | Observe 15–20 university students creating or studying with their own material; document failures and reasons for non-use. |
| Public acquisition | Publish only authentic feature demonstrations and track which sources bring activated creators and learners. |
| Decision review | Compare activation, study activity, return use, sharing, failure rate, and cost per successful course; choose the next feature or correction from observed behavior. |

## Important corrections to the original positioning

- “Your AI tutor” should not be a launch promise until the public tutor experience is fixed and verified.
- A mock exam exists, but it is assembled from generated lecture quiz questions. Do not claim official grading, open-ended grading, or a separate realistic exam generator.
- “Weak areas” currently means user-marked difficult content and quiz progress stored locally in a browser. Do not imply cross-device mastery inference or automatic diagnosis.
- The course link is shareable, but link possession gives access. Do not describe it as a private workspace.
- The suggested paid prices and conversion targets have no validation. Keep them out of public copy and use them only as test hypotheses.

## Sources for market context

The potential population is large, but not the reachable market: [Eurostat reports about 19.1 million tertiary students in the EU in 2024](https://ec.europa.eu/eurostat/statistics-explained/SEPDF/cache/1152.pdf?v=5016995364981757). Similar products already turn uploaded material into quizzes and flashcards, including [Quizlet Practice Tests](https://help.quizlet.com/hc/en-us/articles/25946589648013-Studying-with-Practice-Tests) and [Google's notebook flashcards and quizzes](https://support.google.com/gemininotebook/answer/16958963). The competitive claim should therefore be tested as a combined experience—editable, shareable study website with interactive course structure—rather than exclusive access to AI study tools.
