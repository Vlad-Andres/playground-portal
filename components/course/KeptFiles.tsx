"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import styles from "./course.module.css";

export function KeptFiles({ kept, files, bytes, setKeep }: { kept: boolean; files: number; bytes: number; setKeep: (keep: boolean) => Promise<{ ok: boolean }> }) {
  const t = useTranslations("course");
  const format = useFormatter();
  const router = useRouter();
  const change = async (keep: boolean) => {
    if ((await setKeep(keep)).ok) router.refresh();
  };
  return (
    <section className={styles.card}>
      <h2>{t("keptTitle")}</h2>
      <label className={styles.check}>
        <input type="checkbox" checked={kept} onChange={(event) => void change(event.target.checked)} /> {t("keepFiles")}
      </label>
      <p className={styles.muted}>{t("keepHelper")}</p>
      {kept ? (
        <>
          <p className={styles.muted}>{t("usage", { files, size: format.number(bytes / 1024 / 1024, { maximumFractionDigits: 1 }) })}</p>
          <button type="button" className={styles.ghost} onClick={() => void change(false)}>{t("deleteFiles")}</button>
        </>
      ) : null}
    </section>
  );
}
