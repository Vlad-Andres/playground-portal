import type { ReactNode } from "react";
import type { SiteData } from "@core/site";
import { SiteFooter } from "@site/components/layout/SiteFooter";
import { ServiceWorkerRegistration } from "@site/components/layout/ServiceWorkerRegistration";
import { SiteHeader } from "@site/components/layout/SiteHeader";
import { indexMetas } from "@site/content/registry";
import { buildSearchRecords } from "@site/lib/search";
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
}: {
  data: SiteData;
  base: string;
  children: ReactNode;
  offline?: boolean;
}) {
  const records = buildSearchRecords(data.index, sitePaths(base).lecture);

  return (
    <SiteProvider data={data} base={base}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink"
      >
        Skip to content
      </a>
      <SiteHeader metas={indexMetas(data.index)} records={records} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter course={data.course} />
      {offline ? <ServiceWorkerRegistration /> : null}
    </SiteProvider>
  );
}
