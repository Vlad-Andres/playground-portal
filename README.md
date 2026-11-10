# Learning Playground Portal

This is the first portal seam for the published [playground-template](https://github.com/Vlad-Andres/playground-template).
It accepts a PDF into a local job directory and returns a job id. It intentionally does not call
Gemini, store API keys, create GitHub repositories, or publish sites yet.

## Local development

```bash
npm install
npm run dev
```

The upload endpoint accepts PDFs and images up to 10 MB each. Without `BLOB_READ_WRITE_TOKEN`,
jobs use the local `jobs/` directory for development. With the token configured, job files and
status are stored in Vercel Blob so they survive serverless requests. `GET /api/jobs/:id` reads
the accepted status.

## Deployment

This portal needs a server runtime because its upload and generation routes are dynamic. GitHub
Pages can host the template's generated static sites, but cannot host this portal correctly.
Connect this repository to Vercel, create a **private** Blob store, and add its
`BLOB_READ_WRITE_TOKEN` environment variable. Also set `GEMINI_MODEL=gemini-3.1-flash-lite`.
Add `GEMINI_API_KEY` and set `PORTAL_ENABLE_GENERATION=true` only after reviewing the provider
budget. The repository keeps generation disabled by default.
