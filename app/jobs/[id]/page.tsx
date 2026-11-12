"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { TopBar } from "@/components/TopBar";
import { useErrorText } from "@/components/useErrorText";
import type { PublicJob } from "@/lib/api/handlers";

const POLL_MS = 3000;

type Phase = "plan" | "review" | "lectures" | "finish" | "done";

function phaseOf(job: PublicJob): Phase {
  if (job.step === "plan") return "plan";
  if (job.step === "review") return "review";
  if (job.step.startsWith("lecture:")) return "lectures";
  if (job.step === "finish") return "finish";
  return "done";
}

const PHASES: Phase[] = ["plan", "review", "lectures", "finish", "done"];
const PHASE_KEYS = { plan: "phasePlan", review: "phaseReview", lectures: "phaseLectures", finish: "phaseFinish", done: "phaseDone" } as const;

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("job");
  const errorText = useErrorText();
  // Kept in a ref so the polling callbacks below do not change when the translations do.
  const errorRef = useRef(errorText);
  errorRef.current = errorText;
  const [copied, setCopied] = useState(false);
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
      const body = (await response.json()) as PublicJob & { code?: string };
      if (!response.ok) {
        setProblem(errorRef.current(body.code));
        return null;
      }
      setProblem("");
      setJob(body);
      return body;
    } catch {
      setProblem(errorRef.current("network"));
      return null;
    }
  }, [id]);

  const step = useCallback(async () => {
    if (advancing.current) return;
    advancing.current = true;
    try {
      const response = await fetch(`/api/jobs/${id}/advance`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as PublicJob & { code?: string };
      if (!response.ok) {
        setProblem(errorRef.current(body.code));
        return;
      }
      if (body.error && body.status === "idle") setPaused(true);
      await load();
    } catch {
      setProblem(errorRef.current("network"));
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
      setProblem(errorText("bad-outline"));
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
      const body = (await response.json().catch(() => ({}))) as { code?: string };
      setProblem(errorRef.current(body.code));
      return;
    }
    await load();
  }

  const phase = job ? phaseOf(job) : "plan";
  const phaseIndex = PHASES.indexOf(phase);

  function currentLabel(current: PublicJob): string {
    if (current.status === "failed") return t("failed");
    if (phase === "plan") return t("planning");
    if (phase === "review") return t("reviewing");
    if (phase === "lectures") return t("writing", { current: Math.min(current.lecturesDone + 1, current.lecturesTotal), total: current.lecturesTotal });
    if (phase === "finish") return t("finishing");
    return t("ready");
  }

  const editLink = job?.manageUrl ? `${window.location.origin}${job.manageUrl}` : "";

  async function copyEditLink() {
    try {
      await navigator.clipboard.writeText(editLink);
      setCopied(true);
    } catch {
      // the link stays selectable in the field
    }
  }

  return (
    <main className="job-page">
      <TopBar note={t("topNote")} />

      <section className="job-hero">
        <div className="eyebrow"><span className="eyebrow-line" /> {t("eyebrow")}</div>
        <h1 className="job-title">{job ? currentLabel(job) : t("loading")}</h1>
      </section>

      <div className="job-grid">
        <ol className="phase-list panel" aria-label={t("stepsAria")}>
          {PHASES.map((item, index) => (
            <li key={item} className={index < phaseIndex || job?.status === "done" ? "done" : index === phaseIndex ? "current" : ""} aria-current={index === phaseIndex ? "step" : undefined}>
              <span className="phase-dot">{index < phaseIndex || job?.status === "done" ? "✓" : index + 1}</span>
              <span>
                {t(PHASE_KEYS[item])}
                {item === "lectures" && job && job.lecturesTotal > 0 ? <small> {job.lecturesDone}/{job.lecturesTotal}</small> : null}
              </span>
            </li>
          ))}
        </ol>

        <section className="panel job-main" aria-live="polite">
          {problem ? <p className="helper helper-error">{problem}</p> : null}

          {job?.status === "awaiting-review" && job.outline ? (
            <div className="outline">
              <h2>{t("outlineTitle")}</h2>
              <p className="helper">{t("outlineHint")}</p>
              <ol className="outline-list">
                {job.outline.map((lecture, index) => (
                  <li key={lecture.slug} className={removed.has(lecture.slug) ? "removed" : ""}>
                    <span className="outline-number">{index + 1}</span>
                    <div className="outline-body">
                      <input
                        className="text-input"
                        aria-label={t("lectureTitle", { n: index + 1 })}
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
                      {removed.has(lecture.slug) ? t("keep") : t("remove")}
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" className="primary-button" onClick={build} disabled={saving}>
                {t("build")} <span>→</span>
              </button>
            </div>
          ) : null}

          {job && job.status !== "awaiting-review" && job.status !== "done" && job.status !== "failed" ? (
            <div className="working">
              <span className="spinner" aria-hidden />
              <p>{currentLabel(job)}</p>
              {paused && job.error ? (
                <div className="retry">
                  <p className="helper helper-error">{errorText(job.error)} {t("attemptsLeft", { count: 3 - job.attempts })}</p>
                  <button type="button" className="primary-button" onClick={() => setPaused(false)}>{t("tryAgain")}</button>
                </div>
              ) : null}
            </div>
          ) : null}

          {job?.status === "failed" ? (
            <div className="retry">
              <p className="helper helper-error">{errorText(job.error)} {t("failedThree")}</p>
              <a className="secondary-button" href="/create">{t("startAgain")}</a>
            </div>
          ) : null}

          {job?.status === "done" ? (
            <div className="finished">
              {job.siteUrl ? (
                <a className="primary-button" href={job.siteUrl} target="_blank" rel="noreferrer">{t("openSite")} <span>→</span></a>
              ) : null}
              {job.manageUrl ? (
                <div className="edit-link">
                  <h3>{t("editLinkTitle")}</h3>
                  <div className="edit-link-row">
                    <input className="text-input" readOnly value={editLink} aria-label={t("editLinkTitle")} onFocus={(event) => event.currentTarget.select()} />
                    <button type="button" onClick={copyEditLink} aria-label={t("copyAria")}>{copied ? t("copied") : t("copy")}</button>
                  </div>
                  <p>{t("editLinkWarning")}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
