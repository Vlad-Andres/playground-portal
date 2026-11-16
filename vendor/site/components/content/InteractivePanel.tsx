import { StudyText } from "@site/components/content/Markdown";
import type { ReactNode } from "react";
import { MousePointerClick } from "lucide-react";

interface InteractivePanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function InteractivePanel({ title, description, children }: InteractivePanelProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-brand/25 bg-elevated shadow-[var(--shadow-card)]">
      <header className="grid gap-1 border-b border-line bg-brand-soft/40 px-3 py-3 sm:px-5 sm:py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
          <MousePointerClick size={16} className="shrink-0" aria-hidden />
          <StudyText>{title}</StudyText>
        </h3>
        {description ? <p className="text-sm text-muted"><StudyText>{description}</StudyText></p> : null}
      </header>
      <div className="min-w-0 p-3 sm:p-5">{children}</div>
    </section>
  );
}
