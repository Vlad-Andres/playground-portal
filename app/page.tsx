import { BookOpen, ListChecks, Puzzle, Layers, Timer, Smartphone, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { HeroBackground } from "@/components/landing/HeroBackground";
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
      <TopBar>
        <a className={styles.topCta} href="/create">{t("cta")}</a>
      </TopBar>

      <section className={styles.hero}>
        <HeroBackground />
        <div className={styles.heroInner}>
          <div className="eyebrow"><span className="eyebrow-line" /> {t("eyebrow")}</div>
          <h1 className={styles.title}>{t.rich("title", { em: (chunks) => <em>{chunks}</em> })}</h1>
          <p className={styles.lead}>{t("lead")}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/create">{t("cta")} <ArrowRight size={18} aria-hidden="true" /></a>
            <a className={styles.secondary} href="#how">{t("ctaSecondary")}</a>
          </div>
        </div>
      </section>

      <section id="how" className={styles.section} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.heading}>{t("howTitle")}</h2>
        <ol className={styles.steps}>
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className={styles.step}>
              <span className={styles.stepNumber}>{n}</span>
              <h3>{t(`how${n}Title`)}</h3>
              <p>{t(`how${n}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="features-title">
        <h2 id="features-title" className={styles.heading}>{t("featuresTitle")}</h2>
        <ul className={styles.features}>
          {FEATURES.map(({ key, Icon }) => (
            <li key={key} className={styles.feature}>
              <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.closing}>
        <h2>{t("closingTitle")}</h2>
        <a className={styles.primary} href="/create">{t("cta")} <ArrowRight size={18} aria-hidden="true" /></a>
      </section>

      <footer>{t("footer")}</footer>
    </main>
  );
}
