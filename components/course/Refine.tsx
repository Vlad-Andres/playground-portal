"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useErrorText } from "@/components/useErrorText";
import styles from "./course.module.css";

export function Refine({ courseKey, roundsLeft }: { courseKey: string; roundsLeft: number }) {
  const t = useTranslations("course");
  const errorText = useErrorText();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function submit() {
    setBusy(true);
    setProblem("");
    const response = await fetch(`/api/courses/${courseKey}/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "refine", note }) });
    const body = (await response.json().catch(() => ({}))) as { id?: string; code?: string };
    if (response.ok && body.id) window.location.assign(`/jobs/${body.id}`);
    else {
      setProblem(errorText(body.code));
      setBusy(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>{t("refineTitle")}</h2>
      <p className={styles.muted}>{t("roundsLeft", { count: roundsLeft })}</p>
      <textarea className={styles.textarea} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("refineExamples")} disabled={roundsLeft === 0} aria-label={t("refineTitle")} />
      <p className={styles.muted}>{note.length}/1000</p>
      <button type="button" className={styles.button} disabled={busy || roundsLeft === 0 || note.trim() === ""} onClick={() => void submit()}>{t("refine")}</button>
      {roundsLeft === 0 ? <p className={styles.muted}>{t("noRounds")}</p> : null}
      {problem ? <p className={styles.error}>{problem}</p> : null}
    </section>
  );
}
