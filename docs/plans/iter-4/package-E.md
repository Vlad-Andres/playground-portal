# Iteration 4 — Package E: Final Verification & Hand-over

> **Scope:** `playground-portal` (`iteration-4`) and `playground-portal/docs/NEXT.md`. Do **not** touch `playground-template`.

---

### Task E1: Whole-flow check, README, and final pull request *(code and README merged; checks recorded below)*

1. Run the full flow locally with the fake model (`ARCHITECTURE.md`) in both English and Romanian, at desktop and 375 px, plus a production build (`npm run build && npx next start -p 3100`) checking `/` for zero Content-Security-Policy console errors. Check the browser console on every page: zero errors.
2. Confirm each item 1–7 below by a test or by hand, and record one line per item under **Calls made / problems**:
   1. **Wrong or guessed owner link** (`/manage/<token>`) gives 404 without revealing whether a course exists; token is never logged or stored in clear text outside job state.
   2. **Admin page without session** shows only the login form; every admin server action checks the session itself.
   3. **Invalid course edit** (last lecture removed, lecture left empty) is refused with a clear message and leaves stored course unchanged.
   4. **Old data**: pre-iteration-4 jobs (`publish` / `publish-wait`) and `meta.json` with only `jobId` + `publishedAt` keep working.
   5. **Missing translation**: a key in English missing in Romanian fails `tests/messages.test.ts`.
   6. **Immediate settings**: pausing generation or disabling an invite code in `/admin` takes effect on the very next request without redeploy.
   7. **Animated background**: does not weaken CSP and does not animate under `prefers-reduced-motion: reduce`.
3. Update `playground-portal/README.md`: routes (`/`, `/create`, `/jobs/<id>`, `/manage/<token>`, `/admin`, `/courses/<key>/`), environment variables, how settings and invite codes work, where logs live.
4. Commit fixes/README on `iteration-4`, run `npm run lint && npm test && npm run build`, push, verify preview status, and open the final Iteration 4 PR (`iteration-4 → main`). Remind the owner in the PR body: *"Set `ADMIN_TOKEN` (24+ characters) in Vercel for Production, then redeploy, before `/admin` works."*
5. Update `playground-portal/docs/NEXT.md` to mark Iteration 4 PR open / awaiting merge before Iteration 5 (which still requires the owner to say `start iteration 5`).

---

## Earlier Iteration 4 notes (Packages A & B, merged)

- A1/A2 (`4bfd1cf`): `publish`/`publish-wait` folded into `finish`; `writeSite` skips `owners/<hash>.json` when `ownerHash` is empty; `course.published` logged in `lib/sites/publish.ts`. `pdfjs-dist` upgraded to `6.5.438` + `katex` override (`441fc76`) so `npm audit --omit=dev --audit-level=high` passes.
- B1–B4 (`b3752a4`): cron 401 carries `code: "unauthorized"`; course language names use `Intl.DisplayNames`; production build CSP verified clean and shader skips animation under reduced motion; top-bar CTA hides below 560 px to avoid clipping `LanguageSwitch`.

## Calls made / problems

E1 run 2026-11-12 on `playground-portal` `main` at `b11f465`. The automatable part was exercised against real servers, not only unit tests: `npx next dev -p 3100` with the fake model ran a whole job (`POST /api/jobs` → advance → `PUT …/outline` → advance to `done`), then a production build under `npx next start -p 3101` was checked for headers. 23/23 flow/page checks and 27/27 header and leak checks passed; `npm run lint`, `npm test` (140/140) and `npm run build` are green on `main`. The local `.data` written by the run was deleted afterwards.

- Review 1 (owner link): two different wrong 32-character tokens answer 404, in dev and in production; `tests/manage-actions.test.ts` shows a wrong token writes nothing and that the token never reaches a log line; `tests/sites.test.ts` shows the token is never stored in clear text outside `jobs/<id>/state.json`.
- Review 2 (admin): `/admin` without a session renders the token field and no dashboard; `tests/admin-session.test.ts` proves every action (`saveSettings`, `createCode`, `setCodeActive`, `deleteCode`, `deleteCourse`, `logout`) rejects on its own.
- Review 3 (invalid edit): `last-lecture` answers `{ ok: false, code: "last-lecture" }` and leaves `site.json` byte-identical; a malformed body answers `bad-request` and writes nothing (`tests/manage-actions.test.ts`). `empty-lecture`, `invalid` and the 6,000-character limit are covered in `tests/site-edit.test.ts`.
- Review 4 (old data): a stored `step: "publish-wait"` job finishes `done` when advanced (`tests/jobs.test.ts`); `readMeta` on a file holding only `jobId` and `publishedAt` returns the documented defaults (`tests/sites.test.ts`).
- Review 5 (translations): `tests/messages.test.ts` fails on a key that exists in one language only, an empty value, a missing placeholder, and cedilla diacritics.
- Review 6 (immediate settings): `tests/settings.test.ts` shows `generationPaused` answering 503 `generation-off` on create and on advance, a settings daily limit of 1 overriding the environment value, and a disabled invite code answering `wrong-code`; the handlers read settings on every request.
- Review 7 (background): production headers on `/`, `/create`, a job page and `/manage/<token>` carry `default-src 'self'`, `frame-ancestors 'none'` and no `'unsafe-eval'`; `/courses/<key>/` keeps its own policy with `wasm-unsafe-eval`. `HeroBackground` mounts the shader only when WebGL works and `prefers-reduced-motion` does not match, so nothing animates for that reader.
- Visual pass (2026-11-12, `main` at `3e56fac`, production build on `next start`, fake-model data): `/`, `/create`, a finished job, a job in outline review, `/manage/<token>` with every lecture open, `/admin` (logged in) and `/admin/translations` have no element wider than the viewport at 375 px, in English and in Romanian; desktop screenshots of all of them plus a course page look right. (Headless Chrome cannot render 375 px, so phone width was measured in an emulated 375 px browser tab.)
- Console: no Content-Security-Policy error on any portal page. **One error on every course page in production:** the template's `ServiceWorkerRegistration` (rendered by `SiteShell`) registers `/sw.js`, which the portal does not serve (404), so the browser logs "An unknown error occurred when fetching the script". It is harmless (the promise is caught) but noisy, and a service worker at scope `/` would be wrong for a multi-course portal anyway. The fix belongs in `playground-template` (let `SiteShell` skip the registration when hosted by the portal), which this package may not touch; reported to the owner.
- E1's README (`b11f465`, sections Routes, Storage, Security, Environment) reached `main` directly rather than through its own pull request; packages A–D are merged via PRs #4, #5 and #6.
