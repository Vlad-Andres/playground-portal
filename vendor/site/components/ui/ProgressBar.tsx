import { cn } from "@site/lib/cn";

interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
  tone?: "brand" | "positive";
}

export function ProgressBar({ value, label, className, tone = "brand" }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-sunken", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "positive" ? "bg-positive" : "bg-brand",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
