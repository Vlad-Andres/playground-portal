"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { checkMaterials, LIMITS, type Brief, type Material } from "@core/generate/index";
import { useErrorText } from "@/components/useErrorText";
import { extractMaterial } from "@/lib/extract-pdf.client";

const LANGUAGE_CODES = ["en", "nl", "de", "fr", "es", "it", "pt", "ro", "pl"] as const;
const DEPTHS = ["cram", "standard", "deep"] as const;
const DEPTH_KEYS = { cram: ["depthCram", "depthCramHint"], standard: ["depthStandard", "depthStandardHint"], deep: ["depthDeep", "depthDeepHint"] } as const;
const SWATCHES = ["#237b55", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0f766e"];
const MAX_TEXT_BYTES = 4 * 1024 * 1024;

type MaterialCode = "empty" | "too-many-files" | "too-many-pages" | "too-long" | "scanned";

interface Entry {
  key: string;
  name: string;
  state: "reading" | "ready" | "error";
  material?: Material;
  /** A translation key under "create" or a material code; never English text. */
  problem?: { kind: "scanned" } | { kind: "read-failed" } | { kind: "material"; code: MaterialCode };
}

function textBytes(materials: Material[]): number {
  return new TextEncoder().encode(JSON.stringify(materials)).length;
}

export function Builder({ announcement }: { announcement?: string }) {
  const router = useRouter();
  const t = useTranslations("create");
  const tm = useTranslations("materials");
  const format = useFormatter();
  const locale = useLocale();
  const errorText = useErrorText();
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
  const languageNames = new Intl.DisplayNames([locale], { type: "language" });

  function materialText(code: MaterialCode, list: Material[]): string {
    const pages = list.reduce((total, material) => total + material.pages.length, 0);
    const characters = list.reduce((total, material) => total + material.pages.reduce((sum, page) => sum + page.text.length, 0), 0);
    return tm(code, {
      max: code === "too-many-files" ? LIMITS.files : code === "too-many-pages" ? LIMITS.pages : LIMITS.characters,
      count: code === "too-many-pages" ? pages : characters,
    });
  }

  function problemText(problem: NonNullable<Entry["problem"]>, material?: Material): string {
    if (problem.kind === "scanned") return t("scannedPdf");
    if (problem.kind === "read-failed") return t("readFailed");
    return materialText(problem.code, material ? [material] : []);
  }

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
              : { state: "error", material, problem: check.code === "scanned" ? { kind: "scanned" } : { kind: "material", code: check.code } };
        } catch {
          update = { state: "error", problem: { kind: "read-failed" } };
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
    setStatus(t("sending"));
    let response: Response;
    try {
      response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: String(form.get("accessCode") ?? ""), brief, materials: ready }),
      });
    } catch {
      setBusy(false);
      setStatus(t("uploadFailed"));
      return;
    }
    let body: { id?: string; code?: string } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      // the platform answered with something that is not JSON
    }
    if (!response.ok || !body.id) {
      setBusy(false);
      const isMaterialCode = body.code && ["empty", "too-many-files", "too-many-pages", "too-long", "scanned"].includes(body.code);
      setStatus(isMaterialCode ? materialText(body.code as MaterialCode, ready) : errorText(body.code));
      return;
    }
    router.push(`/jobs/${body.id}`);
  }

  const steps = [t("stepMaterials"), t("stepShape"), t("stepCreate")];

  return (
    <>
      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> {t("eyebrow")}</div>
        <h1>{t.rich("title", { em: (chunks) => <em>{chunks}</em> })}</h1>
        <p className="hero-copy">{t("lead")}</p>
        {announcement ? <p className="helper">{announcement}</p> : null}
      </section>

      <div className="stepper" aria-label={t("stepperLabel")}>
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
            <div><span className="panel-kicker">01</span><h2>{t("bringTitle")}</h2></div>
            <span className="panel-hint">{t("bringHint", { max: LIMITS.files })}</span>
          </div>
          <label className="dropzone">
            <input type="file" accept="application/pdf,.pdf,.txt,.md,text/plain,text/markdown" multiple onChange={addFiles} />
            <span className="upload-icon">↑</span>
            <strong>{entries.length ? t("dropAdd") : t("dropHere")}</strong>
            <span>{t("dropOr")}</span>
          </label>
          {entries.length > 0 ? (
            <ul className="file-list" aria-label={t("selectedFiles")}>
              {entries.map((entry) => (
                <li key={entry.key} className={entry.state === "error" ? "file-error" : undefined}>
                  <span className="file-type">{/\.pdf$/i.test(entry.name) ? "PDF" : "TXT"}</span>
                  <span className="file-name">
                    <b>{entry.name}</b>
                    <small>
                      {entry.state === "reading"
                        ? t("reading")
                        : entry.state === "error" && entry.problem
                          ? problemText(entry.problem, entry.material)
                          : t("fileStats", {
                              pages: entry.material?.pages.length ?? 0,
                              chars: format.number(entry.material?.pages.reduce((sum, page) => sum + page.text.length, 0) ?? 0),
                            })}
                    </small>
                  </span>
                  <button type="button" onClick={() => setEntries((current) => current.filter((item) => item.key !== entry.key))} aria-label={t("removeFile", { name: entry.name })}>×</button>
                </li>
              ))}
            </ul>
          ) : null}
          {overall && !overall.ok ? <p className="helper helper-error">{materialText(overall.code, ready)}</p> : null}
          {bytes > MAX_TEXT_BYTES ? <p className="helper helper-error">{t("bigText")}</p> : null}
          <p className="helper">{t("privacy")}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">02</span><h2>{t("shapeTitle")}</h2></div>
          </div>
          <label className="field-label">{t("siteTitle")} <span>{t("optional")}</span>
            <input className="text-input" name="title" maxLength={120} placeholder={t("titlePlaceholder")} />
          </label>
          <div className="grid-two">
            <label className="field-label">{t("language")}
              <select name="language" defaultValue="en">
                {LANGUAGE_CODES.map((code) => <option key={code} value={code}>{languageNames.of(code)}</option>)}
              </select>
            </label>
            <label className="field-label">{t("level")}
              <select name="level" defaultValue="university">
                <option value="school">{t("levelSchool")}</option>
                <option value="university">{t("levelUniversity")}</option>
                <option value="professional">{t("levelProfessional")}</option>
              </select>
            </label>
          </div>
          <fieldset className="field-set">
            <legend className="field-label">{t("depth")}</legend>
            <div className="option-grid three">
              {DEPTHS.map((value) => (
                <label className="option-card" key={value}>
                  <input type="radio" name="depth" value={value} defaultChecked={value === "standard"} />
                  <span><b>{t(DEPTH_KEYS[value][0])}</b><small>{t(DEPTH_KEYS[value][1])}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="field-set">
            <legend className="field-label">{t("accent")}</legend>
            <div className="swatches">
              {SWATCHES.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`swatch ${accent === color ? "selected" : ""}`}
                  style={{ background: color }}
                  onClick={() => setAccent(color)}
                  aria-label={t("accentAria", { color })}
                  aria-pressed={accent === color}
                />
              ))}
              <label className="swatch-custom">
                <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} aria-label={t("accentCustomAria")} />
                {t("accentCustom")}
              </label>
            </div>
          </fieldset>
          <div className="option-grid">
            <label className="option-card"><input name="quizzes" type="checkbox" defaultChecked /><span><b>{t("quizzes")}</b><small>{t("quizzesHint")}</small></span></label>
            <label className="option-card"><input name="widgets" type="checkbox" defaultChecked /><span><b>{t("widgets")}</b><small>{t("widgetsHint")}</small></span></label>
            <label className="option-card"><input name="examMode" type="checkbox" /><span><b>{t("examMode")}</b><small>{t("examModeHint")}</small></span></label>
          </div>
          <label className="field-label" htmlFor="context">{t("context")} <span>{t("contextCount", { count: format.number(context.length), max: format.number(LIMITS.contextCharacters) })}</span></label>
          <textarea id="context" maxLength={LIMITS.contextCharacters} value={context} onChange={(event) => setContext(event.target.value)} placeholder={t("contextPlaceholder")} />
        </section>

        <section className="panel review-panel">
          <div className="panel-heading">
            <div><span className="panel-kicker">03</span><h2>{t("createTitle")}</h2></div>
          </div>
          <div className="review-row"><span className="review-icon">◈</span><span><b>{t("reviewFirst")}</b><small>{t("reviewHint")}</small></span></div>
          <label className="field-label review-label" htmlFor="accessCode">{t("accessCode")}</label>
          <input id="accessCode" name="accessCode" type="password" autoComplete="off" required />
          <button className="primary-button" type="submit" disabled={busy || reading || !overall?.ok || bytes > MAX_TEXT_BYTES}>
            {t("submit")} <span>→</span>
          </button>
          <p className="status" aria-live="polite">{reading ? t("readingFiles") : status}</p>
        </section>
      </form>

      <footer>{t("footer")}</footer>
    </>
  );
}
