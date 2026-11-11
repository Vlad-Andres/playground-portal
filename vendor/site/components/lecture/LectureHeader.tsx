import { BookMarked, Clock, FileText, StickyNote } from "lucide-react";
import type { LectureMeta, LectureSource } from "@site/content/types";
import { Badge } from "@site/components/ui/Badge";
import { formatMinutes } from "@site/lib/format";

const SOURCE_ICON: Record<LectureSource["kind"], typeof FileText> = {
  slides: FileText,
  chapter: BookMarked,
  notes: StickyNote,
};

export function LectureHeader({ meta, badge }: { meta: LectureMeta; badge?: string }) {
  return (
    <header className="grid gap-5 border-b border-line pb-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{badge ?? `Lecture ${meta.number}`}</Badge>
        <Badge>{meta.difficulty}</Badge>
        <Badge>
          <Clock size={12} aria-hidden />
          {formatMinutes(meta.estimatedMinutes)}
        </Badge>
      </div>

      <div className="grid max-w-3xl gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{meta.title}</h1>
        <p className="text-lg text-muted">{meta.subtitle}</p>
        <p className="text-pretty text-muted">{meta.summary}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {meta.topics.map((topic) => (
          <Badge key={topic} tone="neutral">
            {topic}
          </Badge>
        ))}
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-semibold tracking-wide text-faint uppercase">Built from</p>
        <ul className="grid gap-1.5 sm:grid-cols-3">
          {meta.sources.map((source) => {
            const Icon = SOURCE_ICON[source.kind];
            return (
              <li
                key={source.label}
                className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              >
                <Icon size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                <span className="grid gap-0.5">
                  <span className="font-medium text-ink">{source.label}</span>
                  {source.detail ? <span className="text-xs text-faint">{source.detail}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
