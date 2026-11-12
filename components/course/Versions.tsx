"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VersionInfo } from "@/lib/sites/library";
import styles from "./course.module.css";

export function Versions({ versions, restore }: { versions: VersionInfo[]; restore: (n: number) => Promise<{ ok: boolean }> }) {
  const t = useTranslations("course");
  const format = useFormatter();
  const router = useRouter();
  const [problem, setProblem] = useState("");
  if (versions.length === 0) return null;
  return (
    <section className={styles.card}>
      <h2>{t("versionsTitle")}</h2>
      <ul className={styles.list}>
        {versions.map((version) => (
          <li key={version.n} className={styles.row}>
            <span>
              {format.dateTime(new Date(version.savedAt), { dateStyle: "medium", timeStyle: "short" })} · {version.title} · {t("lectures", { count: version.lectures })} · {t(`reason.${version.reason}`)}
            </span>
            <button
              type="button"
              className={styles.ghost}
              onClick={async () => {
                if (!window.confirm(t("restoreConfirm"))) return;
                const result = await restore(version.n);
                if (result.ok) router.refresh();
                else setProblem(t("restoreFailed"));
              }}
            >
              {t("restore")}
            </button>
          </li>
        ))}
      </ul>
      {problem ? <p className={styles.error}>{problem}</p> : null}
    </section>
  );
}
