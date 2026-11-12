"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UploadScene, OutlineScene, SiteScene, ShareScene } from "./Scene";
import styles from "./pipeline.module.css";

const SCENES = [
  { Scene: UploadScene },
  { Scene: OutlineScene },
  { Scene: SiteScene },
  { Scene: ShareScene },
] as const;

const INTERVAL_MS = 5000;

export function Pipeline() {
  const t = useTranslations("landing");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const go = (index: number) => {
    setActive(((index % SCENES.length) + SCENES.length) % SCENES.length);
  };

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => go(active + 1), INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, paused]);

  return (
    <div
      ref={containerRef}
      className={styles.pipeline}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ transform: `translateX(calc(-${active} * 100%))` }}
        >
          {SCENES.map(({ Scene }, i) => (
            <div key={i} className={styles.slide} aria-roledescription="slide" aria-label={t(`pipeline${i + 1}Title`)}>
              <div className={styles.art}>
                <Scene />
              </div>
              <div className={styles.slideBody}>
                <span className={styles.slideNum} aria-hidden="true">{i + 1}</span>
                <h3 className={styles.slideTitle}>{t(`pipeline${i + 1}Title`)}</h3>
                <p className={styles.slideText}>{t(`pipeline${i + 1}Text`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.arrow}
          aria-label={t("prev")}
          onClick={() => go(active - 1)}
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>

        <div className={styles.dots} role="tablist" aria-label={t("pipelineAria")}>
          {SCENES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={t(`pipeline${i + 1}Title`)}
              className={`${styles.dot} ${active === i ? styles.activeDot : ""}`}
              onClick={() => go(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.arrow}
          aria-label={t("next")}
          onClick={() => go(active + 1)}
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
