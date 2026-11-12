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

      <section className={styles.closing}>
        <h2>{t("closingTitle")}</h2>
        <a className={styles.primary} href="/create">{t("cta")} <ArrowRight size={18} aria-hidden="true" /></a>
      </section>

      <footer className={styles.footer}>{t("footer")}</footer>
    </main>
  );
}
