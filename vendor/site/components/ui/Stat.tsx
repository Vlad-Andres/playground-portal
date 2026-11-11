import { cn } from "@site/lib/cn";

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "brand" | "positive" | "warning";
  className?: string;
}

const TONES = {
  neutral: "text-ink",
  brand: "text-brand",
  positive: "text-positive",
  warning: "text-warning",
} as const;

export function Stat({ label, value, hint, tone = "neutral", className }: StatProps) {
  return (
    <div className={cn("grid gap-0.5 rounded-xl border border-line bg-sunken px-3.5 py-3", className)}>
      <span className="text-xs font-medium tracking-wide text-faint uppercase">{label}</span>
      <span className={cn("font-mono text-lg font-semibold tabular-nums", TONES[tone])}>{value}</span>
      {hint ? <span className="text-xs text-faint">{hint}</span> : null}
    </div>
  );
}
