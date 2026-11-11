import { AlertTriangle, Info, Lightbulb, OctagonAlert } from "lucide-react";
import type { InfoVariant } from "@site/content/types";
import { Markdown } from "@site/components/content/Markdown";
import { cn } from "@site/lib/cn";

const VARIANTS = {
  note: { icon: Info, shell: "border-info/25 bg-info-soft/50", accent: "text-info" },
  insight: { icon: Lightbulb, shell: "border-brand/25 bg-brand-soft/50", accent: "text-brand" },
  warning: { icon: AlertTriangle, shell: "border-warning/25 bg-warning-soft/50", accent: "text-warning" },
  pitfall: { icon: OctagonAlert, shell: "border-danger/25 bg-danger-soft/50", accent: "text-danger" },
} as const satisfies Record<InfoVariant, { icon: typeof Info; shell: string; accent: string }>;

interface InfoBoxProps {
  variant: InfoVariant;
  title: string;
  children: string;
}

export function InfoBox({ variant, title, children }: InfoBoxProps) {
  const { icon: Icon, shell, accent } = VARIANTS[variant];

  return (
    <aside className={cn("grid gap-2 rounded-xl border p-4 sm:p-5", shell)}>
      <p className={cn("flex items-center gap-2 text-sm font-semibold", accent)}>
        <Icon size={16} aria-hidden />
        {title}
      </p>
      <Markdown className="text-sm">{children}</Markdown>
    </aside>
  );
}
