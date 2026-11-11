import type { Course } from "@site/content/types";

export function SiteFooter({ course }: { course: Course }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-2 px-4 py-8 text-sm text-faint sm:px-6">
        <p className="font-medium text-muted">{course.title}</p>
        <p>{course.footerText ?? `${course.description} Progress is stored locally in your browser.`}</p>
      </div>
    </footer>
  );
}
