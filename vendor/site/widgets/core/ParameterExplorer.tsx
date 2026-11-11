"use client";

import { useMemo, useState } from "react";
import { parseExpr } from "@core/expr";
import type { ParameterExplorerProps } from "@core/widgets";
import { RangeField } from "@site/components/ui/RangeField";

export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

/** Sliders for the inputs on the left, live computed outputs on the right. */
export function ParameterExplorer({ inputs, outputs }: ParameterExplorerProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(inputs.map((input) => [input.id, input.value])),
  );
  const compiled = useMemo(() => outputs.map((output) => parseExpr(output.expr)), [outputs]);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="grid content-start gap-4">
        {inputs.map((input) => (
          <RangeField
            key={input.id}
            label={input.label}
            min={input.min}
            max={input.max}
            step={input.step}
            value={values[input.id]}
            display={`${formatNumber(values[input.id], 6)}${input.unit ? ` ${input.unit}` : ""}`}
            onChange={(value) => setValues((current) => ({ ...current, [input.id]: value }))}
          />
        ))}
      </div>
      <dl className="grid content-start gap-3" aria-live="polite">
        {outputs.map((output, index) => {
          const parsed = compiled[index];
          const value = parsed.ok ? parsed.evaluate(values) : Number.NaN;
          return (
            <div key={index} className="grid gap-1 rounded-xl border border-line bg-surface px-4 py-3">
              <dt className="text-xs font-medium tracking-wide text-faint uppercase">{output.label}</dt>
              <dd className="font-mono text-2xl font-semibold text-brand tabular-nums">
                {formatNumber(value, output.decimals ?? 2)}
                {output.unit ? <span className="ml-1 text-sm font-normal text-muted">{output.unit}</span> : null}
              </dd>
              <dd className="font-mono text-xs text-faint">= {output.expr}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
