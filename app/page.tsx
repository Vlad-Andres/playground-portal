"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";

const steps = ["Materials", "Shape your site", "Review"];

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
    setStatus("");
  }

  function removeFile(index: number) {
    const remaining = selectedFiles.filter((_, fileIndex) => fileIndex !== index);
    setSelectedFiles(remaining);
    if (fileInput.current) {
      const transfer = new DataTransfer();
      remaining.forEach((file) => transfer.items.add(file));
      fileInput.current.files = transfer.files;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Uploading your materials…");
    const response = await fetch("/api/jobs", { method: "POST", body: new FormData(event.currentTarget) });
    const body = (await response.json()) as { id?: string; error?: string };
    if (!response.ok || !body.id) {
      setStatus(body.error ?? "Upload failed.");
      return;
    }
    setJobId(body.id);
    setStep(2);
    setStatus(`${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"} uploaded securely. Your brief is ready to generate.`);
  }

  async function generate() {
    if (!jobId || generating) return;
    setGenerating(true);
    setStatus("Generation is starting…");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(`/api/jobs/${jobId}/generate`, { method: "POST", signal: controller.signal });
      const body = (await response.json()) as { status?: string; error?: string };
      setStatus(body.status === "completed" ? "Your draft playground is ready." : body.error ?? "Generation failed.");
    } catch (error: unknown) {
      setStatus(error instanceof DOMException && error.name === "AbortError"
        ? "Generation timed out after two minutes. Check the deployment logs before trying again."
        : "Generation could not be completed. Check the deployment logs.");
    } finally {
      window.clearTimeout(timeout);
      setGenerating(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">✦</span>
          <span>playground<span className="brand-dot">.</span></span>
        </a>
        <span className="topbar-note">Private by default · source-grounded</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> Your course, made interactive</div>
        <h1>Turn your materials into a <em>beautiful way to learn.</em></h1>
        <p className="hero-copy">
          Upload lecture notes, slides, and images. We&apos;ll shape them into a focused learning playground
          with explanations, practice, and only the features your course needs.
        </p>
      </section>

      <div className="stepper" aria-label="Creation progress">
        {steps.map((label, index) => (
          <div className={`step ${index <= step ? "active" : ""}`} key={label}>
            <span className="step-number">{index < step ? "✓" : index + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <form className="builder" onSubmit={submit}>
        <section className={`panel ${step === 0 ? "" : "muted-panel"}`}>
          <div className="panel-heading">
            <div><span className="panel-kicker">01</span><h2>Bring your materials</h2></div>
            <span className="panel-hint">PDFs & images · up to 10 MB each</span>
          </div>
          <label className="dropzone">
            <input ref={fileInput} name="material" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" multiple required onChange={chooseFiles} />
            <span className="upload-icon">↑</span>
            <strong>{selectedFiles.length ? "Materials selected" : "Drop your files here"}</strong>
            <span>or click to browse · PDF, PNG, JPG, WEBP</span>
          </label>
          {selectedFiles.length > 0 ? (
            <ul className="file-list" aria-label="Selected materials">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  <span className="file-type">{file.type === "application/pdf" ? "PDF" : "IMG"}</span>
                  <span className="file-name"><b>{file.name}</b><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span>
                  <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}>×</button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="helper">Upload lecture slides, reading notes, diagrams, or screenshots. The source files are used only to create your draft.</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">02</span><h2>Shape the experience</h2></div>
            <span className="panel-hint">All optional</span>
          </div>
          <label className="field-label" htmlFor="context">A little context <span>optional</span></label>
          <textarea id="context" name="context" placeholder="What should the learner get out of this? Who is it for? Add an exam date, teaching style, or anything else that helps." />
          <div className="grid-two">
            <label className="field-label">Language
              <select name="language" defaultValue="en"><option value="en">English</option><option value="nl">Dutch</option><option value="de">German</option><option value="fr">French</option></select>
            </label>
            <label className="field-label">Level
              <select name="level" defaultValue="university"><option value="school">School</option><option value="university">University</option><option value="professional">Professional</option></select>
            </label>
          </div>
          <div className="option-grid">
            <label className="option-card"><input name="examPreparation" type="checkbox" defaultChecked /><span><b>Exam preparation</b><small>Practice questions, expected topics, mock exam</small></span></label>
            <label className="option-card"><input name="figures" type="checkbox" defaultChecked /><span><b>Use source figures</b><small>Keep helpful diagrams and illustrations</small></span></label>
            <label className="option-card"><input name="quizzes" type="checkbox" defaultChecked /><span><b>Quizzes & recall</b><small>Lightweight checks for understanding</small></span></label>
            <label className="option-card"><input name="interactiveWidgets" type="checkbox" /><span><b>Interactive widgets</b><small>Add only matching built-in interactions</small></span></label>
          </div>
        </section>

        <section className="panel review-panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">03</span><h2>Review & create</h2></div>
          </div>
          <div className="review-row"><span className="review-icon">◈</span><span><b>Your files stay yours</b><small>Nothing is published until you review the result.</small></span></div>
          <div className="review-row"><span className="review-icon">◌</span><span><b>One careful generation</b><small>We use a cost-conscious model and validate every output.</small></span></div>
          <button className="primary-button" type="submit">Create my playground <span>→</span></button>
          <p className="status" aria-live="polite">{status}</p>
          {jobId ? <button className="secondary-button" type="button" onClick={generate} disabled={generating}>{generating ? "Generating…" : "Generate draft now"}</button> : null}
        </section>
      </form>

      <footer>Built for thoughtful studying <span>·</span> No account required for learners <span>·</span> <a href="https://github.com/Vlad-Andres/playground-template">Open source template</a></footer>
    </main>
  );
}
