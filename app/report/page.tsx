import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReportForm } from "@/components/report/ReportForm";
import { TopBar } from "@/components/TopBar";
import { defaultStore } from "@/lib/jobs/store";
import { COURSE_KEY, readMeta } from "@/lib/sites/store";

export const metadata = { robots: { index: false, follow: false } };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  if (!course || !COURSE_KEY.test(course)) notFound();
  const meta = await readMeta(defaultStore(), course);
  if (!meta) notFound();
  const t = await getTranslations("report");

  return (
    <main className="legal-page">
      <TopBar />
      <article className="legal">
        <h1>{t("title")}</h1>
        <p>{t("lead", { title: meta.title })}</p>
        <ReportForm courseKey={course} />
        <p className="legal-beta">{t("note")}</p>
      </article>
    </main>
  );
}
