"use client";

import { useTranslations } from "next-intl";
import { useState, type MouseEvent } from "react";
import styles from "./job.module.css";

/** The real course page in a frame; "Open" grows it to the whole window, then navigates. Never redirects by itself. */
export function CoursePreview({ siteUrl }: { siteUrl: string }) {
  const t = useTranslations("job");
  const [grown, setGrown] = useState(false);

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    setGrown(true);
    window.setTimeout(() => window.location.assign(siteUrl), 400);
  }

  return (
    <div className={styles.preview}>
      <div className={`${styles.frameBox} ${grown ? styles.grown : ""}`}>
        <iframe src={siteUrl} title={t("previewTitle")} loading="lazy" tabIndex={-1} />
      </div>
      <a className="primary-button" href={siteUrl} onClick={open}>{t("openSite")} <span>→</span></a>
    </div>
  );
}
