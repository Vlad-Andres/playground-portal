"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useState } from "react";
import type { PublicJob } from "@/lib/api/handlers";
import styles from "./job.module.css";

type Design = NonNullable<PublicJob["design"]>;
const APPROACH_KEYS: Record<string, string> = {
  "follow-source": "approachFollowSource",
  "by-topic": "approachByTopic",
  "problem-first": "approachProblemFirst",
  "exam-focused": "approachExamFocused",
  timeline: "approachTimeline",
};

export function DesignPreview({
  design,
  busy,
  onBuild,
}: {
  design: Design;
  busy: boolean;
  onBuild: (input: { choice: string; keep: string[]; titles: Record<string, string> }) => void;
}) {
  const t = useTranslations("job");
  const locale = useLocale();
  const [choice, setChoice] = useState(design.options[0]?.id ?? "recommended");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const option = design.options.find((item) => item.id === choice) ?? design.options[0];
  const languageName = new Intl.DisplayNames([locale], { type: "language" }).of(design.language) ?? design.language;
  const kept = option.lectures.filter((lecture) => !removed.has(lecture.slug));

  function select(id: string) {
    setChoice(id as typeof choice);
    setTitles({});
    setRemoved(new Set());
  }

  return (
    <div className={styles.block}>
      <h2>{t("designTitle")}</h2>
      <p className={styles.summary}>{[design.subject, languageName, design.level].filter(Boolean).join(" · ")}</p>
      {design.goals.length ? (
        <div>
          <p className={styles.label}>{t("goalsTitle")}</p>
          <ul className={styles.list}>{design.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
        </div>
      ) : null}
      {design.assumptions.length ? (
        <div>
          <p className={styles.label}>{t("assumptionsTitle")}</p>
          <ul className={styles.list}>{design.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}

      <div className={styles.cards} role="radiogroup" aria-label={t("designTitle")}>
        {design.options.map((item, index) => (
          <button key={item.id} type="button" role="radio" aria-checked={item.id === choice} className={styles.card} onClick={() => select(item.id)}>
            {index === 0 ? <span className={styles.badge}>{t("recommended")}</span> : null}
            <span className={styles.approach}>{APPROACH_KEYS[item.approach] ? t(APPROACH_KEYS[item.approach]) : item.approach}</span>
            {item.why ? <p className={styles.why}>{item.why}</p> : null}
            <span className={styles.summary}>{t("lectureCount", { count: item.lectures.length })}</span>
            <ol className={styles.diagram}>
              {item.lectures.map((lecture, number) => (
                <li key={lecture.slug} style={{ flexWrap: "wrap" }}>
                  <b>{number + 1}</b>
                  <span>{lecture.title}</span>
                  {lecture.forms.length ? <span className={styles.chips}>{lecture.forms.map((form) => <span key={form} className={styles.chip}>{form}</span>)}</span> : null}
                </li>
              ))}
            </ol>
          </button>
        ))}
      </div>

      <p className={styles.summary}>{t("outlineHint")}</p>
      <ol className={styles.lectures}>
        {option.lectures.map((lecture, index) => (
          <li key={`${choice}-${lecture.slug}`} className={`${styles.lecture} ${removed.has(lecture.slug) ? styles.removed : ""}`}>
            <span className={styles.number}>{index + 1}</span>
            <div>
              <input
                className="text-input"
                aria-label={t("lectureTitle", { n: index + 1 })}
                maxLength={120}
                defaultValue={lecture.title}
                disabled={removed.has(lecture.slug)}
                onChange={(event) => setTitles((all) => ({ ...all, [lecture.slug]: event.target.value }))}
              />
              <small>{lecture.summary}</small>
            </div>
            <label className={styles.radio}>
              <input
                type="checkbox"
                checked={removed.has(lecture.slug)}
                onChange={() =>
                  setRemoved((current) => {
                    const next = new Set(current);
                    if (next.has(lecture.slug)) next.delete(lecture.slug);
                    else next.add(lecture.slug);
                    return next;
                  })
                }
              />
              {t("remove")}
            </label>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="primary-button"
        disabled={busy || kept.length === 0}
        onClick={() =>
          onBuild({
            choice,
            keep: kept.map((lecture) => lecture.slug),
            titles: Object.fromEntries(Object.entries(titles).filter(([slug, title]) => !removed.has(slug) && title.trim())),
          })
        }
      >
        {t("buildThis")} <span>→</span>
      </button>
    </div>
  );
}
