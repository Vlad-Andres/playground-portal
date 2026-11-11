"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { checkMaterials, LIMITS, type Brief, type Material } from "@core/generate/index";
import { extractMaterial } from "@/lib/extract-pdf.client";

const steps = ["Materials", "Shape it", "Create"];

const LANGUAGE_OPTIONS = [
  ["en", "English"],
  ["nl", "Dutch"],
  ["de", "German"],
  ["fr", "French"],
  ["es", "Spanish"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["ro", "Romanian"],
  ["pl", "Polish"],
] as const;

const DEPTHS = [
  ["cram", "Cram sheet", "The essentials, fast"],
  ["standard", "Standard", "A full study page per lecture"],
  ["deep", "Deep", "More concepts, practice and widgets"],
] as const;

const SWATCHES = ["#237b55", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0f766e"];
const MAX_TEXT_BYTES = 4 * 1024 * 1024;

interface Entry {
  key: string;
  name: string;
  state: "reading" | "ready" | "error";
  material?: Material;
  message?: string;
}

function textBytes(materials: Material[]): number {
  return new TextEncoder().encode(JSON.stringify(materials)).length;
}

export default function HomePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [accent, setAccent] = useState(SWATCHES[0]);
  const [context, setContext] = useState("");

  const ready = entries.flatMap((entry) => (entry.state === "ready" && entry.material ? [entry.material] : []));
  const reading = entries.some((entry) => entry.state === "reading");
  const overall = ready.length ? checkMaterials(ready) : null;
  const bytes = textBytes(ready);
  const step = !ready.length ? 0 : busy ? 2 : 1;

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const added = files.map((file) => ({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, name: file.name, state: "reading" as const }));
    setEntries((current) => [...current, ...added]);
    setStatus("");
    await Promise.all(
      files.map(async (file, index) => {
        const key = added[index].key;
        let update: Partial<Entry>;
        try {
          const material = await extractMaterial(file);
          const check = checkMaterials([material]);
          update =
            check.ok || check.code === "too-many-pages" || check.code === "too-long"
              ? { state: "ready", material }
              : { state: "error", message: check.code === "scanned" ? "This PDF looks scanned — it has no readable text." : check.message };
        } catch (error) {
          update = { state: "error", message: error instanceof Error ? error.message : "This file could not be read." };
        }
        setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...update } : entry)));
      }),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overall?.ok) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const brief: Brief = {
      language: String(form.get("language")),
      level: String(form.get("level")) as Brief["level"],
      depth: String(form.get("depth")) as Brief["depth"],
      quizzes: form.get("quizzes") === "on",
      widgets: form.get("widgets") === "on",
      examMode: form.get("examMode") === "on",
      context: context.slice(0, LIMITS.contextCharacters),
      accent,
      ...(title ? { title: title.slice(0, 120) } : {}),
    };
    setBusy(true);
    setStatus("Sending the text of your materials…");
    let response: Response;
    try {
      response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: String(form.get("accessCode") ?? ""), brief, materials: ready }),
      });
    } catch {
      setBusy(false);
      setStatus("Upload failed. Check your connection and try again.");
      return;
    }
    let body: { id?: string; error?: string } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      // the platform answered with something that is not JSON
    }
    if (!response.ok || !body.id) {
      setBusy(false);
      setStatus(body.error ?? `Upload failed (status ${response.status}).`);
      return;
    }
    router.push(`/jobs/${body.id}`);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">✦</span>
          <span>playground<span className="brand-dot">.</span></span>
        </a>
        <span className="topbar-note">Invite-only beta</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> Your course, made interactive</div>
        <h1>Turn your materials into a <em>study website.</em></h1>
        <p className="hero-copy">
          Add lecture slides or notes. You review the planned lectures, then each one is written with explanations,
          tables, quizzes, practice and interactive exercises — built only from your material.
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
        <section className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">01</span><h2>Bring your materials</h2></div>
            <span className="panel-hint">PDF, .txt, .md · up to {LIMITS.files} files</span>
          </div>
          <label className="dropzone">
            <input type="file" accept="application/pdf,.pdf,.txt,.md,text/plain,text/markdown" multiple onChange={addFiles} />
            <span className="upload-icon">↑</span>
            <strong>{entries.length ? "Add more files" : "Drop your files here"}</strong>
            <span>or click to browse · PDF, TXT, MD</span>
          </label>
          {entries.length > 0 ? (
            <ul className="file-list" aria-label="Selected materials">
              {entries.map((entry) => (
                <li key={entry.key} className={entry.state === "error" ? "file-error" : undefined}>
                  <span className="file-type">{/\.pdf$/i.test(entry.name) ? "PDF" : "TXT"}</span>
                  <span className="file-name">
                    <b>{entry.name}</b>
                    <small>
                      {entry.state === "reading"
                        ? "Reading…"
                        : entry.state === "error"
                          ? entry.message
                          : `${entry.material?.pages.length} pages · ${entry.material?.pages.reduce((sum, page) => sum + page.text.length, 0).toLocaleString("en")} characters`}
                    </small>
                  </span>
                  <button type="button" onClick={() => setEntries((current) => current.filter((item) => item.key !== entry.key))} aria-label={`Remove ${entry.name}`}>×</button>
                </li>
              ))}
            </ul>
          ) : null}
          {overall && !overall.ok ? <p className="helper helper-error">{overall.message}</p> : null}
          {bytes > MAX_TEXT_BYTES ? <p className="helper helper-error">The text is larger than 4 MB. Remove a file.</p> : null}
          <p className="helper">Files are read in your browser. Only their text is sent, and it is deleted once your site is built.</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">02</span><h2>Shape it</h2></div>
          </div>
          <label className="field-label">Site title <span>optional</span>
            <input className="text-input" name="title" maxLength={120} placeholder="Taken from your material when empty" />
          </label>
          <div className="grid-two">
            <label className="field-label">Language
              <select name="language" defaultValue="en">
                {LANGUAGE_OPTIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
            <label className="field-label">Level
              <select name="level" defaultValue="university">
                <option value="school">School</option>
                <option value="university">University</option>
                <option value="professional">Professional</option>
              </select>
            </label>
          </div>
          <fieldset className="field-set">
            <legend className="field-label">Depth</legend>
            <div className="option-grid three">
              {DEPTHS.map(([value, label, hint]) => (
                <label className="option-card" key={value}>
                  <input type="radio" name="depth" value={value} defaultChecked={value === "standard"} />
                  <span><b>{label}</b><small>{hint}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="field-set">
            <legend className="field-label">Accent colour</legend>
            <div className="swatches">
              {SWATCHES.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`swatch ${accent === color ? "selected" : ""}`}
                  style={{ background: color }}
                  onClick={() => setAccent(color)}
                  aria-label={`Accent ${color}`}
                  aria-pressed={accent === color}
                />
              ))}
              <label className="swatch-custom">
                <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} aria-label="Custom accent colour" />
                Custom
              </label>
            </div>
          </fieldset>
          <div className="option-grid">
            <label className="option-card"><input name="quizzes" type="checkbox" defaultChecked /><span><b>Quizzes</b><small>Questions after every lecture</small></span></label>
            <label className="option-card"><input name="widgets" type="checkbox" defaultChecked /><span><b>Interactive widgets</b><small>Ordering, matching, sorting, charts, sliders</small></span></label>
            <label className="option-card"><input name="examMode" type="checkbox" /><span><b>Exam mode</b><small>An exam page with a timed mock test</small></span></label>
          </div>
          <label className="field-label" htmlFor="context">A little context <span>optional · {context.length}/{LIMITS.contextCharacters}</span></label>
          <textarea id="context" maxLength={LIMITS.contextCharacters} value={context} onChange={(event) => setContext(event.target.value)} placeholder="Who is it for? What should they get out of it?" />
        </section>

        <section className="panel review-panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">03</span><h2>Create</h2></div>
          </div>
          <div className="review-row"><span className="review-icon">◈</span><span><b>You review the outline first</b><small>Rename or remove lectures before they are written.</small></span></div>
          <label className="field-label review-label" htmlFor="accessCode">Access code</label>
          <input id="accessCode" name="accessCode" type="password" autoComplete="off" required />
          <button className="primary-button" type="submit" disabled={busy || reading || !overall?.ok || bytes > MAX_TEXT_BYTES}>
            Plan my site <span>→</span>
          </button>
          <p className="status" aria-live="polite">{reading ? "Reading your files…" : status}</p>
        </section>
      </form>

      <footer>Built for thoughtful studying <span>·</span> No account required for learners <span>·</span> <a href="https://github.com/Vlad-Andres/playground-template">Open source template</a></footer>
    </main>
  );
}
