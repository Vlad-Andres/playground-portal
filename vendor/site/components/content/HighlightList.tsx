import { Sparkles, Target } from "lucide-react";
import { cn } from "@site/lib/cn";

interface HighlightListProps {
  variant: "objectives" | "takeaways";
  items: string[];
}

export function HighlightList({ variant, items }: HighlightListProps) {
  const Icon = variant === "objectives" ? Target : Sparkles;

  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border p-3.5 text-sm",
            variant === "objectives"
              ? "border-brand/20 bg-brand-soft/40"
              : "border-accent/25 bg-accent-soft/40",
          )}
        >
          <Icon
            size={16}
            className={cn("mt-0.5 shrink-0", variant === "objectives" ? "text-brand" : "text-accent")}
            aria-hidden
          />
          <span className="text-ink">{item}</span>
        </li>
      ))}
    </ul>
  );
}
