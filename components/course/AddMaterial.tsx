"use client";

import { useTranslations } from "next-intl";
import { useState, type ChangeEvent } from "react";
import { checkMaterials, type Material } from "@core/generate/index";
import { useErrorText } from "@/components/useErrorText";
import { extractMaterial } from "@/lib/extract-pdf.client";
import styles from "./course.module.css";

export function AddMaterial({ courseKey }: { courseKey: string }) {
  const t = useTranslations("course");
  const errorText = useErrorText();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setProblem("");
    try {
      setMaterials(await Promise.all(files.map((file) => extractMaterial(file))));
    } catch {
      setProblem(errorText("bad-request"));
    }
  }

  async function submit() {
    const check = checkMaterials(materials);
    if (!check.ok) {
      setProblem(errorText(check.code));
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/courses/${courseKey}/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "append", materials }) });
    const body = (await response.json().catch(() => ({}))) as { id?: string; code?: string };
    if (response.ok && body.id) window.location.assign(`/jobs/${body.id}`);
    else {
      setProblem(errorText(body.code));
      setBusy(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>{t("addTitle")}</h2>
      <p className={styles.muted}>{t("addHelper")}</p>
      <input type="file" multiple accept="application/pdf,.pdf,.txt,.md,text/plain,text/markdown" onChange={(event) => void pick(event)} aria-label={t("addTitle")} />
      <button type="button" className={styles.button} disabled={busy || materials.length === 0} onClick={() => void submit()}>{t("addButton")}</button>
      {problem ? <p className={styles.error}>{problem}</p> : null}
    </section>
  );
}
