import type { ReactNode } from "react";
// The template's styles load only under /courses/*, so the portal's own pages keep their look.
import "katex/dist/katex.min.css";
import "@site/site.css";
import { themeBootstrapScript } from "@site/lib/theme";
import { SiteShell } from "@site/screens/SiteShell";
import { getTranslations } from "next-intl/server";
import { StudyCounter } from "@/components/course/StudyCounter";
import { FeedbackPrompt } from "@/components/feedback/FeedbackPrompt";
import { COURSE_HOST, courseBase, courseMetadata, courseOr404, type CourseParams } from "@/lib/sites/page";

export async function generateMetadata({ params }: CourseParams) {
  return courseMetadata(params);
}

export default async function CourseLayout({ children, params }: CourseParams & { children: ReactNode }) {
  const { key, data } = await courseOr404(params);
  const t = await getTranslations("report");

  return (
    <div data-course-page lang={data.course.language} className="flex min-h-screen flex-col">
      <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript(data.key) }} />
      {/* Many courses share this origin, so none of them registers an offline service worker. */}
      <SiteShell data={data} base={courseBase(key)} offline={false} host={COURSE_HOST}>
        {children}
      </SiteShell>
      <StudyCounter courseKey={key} />
      <FeedbackPrompt courseKey={key} where="course" variant="course" />
      {/* Course pages may not post forms (form-action 'none'), so reporting happens on a portal page. */}
      <p className="mx-auto w-full max-w-6xl px-4 pb-6 text-xs text-faint sm:px-6">
        <a href={`/report?course=${key}`} className="hover:underline">{t("link")}</a>
      </p>
    </div>
  );
}
