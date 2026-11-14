import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/TopBar";

/** A privacy or terms page: one heading and paragraph per section, from the messages. */
export async function LegalPage({ page }: { page: "privacy" | "terms" }) {
  const t = await getTranslations("legal");
  const sections = t.raw(`${page}.sections`) as { heading: string; body: string }[];
  const contact = process.env.CONTACT_EMAIL?.trim() || t("contactFallback");

  return (
    <main className="legal-page">
      <TopBar />
      <article className="legal">
        <h1>{t(`${page}.title`)}</h1>
        <p className="legal-beta">{t(`${page}.beta`)}</p>
        {sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body.replace("{contact}", contact)}</p>
          </section>
        ))}
        <p><a href="/">{t("back")}</a></p>
      </article>
    </main>
  );
}
