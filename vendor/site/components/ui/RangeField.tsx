"use client";

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  display?: string;
  onChange: (value: number) => void;
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  hint,
  display,
  onChange,
}: RangeFieldProps) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-mono text-xs text-brand tabular-nums">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sunken accent-brand"
      />
      {hint ? <span className="text-xs text-faint">{hint}</span> : null}
    </label>
  );
}
