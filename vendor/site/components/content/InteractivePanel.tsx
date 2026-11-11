import type { ReactNode } from "react";
import { MousePointerClick } from "lucide-react";

interface InteractivePanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function InteractivePanel({ title, description, children }: InteractivePanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-brand/25 bg-elevated shadow-[var(--shadow-card)]">
      <header className="grid gap-1 border-b border-line bg-brand-soft/40 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
          <MousePointerClick size={16} aria-hidden />
          {title}
        </h3>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
