import type { Course } from "@core/schema";
import { Markdown } from "@site/components/content/Markdown";
import { Card } from "@site/components/ui/Card";

/** The course's own welcome (written from the material): an intro, highlights and a study path. */
export function CourseWelcome({ home }: { home: NonNullable<Course["home"]> }) {
  const highlights = home.highlights ?? [];
  const studyPath = home.studyPath ?? [];
  return (
    <section data-course-welcome className="grid gap-5">
      {home.intro ? <Markdown className="max-w-3xl text-base text-muted">{home.intro}</Markdown> : null}
      {highlights.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <Card key={item.title} className="grid content-start gap-2 p-5">
              <h3 className="text-base font-semibold text-ink">{item.title}</h3>
              <Markdown className="text-sm text-muted">{item.md}</Markdown>
            </Card>
          ))}
        </div>
      ) : null}
      {studyPath.length ? (
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold">How to study this course</h2>
          <ol className="grid list-decimal gap-1 pl-6 text-sm text-muted">
            {studyPath.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
