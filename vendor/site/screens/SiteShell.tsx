import type { ReactNode } from "react";
import type { SiteData, SiteHost } from "@core/site";
import { DEFAULT_HOST, siteFeatures } from "@core/site";
import { CourseAssistant } from "@site/components/assistant/CourseAssistant";
import { SiteFooter } from "@site/components/layout/SiteFooter";
import { ServiceWorkerRegistration } from "@site/components/layout/ServiceWorkerRegistration";
import { SiteHeader } from "@site/components/layout/SiteHeader";
import { indexMetas } from "@site/content/registry";
import { buildSearchRecords } from "@site/lib/search";
import { siteToContext } from "@site/lib/assistant/courseContext";
import { SiteProvider } from "@site/site/context";
import { sitePaths } from "@site/site/paths";

/**
 * Header, main content and footer for one site, with its data available to client components.
 * `offline` registers the service worker that makes a standalone site work offline; a host that serves
 * many sites from one origin (the portal) passes false, since one worker would cover all of them.
 */
export function SiteShell({
  data,
  base,
  children,
  offline = true,
  host = DEFAULT_HOST,
}: {
  data: SiteData;
  base: string;
  children: ReactNode;
  offline?: boolean;
  /** Brand and links of the host serving this course; standalone sites keep the default. */
  host?: SiteHost;
}) {
  const records = buildSearchRecords(data.index, sitePaths(base).lecture);
  const assistantContext = siteToContext(data);
  const showAssistant = siteFeatures(data.course).assistant;
  // A site served under a path (e.g. /courses/<key>/ on the portal) shares its origin with other
  // sites, so a single service worker would cover all of them and the host may not serve /sw.js.
  const enableOffline = offline && base === "";

  return (
    <SiteProvider data={data} base={base} host={host}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink"
      >
        Skip to content
      </a>
      <SiteHeader metas={indexMetas(data.index)} records={records} />
      <main id="main" className="flex-1" data-assistant-scope>
        {children}
      </main>
      <SiteFooter course={data.course} host={host} />
      {enableOffline ? <ServiceWorkerRegistration /> : null}
      {showAssistant ? <CourseAssistant context={assistantContext} /> : null}
    </SiteProvider>
  );
}
