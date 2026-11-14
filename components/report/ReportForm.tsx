"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

const CATEGORIES = ["wrong-content", "copyright", "other"] as const;

/** Sends a report about one course; the course text is never part of it. */
export function ReportForm({ courseKey }: { courseKey: string }) {
  const t = useTranslations("report");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "busy">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseKey, category: String(form.get("category")), message: String(form.get("message") ?? ""), email: String(form.get("email") ?? "") }),
      });
      setState(response.ok ? "sent" : response.status === 429 ? "busy" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") return <p className="helper" role="status">{t("sent")}</p>;

  return (
    <form className="report-form" onSubmit={submit}>
      <fieldset>
        <legend className="field-label">{t("category")}</legend>
        {CATEGORIES.map((category, index) => (
          <label key={category} className="option-card">
            <input type="radio" name="category" value={category} defaultChecked={index === 0} />
            <span><b>{t(`categories.${category}`)}</b></span>
          </label>
        ))}
      </fieldset>
      <label className="field-label" htmlFor="report-message">{t("message")}</label>
      <textarea id="report-message" name="message" className="text-input" maxLength={1000} rows={5} />
      <label className="field-label" htmlFor="report-email">{t("email")}</label>
      <input id="report-email" name="email" type="email" className="text-input" maxLength={200} autoComplete="email" />
      <button className="primary-button" type="submit" disabled={state === "sending"}>{t("send")} <span>→</span></button>
      {state === "error" ? <p className="helper helper-error" role="alert">{t("error")}</p> : null}
      {state === "busy" ? <p className="helper helper-error" role="alert">{t("busy")}</p> : null}
    </form>
  );
}
