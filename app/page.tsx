"use client";

import { FormEvent, useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Uploading…");
    const response = await fetch("/api/jobs", { method: "POST", body: new FormData(event.currentTarget) });
    const body = (await response.json()) as { id?: string; error?: string };
    if (response.ok && body.id) {
      setJobId(body.id);
      setStatus(`Job ${body.id} accepted.`);
    } else {
      setStatus(body.error ?? "Upload failed.");
    }
  }

  async function generate() {
    setStatus("Generation started…");
    const response = await fetch(`/api/jobs/${jobId}/generate`, { method: "POST" });
    const body = (await response.json()) as { status?: string; error?: string };
    setStatus(body.status === "completed" ? "Lecture generated." : body.error ?? "Generation failed.");
  }

  return (
    <main>
      <h1>Learning Playground</h1>
      <p>Upload one course PDF to create a source-grounded study site.</p>
      <form onSubmit={submit}>
        <label>
          Course material (PDF, max 10 MB)
          <input name="material" type="file" accept="application/pdf" required />
        </label>
        <button type="submit">Create draft job</button>
      </form>
      <p aria-live="polite">{status}</p>
      {jobId ? <button type="button" onClick={generate}>Generate lecture</button> : null}
    </main>
  );
}
