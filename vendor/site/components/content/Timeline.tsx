import type { TimelineItem } from "@site/content/types";
import { Markdown, StudyText } from "@site/components/content/Markdown";

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="relative grid gap-5 border-l border-line pl-6">
      {items.map((item) => (
        <li key={item.title} className="grid gap-1.5">
          <span
            className="absolute -left-[7px] mt-1.5 size-3.5 rounded-full border-2 border-canvas bg-brand"
            aria-hidden
          />
          <p className="text-xs font-semibold tracking-wide text-brand uppercase"><StudyText>{item.label}</StudyText></p>
          <p className="text-sm font-medium text-ink"><StudyText>{item.title}</StudyText></p>
          <Markdown className="text-sm">{item.md}</Markdown>
        </li>
      ))}
    </ol>
  );
}
