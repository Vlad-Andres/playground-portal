"use client";

import { useMessages, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import styles from "./job.module.css";

const STORAGE_KEY = "pg-jokes-off";

/** Real progress only: a bar from finished lectures, otherwise an indeterminate one. Jokes are optional. */
export function Waiting({ label, done, total, showProgress }: { label: string; done: number; total: number; showProgress: boolean }) {
  const t = useTranslations("job");
  const messages = useMessages() as { job?: { waitingLines?: string[] } };
  const lines = messages.job?.waitingLines ?? [];
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // storage blocked: jokes stay on
    }
  }, []);

  useEffect(() => {
    if (hidden || lines.length === 0) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % lines.length), 6000);
    return () => window.clearInterval(timer);
  }, [hidden, lines.length]);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // the choice lasts for this page only
    }
  }

  const value = showProgress && total > 0 ? Math.round((done / total) * 100) : null;
  return (
    <div className="working">
      <div className={styles.progress} role="progressbar" aria-label={label} {...(value === null ? {} : { "aria-valuenow": value, "aria-valuemin": 0, "aria-valuemax": 100 })}>
        <div className={`${styles.bar} ${value === null ? styles.indeterminate : ""}`} style={value === null ? undefined : { width: `${value}%` }} />
      </div>
      <p>{label}</p>
      {!hidden && lines.length ? (
        <p key={index} className={styles.joke} aria-live="off">
          {lines[index % lines.length]}
        </p>
      ) : null}
      <button type="button" className={styles.toggle} onClick={toggle}>{hidden ? t("showJokes") : t("hideJokes")}</button>
    </div>
  );
}
