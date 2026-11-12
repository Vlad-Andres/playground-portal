"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ListChecks, Rocket, Share2, Upload } from "lucide-react";
import styles from "./pipeline.module.css";

const ICONS = [Upload, ListChecks, Rocket, Share2] as const;
const URLS = ["/create", "/jobs", "/courses/energy-in-plants", "/courses/energy-in-plants"] as const;

function Frame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <div className={styles.chrome} aria-hidden="true">
        <span className={styles.dots}>
          <i className={`${styles.dot} ${styles.green}`} />
          <i className={`${styles.dot} ${styles.orange}`} />
          <i className={`${styles.dot} ${styles.mint}`} />
        </span>
        <span className={styles.urlbar}>playground.{url}</span>
      </div>
      <div className={styles.mock}>{children}</div>
    </div>
  );
}

export function Pipeline() {
  const t = useTranslations("landing");
  const [active, setActive] = useState(0);

  return (
    <div className={styles.pipeline}>
      <div className={styles.tabs} role="tablist" aria-label={t("pipelineAria")}>
        {ICONS.map((Icon, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            id={`pipeline-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`pipeline-panel-${i}`}
            className={`${styles.tab} ${active === i ? styles.active : ""}`}
            onClick={() => setActive(i)}
          >
            <span className={styles.tabNum} aria-hidden="true">{i + 1}</span>
            <Icon size={17} aria-hidden="true" />
            <span className={styles.tabLabel}>{t(`pipeline${i + 1}Title`)}</span>
          </button>
        ))}
      </div>

      <div className={styles.stage}>
        <div role="tabpanel" id={`pipeline-panel-${active}`} aria-labelledby={`pipeline-tab-${active}`} className={styles.panel}>
          {active === 0 && (
            <Frame url={URLS[0]}>
              <div className={styles.drop}>
                <Upload size={22} aria-hidden="true" />
                <span>{t("pipelineDrop")}</span>
                <small>PDF · TXT · MD</small>
              </div>
              <div className={styles.fileChip}><span className={styles.fileDot} aria-hidden="true" /> {t("pipelineFile")} <em>{t("pipelineReady")}</em></div>
            </Frame>
          )}

          {active === 1 && (
            <Frame url={URLS[1]}>
              <ul className={styles.rows}>
                {[1, 2, 3].map((n) => (
                  <li key={n} className={styles.row}>
                    <span className={styles.rowNum} aria-hidden="true">{n}</span>
                    <span className={styles.rowTitle}>{t(`pipelineOutline${n}`)}</span>
                    <span className={styles.rowKeep} aria-hidden="true">✓</span>
                  </li>
                ))}
              </ul>
              <span className={styles.buildBtn}>{t("pipelineBuild")} →</span>
            </Frame>
          )}

          {active === 2 && (
            <Frame url={URLS[2]}>
              <div className={styles.siteHead}><span className={styles.siteMark} aria-hidden="true">✦</span> {t("pipelineSiteTag")}</div>
              <div className={styles.quizRow}><span className={styles.kicker}>{t("pipelineQuiz")}</span><span>{t("pipelineQuizQ")}</span></div>
              <div className={styles.flashRow}><span className={styles.kicker}>{t("pipelineFlashcard")}</span><span>{t("pipelineFlashcardA")}</span></div>
              <span className={styles.widgetChip}>{t("pipelineWidget")}</span>
            </Frame>
          )}

          {active === 3 && (
            <Frame url={URLS[3]}>
              <div className={styles.shareRow}><span>{t("pipelineShare")}</span><code>/courses/energy-in-plants</code></div>
              <div className={styles.editBox}>
                <span className={styles.editTitle}>{t("pipelineEdit")}</span>
                <small>{t("pipelineEditHint")}</small>
              </div>
            </Frame>
          )}

          <p className={styles.caption}>{t(`pipeline${active + 1}Text`)}</p>
        </div>
      </div>
    </div>
  );
}
