import type { SiteHost } from "@core/site";
import type { Course } from "@site/content/types";

export function SiteFooter({ course, host }: { course: Course; host: SiteHost }) {
  const { name, homeUrl } = host.brand;
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-2 px-4 py-8 text-sm text-faint sm:px-6">
        <p className="font-medium text-muted">{course.title}</p>
        <p>{course.footerText ?? `${course.description} Progress is stored locally in your browser.`}</p>
        {homeUrl ? (
          <p>
            <a href={`${homeUrl}?from=course`} className="font-medium text-brand hover:underline">
              {`Made with ${name} — make your own`}
            </a>
          </p>
        ) : null}
      </div>
    </footer>
  );
}
