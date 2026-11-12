import { BookOpen, ListChecks, Puzzle, Layers, Timer, Smartphone, ArrowRight, Sparkles, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import styles from "./landing.module.css";

const FEATURES = [
  { key: "f1", Icon: BookOpen },
  { key: "f2", Icon: ListChecks },
  { key: "f3", Icon: Puzzle },
  { key: "f4", Icon: Layers },
  { key: "f5", Icon: Timer },
  { key: "f6", Icon: Smartphone },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  return (
    <main className={styles.page}>
      <style dangerouslySetInnerHTML={{ __html: "body { background: #faf7f2; color: #1e1b18; }" }} />
      <TopBar>
        <a className={styles.topCta} href="/create">{t("cta")}</a>
      </TopBar>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.eyebrow}><span className={styles.eyebrowLine} /> {t("eyebrow")}</div>
          <h1 className={styles.title}>{t.rich("title", { em: (chunks) => <em>{chunks}</em> })}</h1>
          <p className={styles.lead}>{t("lead")}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/create">{t("cta")} <ArrowRight size={18} aria-hidden="true" /></a>
            <a className={styles.secondary} href="#how">{t("ctaSecondary")}</a>
          </div>
        </div>

        <div className={styles.composition} aria-hidden="true">
          <div className={`${styles.floatCard} ${styles.courseCard}`}>
            <span className={styles.cardTag}><Sparkles size={11} aria-hidden="true" /> {t("previewLabel")}</span>
            <h3 className={styles.cardTitle}>{t("previewTitle")}</h3>
            <p className={styles.cardLine}>{t("previewLine")}</p>
          </div>

          <div className={`${styles.floatCard} ${styles.quizCard}`}>
            <span className={styles.cardKicker}>{t("previewQuiz")}</span>
            <p className={styles.cardQ}>{t("previewQuizQ")}</p>
          </div>

          <div className={`${styles.floatCard} ${styles.phoneCard}`}>
            <div className={styles.phoneBar}><span className={styles.phoneDot} /><span className={styles.phoneDot} /></div>
            <div className={styles.phoneScreen}>{t("pipelineFlashcardA")}</div>
          </div>

          <span className={styles.fileChip}><FileText size={14} aria-hidden="true" /> {t("pipelineFile")}</span>
        </div>
      </section>

      <section id="how" className={styles.section} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.heading}>{t("howTitle")}</h2>
        <ol className={styles.steps}>
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">{n}</span>
              <h3>{t(`how${n}Title`)}</h3>
              <p>{t(`how${n}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="features-title">
        <div className={styles.featureSplit}>
          <div className={styles.featureVisual}>
            <div className={styles.bigCard}>
              <span className={styles.cardTag}>{t("pipelineSiteTag")}</span>
              <h3 className={styles.cardTitle}>{t("previewTitle")}</h3>
              <p className={styles.cardLine}>{t("previewLine")}</p>
              <div className={styles.quizRow}>
                <span className={styles.cardKicker}>{t("previewQuiz")}</span>
                <p className={styles.cardQ}>{t("previewQuizQ")}</p>
              </div>
              <div className={styles.flashRow}>
                <span className={styles.cardKicker}>{t("previewRecall")}</span>
                <p className={styles.cardA}>{t("previewRecallA")}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 id="features-title" className={styles.heading}>{t("featuresTitle")}</h2>
            <ul className={styles.featureList}>
              {FEATURES.map(({ key, Icon }) => (
                <li key={key} className={styles.featureItem}>
                  <h3><span className={styles.featureIcon}><Icon size={15} aria-hidden="true" /></span>{t(`${key}Title`)}</h3>
                  <p>{t(key)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="widgets-title">
        <div className={styles.widgetIntro}>
          <h2 id="widgets-title" className={styles.heading}>{t("widgetsTitle")}</h2>
          <p>{t("widgetsSubtitle")}</p>
        </div>
        <ul className={styles.widgetGrid}>
          <li className={styles.widgetCard}>
            <div className={styles.widgetVisual} aria-hidden="true">
              <div className={styles.barChart}>
                {[42, 72, 55, 88].map((h, i) => (
                  <div key={i} className={styles.bar} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <h3>{t("widget1Title")}</h3>
            <p>{t("widget1Text")}</p>
          </li>

          <li className={styles.widgetCard}>
            <div className={styles.widgetVisual} aria-hidden="true">
              <div className={styles.memoryGrid}>
                <div className={styles.memoryCard}>ATP</div>
                <div className={`${styles.memoryCard} ${styles.memoryHidden}`}>?</div>
                <div className={`${styles.memoryCard} ${styles.memoryHidden}`}>?</div>
                <div className={styles.memoryCard}>Glucose</div>
              </div>
            </div>
            <h3>{t("widget2Title")}</h3>
            <p>{t("widget2Text")}</p>
          </li>

          <li className={styles.widgetCard}>
            <div className={styles.widgetVisual} aria-hidden="true">
              <div className={styles.examCard}>
                <div className={styles.examHeader}>
                  <span className={styles.examTimer}>12:00</span>
                  <span className={styles.examCounter}>3/10</span>
                </div>
                <div className={styles.examProgress}><div /></div>
                <div className={styles.examOption}>Photosynthesis</div>
                <div className={styles.examOption}>Respiration</div>
                <div className={styles.examOption}>Osmosis</div>
              </div>
            </div>
            <h3>{t("widget3Title")}</h3>
            <p>{t("widget3Text")}</p>
          </li>

          <li className={styles.widgetCard}>
            <div className={styles.widgetVisual} aria-hidden="true">
              <div className={styles.orderBlocks}>
                {['1', '3', '2', '4'].map((n, i) => (
                  <div key={i} className={styles.orderBlock}>{n}</div>
                ))}
              </div>
            </div>
            <h3>{t("widget4Title")}</h3>
            <p>{t("widget4Text")}</p>
          </li>
        </ul>
      </section>

      <section className={styles.closing}>
        <h2>{t("closingTitle")}</h2>
        <a className={styles.primary} href="/create">{t("cta")} <ArrowRight size={18} aria-hidden="true" /></a>
      </section>

      <footer className={styles.footer}>{t("footer")}</footer>
    </main>
  );
}
