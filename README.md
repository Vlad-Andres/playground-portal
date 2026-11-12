# Learning Playground Portal

The portal turns course material into an interactive study site and hosts it itself at
`/courses/<course>-<id>/`, rendered with the UI of
[playground-template](https://github.com/Vlad-Andres/playground-template). Text is extracted in
the browser, then a short-lived job advances through planning, outline review, lecture writing,
validation and publishing. Courses are stored in the portal's private Blob store; nothing is
published to GitHub and no repository is created for a course.

## Local development

```bash
npm install
npm run dev
```

The browser accepts PDFs, TXT, and Markdown files, extracts readable text, and sends only the
text and selected options to the server. Local jobs use `.data/`; Vercel jobs use private Blob
storage. The fake model is available for cost-free development:

```bash
BLOB_READ_WRITE_TOKEN= \
PORTAL_FAKE_MODEL=true \
PORTAL_ENABLE_GENERATION=true \
PORTAL_ACCESS_CODE=local-development-code \
npm run dev
```

Open the site, enter the same access code, upload a small text-readable PDF, review the outline,
and choose **Build my site**. The finished job links to the course at `/courses/<key>/`.

## Environment

Copy `.env.example` conceptually into your hosting configuration; do not commit `.env.local`.

- `PORTAL_ENABLE_GENERATION`: must be `true` to accept jobs.
- `PORTAL_ACCESS_CODE`: shared invite code, at least 12 characters.
- `PORTAL_DAILY_JOB_LIMIT`: accepted jobs per UTC day, default `10`.
- `PORTAL_FAKE_MODEL`: development-only deterministic model; keep `false` in production.
- `GEMINI_API_KEY`: server-side provider key.
- `GEMINI_MODEL`: generation model, default `gemini-3.1-flash-lite`.
- `BLOB_READ_WRITE_TOKEN`: private Vercel Blob storage token.
- `CRON_SECRET`: protects the daily cleanup of finished jobs (published courses are kept).
- `ADMIN_TOKEN`: password for `/admin`, at least 24 characters. Without it `/admin` answers 404. Set it in Vercel for Production and redeploy; log in with it at `/admin` (the session lasts 8 hours).

## Deployment

Connect the repository to Vercel with the Node.js runtime. Create a **private** Blob store and
connect it to the project. Set the environment variables for Preview and Production. Keep
`PORTAL_ENABLE_GENERATION=false` until the access code and budget limits have been configured.

Vercel deploys `main` to production. Users never see model names, token counts or internal files;
those stay in the server logs.
