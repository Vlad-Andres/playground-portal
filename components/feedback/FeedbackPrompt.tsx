"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

type Where = "created" | "course";

const noSubscription = () => () => {};
const givenKey = (courseKey: string, where: Where) => `feedback-given:${courseKey}:${where}`;

function alreadyGiven(courseKey: string, where: Where): boolean {
  try {
    return window.localStorage.getItem(givenKey(courseKey, where)) === "1";
  } catch {
    return false;
  }
}

/**
 * "How useful is this?" with 1-5 stars and an optional comment, seen only by the owner.
 * Sends with fetch (course pages may not post forms) and is not asked again in this browser once sent.
 */
export function FeedbackPrompt({ courseKey, where, variant }: { courseKey: string; where: Where; variant: "portal" | "course" }) {
  const t = useTranslations("feedback");
  const given = useSyncExternalStore(noSubscription, () => alreadyGiven(courseKey, where), () => true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (given && state !== "sent") return null;

  const course = variant === "course";
  const box = course ? "mx-auto grid w-full max-w-6xl gap-3 px-4 pb-4 text-sm sm:px-6" : "edit-link feedback-card";

  if (state === "sent") return <div className={box}><p role="status">{t("thanks")}</p></div>;

  async function send() {
    if (rating === 0) return;
    setState("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseKey, where, rating, ...(comment.trim() ? { comment: comment.trim() } : {}) }),
      });
      if (!response.ok) throw new Error(String(response.status));
      try {
        window.localStorage.setItem(givenKey(courseKey, where), "1");
      } catch {
        // asking again later is acceptable
      }
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={box} data-feedback>
      <p className={course ? "font-medium text-ink" : undefined}>{where === "created" ? t("titleCreated") : t("titleCourse")}</p>
      <div className="feedback-stars" role="group" aria-label={t("ratingLabel")}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={rating === value}
            aria-label={t("star", { n: value })}
            onClick={() => setRating(value)}
            className={course ? `rounded-md px-1.5 text-xl leading-none ${value <= rating ? "text-brand" : "text-faint"}` : value <= rating ? "on" : undefined}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 ? (
        <>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t("comment")}
            aria-label={t("comment")}
            className={course ? "w-full rounded-lg border border-line bg-surface p-2 text-sm" : "text-input"}
          />
          <button
            type="button"
            onClick={send}
            disabled={state === "sending"}
            className={course ? "w-fit rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink" : "secondary-button"}
          >
            {t("send")}
          </button>
        </>
      ) : null}
      {state === "error" ? <p role="alert" className={course ? "text-danger" : "helper helper-error"}>{t("error")}</p> : null}
      <p className={course ? "text-xs text-faint" : undefined}>{t("note")}</p>
    </div>
  );
}
