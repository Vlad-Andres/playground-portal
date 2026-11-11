# Learning Playground Portal

The portal turns course material into a validated bundle for
[playground-template](https://github.com/Vlad-Andres/playground-template). Text is extracted in
the browser, then a short-lived job advances through planning, outline review, lecture writing,
validation, packaging, and optional publishing. The portal does not create a GitHub repository
for every course.

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
and choose **Build my site**. The finished job provides a course bundle download until GitHub
publishing is configured.

## Environment

Copy `.env.example` conceptually into your hosting configuration; do not commit `.env.local`.

- `PORTAL_ENABLE_GENERATION`: must be `true` to accept jobs.
- `PORTAL_ACCESS_CODE`: shared invite code, at least 12 characters.
- `PORTAL_DAILY_JOB_LIMIT`: accepted jobs per UTC day, default `10`.
- `PORTAL_FAKE_MODEL`: development-only deterministic model; keep `false` in production.
- `GEMINI_API_KEY`: server-side provider key.
- `GEMINI_MODEL`: generation model, default `gemini-3.1-flash-lite`.
- `BLOB_READ_WRITE_TOKEN`: private Vercel Blob storage token.
- `CRON_SECRET`, `GITHUB_PUBLISH_TOKEN`, `GITHUB_PUBLISH_OWNER`, and `TEMPLATE_REPO` are
  required only when the corresponding publishing/cleanup adapters are enabled.

## Deployment

Connect the repository to Vercel with the Node.js runtime. Create a **private** Blob store and
connect it to the project. Set the environment variables for Preview and Production. Keep
`PORTAL_ENABLE_GENERATION=false` until the access code and budget limits have been configured.

The current branch can package a validated course bundle. GitHub Pages publishing is the next
adapter and requires an operator-owned GitHub account and token; it does not require learner
GitHub accounts or one repository per course.
