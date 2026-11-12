import { BookOpen, ListChecks, Puzzle, Layers, Timer, Smartphone, ArrowRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LavaBackground } from "@/components/landing/LavaBackground";
import { Pipeline } from "@/components/landing/Pipeline";
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

const SIZES = ["large", "wide", "wide", "small", "small", "small"] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  return (
    <main className={styles.page}>
      <LavaBackground />
      <TopBar>
        <a className={styles.topCta} href="/create">{t("cta")}</a>
      </TopBar>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className="eyebrow"><span className="eyebrow-line" /> {t("eyebrow")}</div>
          <h1 className={styles.title}>{t.rich("title", { em: (chunks) => <em>{chunks}</em> })}</h1>
          <p className={styles.lead}>{t("lead")}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/create">{t("cta")} <ArrowRight size={18} aria-hidden="true" /></a>
            <a className={styles.secondary} href="#how">{t("ctaSecondary")}</a>
          </div>
        </div>

        <div className={styles.preview} aria-hidden="true">
          <div className={styles.previewCard}>
            <span className={styles.previewTag}><Sparkles size={13} aria-hidden="true" /> {t("previewLabel")}</span>
            <h3 className={styles.previewTitle}>{t("previewTitle")}</h3>
            <p className={styles.previewLine}>{t("previewLine")}</p>
            <div className={styles.previewQuiz}>
              <span className={styles.previewKicker}>{t("previewQuiz")}</span>
              <span className={styles.previewQuizQ}>{t("previewQuizQ")}</span>
            </div>
            <div className={styles.previewRecall}>
              <span className={styles.previewKicker}>{t("previewRecall")}</span>
              <span className={styles.previewRecallA}>{t("previewRecallA")}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className={styles.section} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.heading}>{t("howTitle")}</h2>
        <Pipeline />
      </section>

      <section className={styles.section} aria-labelledby="features-title">
        <h2 id="features-title" className={styles.heading}>{t("featuresTitle")}</h2>
        <ul className={styles.bento}>
          {FEATURES.map(({ key, Icon }, index) => (
            <li key={key} className={`${styles.feature} ${styles[SIZES[index]]}`}>
              <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
              <span className={styles.featureText}>{t(key)}</span>
            </li>
          ))}
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
