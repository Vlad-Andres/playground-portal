# Learning Playground Portal

This is the first portal seam for the published [playground-template](https://github.com/Vlad-Andres/playground-template).
It accepts a PDF into a local job directory and returns a job id. It intentionally does not call
Gemini, store API keys, create GitHub repositories, or publish sites yet.

## Local development

```bash
npm install
npm run dev
```

The upload endpoint enforces PDF type and a 10 MB limit. Jobs are local development artifacts and
are ignored by Git. `GET /api/jobs/:id` reads the accepted status. The next seam is a worker that
reads an accepted job, invokes the template's validated generator with an explicit budget, and
writes status without exposing provider keys.

## Deployment

This portal needs a server runtime because its upload and generation routes are dynamic. GitHub
Pages can host the template's generated static sites, but cannot host this portal correctly.
Connect this repository to a server host such as Vercel, set `GEMINI_API_KEY` as an encrypted
hosting secret, set `GEMINI_MODEL=gemini-3.1-flash-lite`, and set `PORTAL_ENABLE_GENERATION=true`
only after reviewing the provider budget. The repository currently keeps generation disabled by
default.
