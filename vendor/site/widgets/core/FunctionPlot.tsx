"use client";

import { useMemo, useState } from "react";
import { parseExpr } from "@core/expr";
import type { FunctionPlotProps } from "@core/widgets";
import { RangeField } from "@site/components/ui/RangeField";
import { sampleFunction } from "./layout";
import { formatNumber } from "./ParameterExplorer";

const WIDTH = 640;
const HEIGHT = 320;
const PAD = { left: 44, right: 14, top: 14, bottom: 28 };

/** Plot of y = f(x) from 200 samples, with sliders for up to three parameters. */
export function FunctionPlot({ expr, xMin, xMax, params = [] }: FunctionPlotProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(params.map((param) => [param.id, param.value])),
  );
  const parsed = useMemo(() => parseExpr(expr), [expr]);
  const points = useMemo(
    () => (parsed.ok ? sampleFunction((x) => parsed.evaluate({ ...values, x }), xMin, xMax) : []),
    [parsed, values, xMin, xMax],
  );

  const ys = points.flatMap((point) => (point.y === null ? [] : [point.y]));
  let yMin = ys.length ? Math.min(...ys) : -1;
  let yMax = ys.length ? Math.max(...ys) : 1;
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const margin = (yMax - yMin) * 0.08;
  yMin -= margin;
  yMax += margin;
  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * (WIDTH - PAD.left - PAD.right);
  const sy = (y: number) => PAD.top + ((yMax - y) / (yMax - yMin)) * (HEIGHT - PAD.top - PAD.bottom);

  const segments: string[] = [];
  let current = "";
  for (const point of points) {
    if (point.y === null) {
      if (current) segments.push(current);
      current = "";
      continue;
    }
    current += `${current ? " L" : "M"} ${sx(point.x).toFixed(1)} ${sy(point.y).toFixed(1)}`;
  }
  if (current) segments.push(current);

  return (
    <div className="grid gap-4">
      <p className="font-mono text-sm text-ink">y = {expr}</p>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`Plot of y = ${expr}`}>
          <rect x={PAD.left} y={PAD.top} width={WIDTH - PAD.left - PAD.right} height={HEIGHT - PAD.top - PAD.bottom} className="fill-[var(--sunken)]" />
          {yMin < 0 && yMax > 0 ? (
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={sy(0)} y2={sy(0)} className="stroke-[var(--line-strong)]" />
          ) : null}
          {xMin < 0 && xMax > 0 ? (
            <line x1={sx(0)} x2={sx(0)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="stroke-[var(--line-strong)]" />
          ) : null}
          {segments.map((segment, index) => (
            <path key={index} d={segment} fill="none" strokeWidth={2.2} className="stroke-[var(--brand)]" />
          ))}
          <text x={PAD.left - 6} y={PAD.top + 10} textAnchor="end" className="fill-[var(--muted)] text-[10px]">
            {formatNumber(yMax, 2)}
          </text>
          <text x={PAD.left - 6} y={HEIGHT - PAD.bottom} textAnchor="end" className="fill-[var(--muted)] text-[10px]">
            {formatNumber(yMin, 2)}
          </text>
          <text x={PAD.left} y={HEIGHT - 8} className="fill-[var(--muted)] text-[10px]">
            {formatNumber(xMin, 2)}
          </text>
          <text x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end" className="fill-[var(--muted)] text-[10px]">
            {formatNumber(xMax, 2)}
          </text>
        </svg>
      </div>
      {params.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {params.map((param) => (
            <RangeField
              key={param.id}
              label={`${param.label} (${param.id})`}
              min={param.min}
              max={param.max}
              step={(param.max - param.min) / 100}
              value={values[param.id]}
              display={formatNumber(values[param.id], 3)}
              onChange={(value) => setValues((state) => ({ ...state, [param.id]: value }))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
