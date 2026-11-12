import type { ReactNode } from "react";
// The template's styles load only under /courses/*, so the portal's own pages keep their look.
import "katex/dist/katex.min.css";
import "@site/site.css";
import { themeBootstrapScript } from "@site/lib/theme";
import { themeCss } from "@site/lib/theme-css";
import { SiteShell } from "@site/screens/SiteShell";
import { courseBase, courseMetadata, courseOr404, type CourseParams } from "@/lib/sites/page";

export async function generateMetadata({ params }: CourseParams) {
  return courseMetadata(params);
}

export default async function CourseLayout({ children, params }: CourseParams & { children: ReactNode }) {
  const { key, data } = await courseOr404(params);
  const accentCss = themeCss(data.course.theme);

  return (
    <div lang={data.course.language} className="flex min-h-screen flex-col">
      <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript(data.key) }} />
      {accentCss ? <style dangerouslySetInnerHTML={{ __html: accentCss }} /> : null}
      {/* Many courses share this origin, so none of them registers an offline service worker. */}
      <SiteShell data={data} base={courseBase(key)} offline={false}>
        {children}
      </SiteShell>
    </div>
  );
}
