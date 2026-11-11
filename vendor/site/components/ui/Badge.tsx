import type { ReactNode } from "react";
import { cn } from "@site/lib/cn";

export type BadgeTone = "neutral" | "brand" | "accent" | "positive" | "warning" | "danger" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-muted border-line",
  brand: "bg-brand-soft text-brand-strong border-brand/20",
  accent: "bg-accent-soft text-accent border-accent/20",
  positive: "bg-positive-soft text-positive border-positive/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
