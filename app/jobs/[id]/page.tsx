"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoursePreview } from "@/components/job/CoursePreview";
import { DesignPreview } from "@/components/job/DesignPreview";
import { Questions } from "@/components/job/Questions";
import { Waiting } from "@/components/job/Waiting";
import { TopBar } from "@/components/TopBar";
import { useErrorText } from "@/components/useErrorText";
import type { PublicJob } from "@/lib/api/handlers";
import { shouldAdvance } from "@/lib/jobs/poll";

const POLL_MS = 3000;

type Phase = "context" | "design" | "lectures" | "finish" | "done";

function phaseOf(job: PublicJob): Phase {
  const step = job.step;
  if (job.status === "done" || step === "done") return "done";
  if (step === "context") return "context";
  if (["ask", "design", "review", "expand", "plan", "refine-plan", "append-plan", "choice"].includes(step)) return "design";
  if (step.startsWith("lecture:") || step.startsWith("refine:")) return "lectures";
  return "finish";
}

const PHASES: Phase[] = ["context", "design", "lectures", "finish", "done"];
const PHASE_KEYS = { context: "phaseContext", design: "phaseDesign", lectures: "phaseLectures", finish: "phaseFinish", done: "phaseDone" } as const;
const REFINE_PHASE_KEYS = { context: "phaseNote", design: "phaseNote", lectures: "phaseRewrite", finish: "phaseFinish", done: "phaseDone" } as const;

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
      if (shouldAdvance(current, Date.now()) && !paused) await step();
    }
    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [load, step, paused]);

  async function put(path: string, body: unknown) {
    setSaving(true);
    try {
      const response = await fetch(`/api/jobs/${id}/${path}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { code?: string };
        setProblem(errorRef.current(result.code));
        return;
      }
      await load();
    } catch {
      setProblem(errorRef.current("network"));
    } finally {
      setSaving(false);
    }
  }

  const phase = job ? phaseOf(job) : "context";
  const phaseIndex = PHASES.indexOf(phase);
  const refining = job?.kind === "refine";
  const phaseKeys = refining ? REFINE_PHASE_KEYS : PHASE_KEYS;
  const phases = refining ? PHASES.filter((item) => item !== "design") : PHASES;

  function currentLabel(current: PublicJob): string {
    if (current.status === "failed") return t("failed");
    if (current.waiting === "answers") return t("asking");
    if (current.waiting === "design") return t("reviewing");
    if (current.waiting === "choice") return t("choosing");
    if (phase === "context") return t("planning");
    if (phase === "design") return refining ? t("readingNote") : t("designing");
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

  const working = job && job.status !== "awaiting-review" && job.status !== "done" && job.status !== "failed";

  return (
    <main className="job-page">
      <TopBar note={t("topNote")} />

      <section className="job-hero">
        <div className="eyebrow"><span className="eyebrow-line" /> {t("eyebrow")}</div>
        <h1 className="job-title">{job ? currentLabel(job) : t("loading")}</h1>
      </section>

      <div className="job-grid">
        <ol className="phase-list panel" aria-label={t("stepsAria")}>
          {phases.map((item, position) => {
            const index = PHASES.indexOf(item);
            const done = index < phaseIndex || job?.status === "done";
            return (
              <li key={item} className={done ? "done" : index === phaseIndex ? "current" : ""} aria-current={index === phaseIndex ? "step" : undefined}>
                <span className="phase-dot">{done ? "✓" : position + 1}</span>
                <span>
                  {t(phaseKeys[item])}
                  {item === "lectures" && job && job.lecturesTotal > 0 ? <small> {job.lecturesDone}/{job.lecturesTotal}</small> : null}
                </span>
              </li>
            );
          })}
        </ol>

        <section className="panel job-main" aria-live="polite">
          {problem ? <p className="helper helper-error">{problem}</p> : null}

          {job?.waiting === "answers" && job.questions ? (
            <Questions questions={job.questions} busy={saving} onSubmit={(answers) => void put("answers", { answers })} />
          ) : null}

          {job?.waiting === "design" && job.design ? (
            <DesignPreview design={job.design} busy={saving} onBuild={(input) => void put("design", input)} />
          ) : null}

          {job?.waiting === "choice" && job.choice ? (
            <div className="retry">
              <h2>{t("choiceTitle")}</h2>
              <p className="helper">{job.choice.reason}</p>
              <ul>{job.choice.affected.map((lecture) => <li key={lecture.slug}>{lecture.title}</li>)}</ul>
              <button type="button" className="primary-button" disabled={saving} onClick={() => void put("choice", { choice: "append" })}>{t("choiceAppend")}</button>
              <button type="button" className="secondary-button" disabled={saving || !job.choice.canReorganize} onClick={() => void put("choice", { choice: "reorganize" })}>{t("choiceReorganize")}</button>
              {!job.choice.canReorganize ? <p className="helper">{t("choiceNeedsFiles")}</p> : null}
            </div>
          ) : null}

          {working ? (
            <>
              <Waiting label={currentLabel(job)} done={job.lecturesDone} total={job.lecturesTotal} showProgress={phase === "lectures" || phase === "finish"} />
              {paused && job.error ? (
                <div className="retry">
                  <p className="helper helper-error">{errorText(job.error)} {t("attemptsLeft", { count: 3 - job.attempts })}</p>
                  <button type="button" className="primary-button" onClick={() => setPaused(false)}>{t("tryAgain")}</button>
                </div>
              ) : null}
            </>
          ) : null}

          {job?.status === "failed" ? (
            <div className="retry">
              <p className="helper helper-error">{errorText(job.error)} {t("failedThree")}</p>
              <a className="secondary-button" href="/create">{t("startAgain")}</a>
            </div>
          ) : null}

          {job?.status === "done" ? (
            <div className="finished">
              {job.summary ? <p className="helper">{job.summary}</p> : null}
              {job.siteUrl ? <CoursePreview siteUrl={job.siteUrl} /> : null}
              {refining ? <a className="helper" href="/my">{t("restoreHint")}</a> : null}
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
