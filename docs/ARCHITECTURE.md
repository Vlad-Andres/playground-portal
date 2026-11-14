# Architecture & Local Reference

Current platform architecture (supersedes all pre-2026-11-12 design drafts).

## System shape

- **Content as data**: A course is strict Zod-validated JSON (`core/schema.ts`, `core/widgets.ts`, `core/validate.ts`), never AI-generated React/route code.
- **Shared renderer, two hosts**:
  - `playground-template` owns the pure TS schema/validator/generator (`core/`, importing only `zod` and its own files) and the React course UI (`src/`).
  - `playground-portal` holds a vendored copy in `vendor/core` (`@core/*`) and `vendor/site` (`@site/*`), updated exclusively by `npm run sync:core` from sibling `../playground-template`.
- **Portal-only course hosting**: Published courses live as `courses/<key>/site.json` + `meta.json` inside the portal's private Vercel Blob store (`Store` interface in `lib/jobs/store.ts`; `.data/` on local disk) and render dynamically at `/courses/<key>/`. No GitHub Pages or per-course repositories exist.
- **Browser-side extraction**: PDFs (`pdfjs-dist`), `.txt`, and `.md` files are parsed in the browser; only extracted page text is sent to the server.
- **Step-driven jobs**: Long generations advance one step per HTTP request (`lib/jobs/steps.ts`), guarded by atomic claims (`store.create`).
- **Sandboxed custom exercises**: The `custom` block carries one self-contained HTML/CSS/JS document checked statically by `scanCustomHtml` (`core/custom.ts`) and rendered only inside `<iframe sandbox="allow-scripts">` (opaque origin, strict CSP with zero network/storage access, `postMessage` bridge only).
- **Styling split in `playground-portal`**: Portal pages (`/`, `/create`, `/jobs/*`, `/manage/*`, `/admin`, `/my/*`) use CSS Modules (`*.module.css`) and variables from `app/globals.css` — **never Tailwind**. Tailwind is loaded only under `/courses/`.

## Local portal run (fake model, zero cost)

```bash
BLOB_READ_WRITE_TOKEN= PORTAL_FAKE_MODEL=true PORTAL_ENABLE_GENERATION=true \
PORTAL_ACCESS_CODE=local-check-code-123 ADMIN_TOKEN=local-admin-token-0123456789 \
npx next dev -p 3100
```

All values above are fake local placeholders. Data is written to `.data/` (gitignored). Stop the dev server when finished.
