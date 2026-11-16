import { StudyText } from "@site/components/content/Markdown";
import { BookMarked, FileText, StickyNote } from "lucide-react";
import type { LectureMeta, LectureSource } from "@site/content/types";
import { formatMinutes } from "@site/lib/format";

const SOURCE_ICON: Record<LectureSource["kind"], typeof FileText> = {
  slides: FileText,
  chapter: BookMarked,
  notes: StickyNote,
};

export function LectureHeader({ meta, badge }: { meta: LectureMeta; badge?: string }) {
  return (
    <header className="grid gap-4 border-b border-line pb-5">
      <p className="course-editorial-label">
        {badge ?? `Lecture ${String(meta.number).padStart(2, "0")}`}
        {meta.topics[0] ? <> / <StudyText>{meta.topics[0]}</StudyText></> : null}
      </p>
      <h1 className="course-reading-title"><StudyText>{meta.title}</StudyText></h1>
      <p className="text-lg leading-relaxed text-muted"><StudyText>{meta.subtitle || meta.summary}</StudyText></p>
      <details id="lecture-sources" className="scroll-mt-5">
        <summary className="cursor-pointer text-sm text-muted">
          Lecture details · {meta.difficulty} · {formatMinutes(meta.estimatedMinutes)}
        </summary>
        {meta.summary && meta.summary !== meta.subtitle ? <p className="my-3 text-sm text-muted"><StudyText>{meta.summary}</StudyText></p> : null}
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
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
      </details>
    </header>
  );
}
