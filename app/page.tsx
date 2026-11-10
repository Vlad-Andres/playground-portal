"use client";

import { FormEvent, useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState<string>("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Uploading…");
    const response = await fetch("/api/jobs", { method: "POST", body: new FormData(event.currentTarget) });
    const body = (await response.json()) as { id?: string; error?: string };
    setStatus(response.ok ? `Job ${body.id} accepted. Generation is not started yet.` : body.error ?? "Upload failed.");
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
    </main>
  );
}
