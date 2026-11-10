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
