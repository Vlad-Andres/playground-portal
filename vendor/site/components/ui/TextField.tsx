"use client";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
}: TextFieldProps) {
  const className =
    "w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-brand/60 placeholder:text-faint";

  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}
