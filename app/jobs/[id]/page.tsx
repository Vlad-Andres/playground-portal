"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { PublicJob } from "@/lib/api/handlers";

const POLL_MS = 3000;

type Phase = "plan" | "review" | "lectures" | "finish" | "publish" | "done";

function phaseOf(job: PublicJob): Phase {
  if (job.step === "plan") return "plan";
  if (job.step === "review") return "review";
  if (job.step.startsWith("lecture:")) return "lectures";
  if (job.step === "finish") return "finish";
  if (job.step === "publish" || job.step === "publish-wait") return "publish";
  return "done";
}

const PHASES: { id: Phase; label: string }[] = [
  { id: "plan", label: "Plan the lectures" },
  { id: "review", label: "Review the outline" },
  { id: "lectures", label: "Write the lectures" },
  { id: "finish", label: "Check and package" },
  { id: "publish", label: "Publish the site" },
  { id: "done", label: "Done" },
];

function currentLabel(job: PublicJob): string {
  const phase = phaseOf(job);
  if (job.status === "failed") return "Something went wrong.";
  if (phase === "plan") return "Reading your material and planning the lectures…";
  if (phase === "review") return "Your outline is ready. Rename or remove lectures, then build.";
  if (phase === "lectures") return `Writing lecture ${Math.min(job.lecturesDone + 1, job.lecturesTotal)} of ${job.lecturesTotal}…`;
  if (phase === "finish") return "Checking every block and packaging the course…";
  if (phase === "publish") return "Publishing your site on GitHub Pages…";
  return "Your course is ready.";
}

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<PublicJob | null>(null);
  const [problem, setProblem] = useState("");
  const [paused, setPaused] = useState(false);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const advancing = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
      const body = (await response.json()) as PublicJob & { error?: string };
      if (!response.ok) {
        setProblem(body.error ?? `Could not load this job (status ${response.status}).`);
        return null;
      }
      setProblem("");
      setJob(body);
      return body;
    } catch {
      setProblem("Connection lost. Retrying…");
      return null;
    }
  }, [id]);

  const step = useCallback(async () => {
    if (advancing.current) return;
    advancing.current = true;
    try {
      const response = await fetch(`/api/jobs/${id}/advance`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as PublicJob & { error?: string };
      if (!response.ok) {
        setProblem(body.error ?? `The server stopped this step (status ${response.status}). It will be retried.`);
        return;
      }
      if (body.error && body.status === "idle") setPaused(true);
      await load();
    } catch {
      setProblem("Connection lost. Retrying…");
    } finally {
      advancing.current = false;
    }
  }, [id, load]);

  useEffect(() => {
    let stopped = false;
    async function tick() {
      const current = await load();
      if (stopped || !current) return;
      if (current.status === "idle" && !paused) await step();
    }
    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [load, step, paused]);

  async function build() {
    if (!job?.outline) return;
    const keep = job.outline.map((lecture) => lecture.slug).filter((slug) => !removed.has(slug));
    if (keep.length === 0) {
      setProblem("Keep at least one lecture.");
      return;
    }
    setSaving(true);
    const changed = Object.fromEntries(Object.entries(titles).filter(([slug, title]) => keep.includes(slug) && title.trim()));
    const response = await fetch(`/api/jobs/${id}/outline`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep, titles: changed }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setProblem(body.error ?? "The outline could not be saved.");
      return;
    }
    await load();
  }

  const phase = job ? phaseOf(job) : "plan";
  const phaseIndex = PHASES.findIndex((item) => item.id === phase);

  return (
    <main className="job-page">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">✦</span>
          <span>playground<span className="brand-dot">.</span></span>
        </a>
        <span className="topbar-note">You can close this page and reopen the link later</span>
      </header>

      <section className="job-hero">
        <div className="eyebrow"><span className="eyebrow-line" /> Building your study site</div>
        <h1 className="job-title">{job ? currentLabel(job) : "Loading…"}</h1>
      </section>

      <div className="job-grid">
        <ol className="phase-list panel" aria-label="Steps">
          {PHASES.map((item, index) => (
            <li key={item.id} className={index < phaseIndex || job?.status === "done" ? "done" : index === phaseIndex ? "current" : ""} aria-current={index === phaseIndex ? "step" : undefined}>
              <span className="phase-dot">{index < phaseIndex || job?.status === "done" ? "✓" : index + 1}</span>
              <span>
                {item.label}
                {item.id === "lectures" && job && job.lecturesTotal > 0 ? <small> {job.lecturesDone}/{job.lecturesTotal}</small> : null}
              </span>
            </li>
          ))}
        </ol>

        <section className="panel job-main" aria-live="polite">
          {problem ? <p className="helper helper-error">{problem}</p> : null}

          {job?.status === "awaiting-review" && job.outline ? (
            <div className="outline">
              <h2>Your lectures</h2>
              <p className="helper">Rename a lecture or remove the ones you do not need. Then the lectures are written one by one.</p>
              <ol className="outline-list">
                {job.outline.map((lecture, index) => (
                  <li key={lecture.slug} className={removed.has(lecture.slug) ? "removed" : ""}>
                    <span className="outline-number">{index + 1}</span>
                    <div className="outline-body">
                      <input
                        className="text-input"
                        aria-label={`Title of lecture ${index + 1}`}
                        maxLength={120}
                        defaultValue={lecture.title}
                        disabled={removed.has(lecture.slug)}
                        onChange={(event) => setTitles((current) => ({ ...current, [lecture.slug]: event.target.value }))}
                      />
                      <small>{lecture.summary}</small>
                    </div>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() =>
                        setRemoved((current) => {
                          const next = new Set(current);
                          if (next.has(lecture.slug)) next.delete(lecture.slug);
                          else next.add(lecture.slug);
                          return next;
                        })
                      }
                    >
                      {removed.has(lecture.slug) ? "Keep" : "Remove"}
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" className="primary-button" onClick={build} disabled={saving}>
                Build my site <span>→</span>
              </button>
            </div>
          ) : null}

          {job && job.status !== "awaiting-review" && job.status !== "done" && job.status !== "failed" ? (
            <div className="working">
              <span className="spinner" aria-hidden />
              <p>{currentLabel(job)}</p>
              {paused && job.error ? (
                <div className="retry">
                  <p className="helper helper-error">{job.error} {3 - job.attempts} attempt(s) left.</p>
                  <button type="button" className="primary-button" onClick={() => setPaused(false)}>Try again</button>
                </div>
              ) : null}
            </div>
          ) : null}

          {job?.status === "failed" ? (
            <div className="retry">
              <p className="helper helper-error">{job.error ?? "This job failed."}</p>
              <a className="secondary-button" href="/">Start again</a>
            </div>
          ) : null}

          {job?.status === "done" ? (
            <div className="finished">
              {job.siteUrl ? (
                <a className="primary-button" href={job.siteUrl} target="_blank" rel="noreferrer">Open your site <span>→</span></a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
