import { BookOpen, Compass, ListChecks, PencilRuler } from "lucide-react";
import { countExercises, type LectureIndexEntry } from "@site/content/registry";
import { Badge } from "@site/components/ui/Badge";
import type { Course } from "@site/content/types";

interface CourseOverviewProps {
  course: Course;
  entries: LectureIndexEntry[];
}

export function CourseOverview({ course, entries }: CourseOverviewProps) {
  const stats = [
    { icon: Compass, label: "Lectures", value: String(entries.length) },
    {
      icon: BookOpen,
      label: "Concepts",
      value: String(entries.reduce((sum, entry) => sum + entry.concepts.length, 0)),
    },
    {
      icon: ListChecks,
      label: "Quiz questions",
      value: String(entries.reduce((sum, entry) => sum + entry.quiz.length, 0)),
    },
    {
      icon: PencilRuler,
      label: "Exercises",
      value: String(entries.reduce((sum, entry) => sum + countExercises(entry), 0)),
    },
  ];

  return (
    <section className="grid gap-6">
      <div className="grid max-w-3xl gap-4">
        <Badge tone="brand" className="w-fit">
          {course.overviewBadge ?? course.title}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {course.overviewTitle ?? `An interactive learning playground for ${course.title.toLowerCase()}.`}
        </h1>
        <p className="text-lg text-muted text-pretty">
          {course.overviewMd ?? course.description}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="grid gap-1 rounded-xl border border-line bg-surface px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-faint uppercase">
              <Icon size={13} aria-hidden />
              {label}
            </dt>
            <dd className="font-mono text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
