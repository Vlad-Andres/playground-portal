import { cn } from "@site/lib/cn";

interface ProgressRingProps {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}

export function ProgressRing({ value, size = 56, label, className }: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label ?? `${Math.round(clamped * 100)} percent complete`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          className="stroke-sunken"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            clamped >= 1 ? "stroke-positive" : "stroke-brand",
          )}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">
        {Math.round(clamped * 100)}
      </span>
    </div>
  );
}
