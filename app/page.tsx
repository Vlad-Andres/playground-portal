import { ArrowRight, ArrowUpRight, CalendarClock, Check, Compass, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";
import { defaultStore } from "@/lib/jobs/store";
import { recordMetric } from "@/lib/metrics";
import styles from "./landing.module.css";

const LOOP = [
  { key: "loop1", Icon: Compass },
  { key: "loop2", Icon: CalendarClock },
  { key: "loop3", Icon: MessageSquareText },
] as const;

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ signin?: string }> }) {
  await recordMetric(defaultStore(), "landing_view", new Date());
  const t = await getTranslations("landing");
  const errors = await getTranslations("errors");
  const tl = await getTranslations("legal");
  const signinFailed = (await searchParams).signin === "failed";
  const em = { em: (chunks: ReactNode) => <em>{chunks}</em> };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <TopBar note={t("tagline")}>
          <a className={styles.topLink} href="#how">{t("navHow")}</a>
          <a className={styles.topCta} href="/create">{t("cta")} <ArrowUpRight size={16} aria-hidden="true" /></a>
        </TopBar>
      </div>

      {signinFailed ? <p className={`${styles.shell} helper helper-error`} role="alert">{errors("signin-failed")}</p> : null}

      {/* 02 / Make your notes worth revisiting */}
      <section className={`${styles.shell} ${styles.hero}`}>
        <div className={styles.heroText}>
          <p className="mono-label">{t("eyebrow")}</p>
          <h1 className={styles.title}>{t.rich("title", em)}</h1>
          <p className={styles.lead}>{t("lead")}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/create">{t("cta")} <ArrowUpRight size={18} aria-hidden="true" /></a>
            <a className={styles.secondary} href="#how">{t("ctaSecondary")}</a>
          </div>
          <ul className={styles.meta}>
            <li><b>{t("meta1")}</b></li>
            <li>{t("meta2")}</li>
            <li>{t("meta3")}</li>
          </ul>
        </div>
        <figure className={styles.mockFigure} aria-hidden="true">
          <div className={styles.mock}>
            <div className={styles.mockBar}><span>study / with ai</span><span className={styles.mockDots}>•••</span></div>
            <div className={styles.mockBody}>
              <div className={styles.mockSide}>
                <small className="mono-label">{t("mock.course")}</small>
                <b>{t("mock.title")}</b>
                <small className="mono-label">{t("mock.lectures")}</small>
                <span>01 {t("mock.l1")}</span>
                <span className={styles.mockActive}>02 {t("mock.l2")}</span>
                <span>03 {t("mock.l3")}</span>
                <hr />
                <span>{t("mock.recall")}</span>
                <span>{t("mock.practice")}</span>
              </div>
              <div className={styles.mockMain}>
                <small className={`mono-label ${styles.mockCrumb}`}>{t("mock.crumb")}</small>
                <b className={styles.mockHeading}>{t("mock.heading")}</b>
                <span className={styles.mockSub}>{t("mock.sub")}</span>
                <small className={`mono-label ${styles.mockChip}`}>{t("mock.quiz")}</small>
                <b className={styles.mockQuestion}>{t("mock.question")}</b>
                <span className={`${styles.mockOption} ${styles.mockRight}`}><i>A</i>{t("mock.a")}<Check size={16} /></span>
                <span className={styles.mockOption}><i>B</i>{t("mock.b")}</span>
                <span className={styles.mockFeedback}><b>{t("mock.right")}</b>{t("mock.why")}</span>
                <small className={`mono-label ${styles.mockCrumb}`}>{t("mock.source")} ↗</small>
              </div>
            </div>
          </div>
          <figcaption className="mono-label">{t("mockCaption")}</figcaption>
        </figure>
      </section>

      {/* 03 / The study rhythm */}
      <p className={styles.rhythm}>{t("rhythm")}</p>

      {/* 04 / An active study space */}
      <section className={styles.dark}>
        <div className={styles.shell}>
          <div className={styles.split}>
            <div>
              <p className="mono-label">{t("activeKicker")}</p>
              <h2 className={styles.h2}>{t("activeTitle")}</h2>
            </div>
            <p className={styles.sideText}>{t("activeLead")}</p>
          </div>
          <div className={styles.cards}>
            <article className={`${styles.card} ${styles.cardLilac}`}>
              <p className="mono-label">{t("card1Label")}</p>
              <h3>{t("card1Title")}</h3>
              <div className={styles.cardDemo}>
                <small className="mono-label">{t("card1Prompt")}</small>
                <b>{t("card1Question")}</b>
                <span className={styles.reveal}>{t("card1Reveal")} ↗</span>
              </div>
              <p>{t("card1Text")}</p>
            </article>
            <article className={`${styles.card} ${styles.cardCream}`}>
              <p className="mono-label">{t("card2Label")}</p>
              <h3>{t("card2Title")}</h3>
              <div className={styles.cardDemo}>
                <span className={styles.answer}><i>A</i>{t("card2Answer")}<Check size={15} aria-hidden="true" /></span>
                <b>{t("card2Note")}</b>
              </div>
              <p>{t("card2Text")}</p>
            </article>
            <article className={`${styles.card} ${styles.cardCoral}`}>
              <p className="mono-label">{t("card3Label")}</p>
              <h3>{t("card3Title")}</h3>
              <div className={styles.cardDemo}>
                <span className={styles.clock}>{t("card3Clock")}</span>
                <small className="mono-label">{t("card3Note")}</small>
              </div>
              <p>{t("card3Text")}</p>
            </article>
          </div>
          <h3 className={styles.loopTitle}>{t("loopTitle")}</h3>
          <ul className={styles.loop}>
            {LOOP.map(({ key, Icon }) => (
              <li key={key}>
                <Icon size={20} aria-hidden="true" />
                <span><b>{t(`${key}Title`)}</b>{t(`${key}Text`)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>{t("activeNote")}</p>
        </div>
      </section>

      {/* 05 / Three steps from material to course */}
      <section id="how" className={`${styles.shell} ${styles.how}`}>
        <div>
          <p className="mono-label">{t("howKicker")}</p>
          <h2 className={styles.h2}>{t("howTitle")}</h2>
          <p className={styles.lead}>{t("howLead")}</p>
          <p className={styles.tag}>{t("meta1")}</p>
        </div>
        <ol className={styles.steps}>
          {([1, 2, 3] as const).map((n) => (
            <li key={n}>
              <span className={styles.stepNumber}>0{n}</span>
              <span><b>{t(`how${n}Title`)}</b>{t(`how${n}Text`)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 06 / Plain-language privacy and sharing */}
      <section className={styles.privacy}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div>
            <p className="mono-label">{t("privacyKicker")}</p>
            <h2 className={styles.h2}>{t("privacyTitle")}</h2>
          </div>
          <div className={styles.privacyItems}>
            {([1, 2] as const).map((n) => (
              <p key={n}><b>{t(`privacy${n}Title`)}</b>{t(`privacy${n}Text`)}</p>
            ))}
            <a href="/privacy">{t("privacyLink")} <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      {/* 07 / Start with your next lecture */}
      <section className={styles.closing}>
        <div className={`${styles.shell} ${styles.closingInner}`}>
          <div>
            <h2 className={styles.h2}>{t.rich("closingTitle", em)}</h2>
            <p>{t("closingNote")}</p>
          </div>
          <a className={styles.primary} href="/create">{t("cta")} <ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
      </section>

      {/* 08 / Footer */}
      <footer className={`${styles.shell} ${styles.footer}`}>
        <span className={styles.footerBrand}>study <span>/</span> with ai</span>
        <span>{t("footer")}</span>
        <span className="legal-links"><a href="/privacy">{tl("footer.privacy")}</a><a href="/terms">{tl("footer.terms")}</a></span>
      </footer>
    </div>
  );
}
