"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ContextQuestion } from "@core/generate/index";
import styles from "./job.module.css";

export function Questions({ questions, onSubmit, busy }: { questions: ContextQuestion[]; onSubmit: (answers: Record<string, string>) => void; busy: boolean }) {
  const t = useTranslations("job");
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, question.id === "focus" ? "skip" : question.options[0]?.id ?? ""])),
  );
  const options = (question: ContextQuestion) => (question.id === "focus" ? [...question.options, { id: "skip", label: t("focusSkip") }] : question.options);
  return (
    <form
      className={styles.block}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(answers);
      }}
    >
      {questions.map((question) => (
        <fieldset key={question.id} className={styles.fieldset}>
          <legend>{question.id === "language" ? t("questionLanguage") : t("questionFocus")}</legend>
          {options(question).map((option) => (
            <label key={option.id} className={styles.radio}>
              <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((all) => ({ ...all, [question.id]: option.id }))} />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <button type="submit" className="primary-button" disabled={busy}>{t("continue")} <span>→</span></button>
    </form>
  );
}
