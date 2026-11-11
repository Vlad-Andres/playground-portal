"use client";

import { useState } from "react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { TextField } from "@site/components/ui/TextField";
import { cn } from "@site/lib/cn";

const PRESETS = [
  { label: "Worked example", x: "5, 5", y: "9, 8" },
  { label: "Book cosine", x: "1, 2, -1", y: "2, 1, 1" },
  { label: "Bit vectors", x: "1, 0, 1, 0, 1", y: "1, 1, 1, 1, 0" },
];

const PLOT_SIZE = 220;

function parseVector(text: string) {
  const parts = text.split(/[,\s]+/).filter(Boolean).map(Number);
  return parts.length > 0 && parts.every(Number.isFinite) ? parts : null;
}

function lrDistance(differences: number[], r: number) {
  return differences.reduce((sum, difference) => sum + Math.abs(difference) ** r, 0) ** (1 / r);
}

function cosineDegrees(x: number[], y: number[]) {
  const dot = x.reduce((sum, value, index) => sum + value * y[index], 0);
  const lengths = Math.hypot(...x) * Math.hypot(...y);
  if (lengths === 0) return null;
  return (Math.acos(Math.min(1, Math.max(-1, dot / lengths))) * 180) / Math.PI;
}

function format(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function PlanePlot({ x, y }: { x: number[]; y: number[] }) {
  const values = [...x, ...y, 0];
  const low = Math.min(...values) - 1;
  const high = Math.max(...values) + 1;
  const scale = (value: number) => ((value - low) / (high - low)) * PLOT_SIZE;
  const point = (vector: number[]) => ({ left: scale(vector[0]), top: PLOT_SIZE - scale(vector[1]) });
  const a = point(x);
  const b = point(y);

  return (
    <svg viewBox={`0 0 ${PLOT_SIZE} ${PLOT_SIZE}`} className="h-56 w-56 shrink-0 rounded-xl border border-line bg-sunken" role="img" aria-label="The two points with their L1 and L2 paths">
      <path d={`M ${a.left} ${a.top} H ${b.left} V ${b.top}`} fill="none" stroke="var(--warning)" strokeWidth={2} strokeDasharray="5 4" />
      <line x1={a.left} y1={a.top} x2={b.left} y2={b.top} stroke="var(--brand)" strokeWidth={2.5} />
      {[
        { at: a, label: `x (${x.join(", ")})` },
        { at: b, label: `y (${y.join(", ")})` },
      ].map(({ at, label }) => (
        <g key={label}>
          <circle cx={at.left} cy={at.top} r={4.5} fill="var(--ink)" />
          <text x={Math.min(at.left + 6, PLOT_SIZE - 70)} y={Math.max(at.top - 7, 12)} fontSize={10} fill="var(--muted)">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DistanceLab() {
  const [first, setFirst] = useState(PRESETS[0].x);
  const [second, setSecond] = useState(PRESETS[0].y);
  const [order, setOrder] = useState(3);

  const x = parseVector(first);
  const y = parseVector(second);
  const problem = !x || !y ? "Enter numbers separated by commas." : x.length !== y.length ? "Both vectors need the same number of dimensions." : null;

  const differences = x && y && !problem ? x.map((value, index) => value - y[index]) : [];
  const cosine = x && y && !problem ? cosineDegrees(x, y) : null;
  const isBinary = !problem && [...(x ?? []), ...(y ?? [])].every((value) => value === 0 || value === 1);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setFirst(preset.x);
              setSecond(preset.y);
            }}
            className={cn(
              "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
              first === preset.x && second === preset.y
                ? "border-brand/50 bg-brand-soft text-brand-strong"
                : "border-line bg-surface text-muted hover:border-brand/40",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Vector x" value={first} onChange={setFirst} placeholder="5, 5" />
        <TextField label="Vector y" value={second} onChange={setSecond} placeholder="9, 8" />
      </div>

      {problem ? (
        <p className="rounded-xl border border-warning/35 bg-warning-soft/50 px-4 py-3 text-sm text-ink">{problem}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          {x && y && x.length === 2 ? <PlanePlot x={x} y={y} /> : null}
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="L₂ (Euclidean)" value={format(lrDistance(differences, 2))} hint="√ of the sum of squared differences" tone="brand" />
              <Stat label="L₁ (Manhattan)" value={format(lrDistance(differences, 1))} hint="sum of absolute differences" tone="warning" />
              <Stat label="L∞" value={format(Math.max(...differences.map(Math.abs)))} hint="largest difference in any dimension" />
              <Stat label={`L${order}`} value={format(lrDistance(differences, order))} hint="r-th root of the sum of r-th powers" />
              <Stat label="Cosine distance" value={cosine === null ? "undefined" : `${format(cosine)}°`} hint="angle between the vectors" />
              <Stat label="Hamming" value={String(differences.filter((difference) => difference !== 0).length)} hint={isBinary ? "positions where the bits differ" : "components that differ"} />
            </div>
            <RangeField
              label="Order r of the Lᵣ norm"
              value={order}
              min={1}
              max={10}
              display={`r = ${order}`}
              hint="Watch Lᵣ fall from L₁ towards L∞ as r grows."
              onChange={setOrder}
            />
          </div>
        </div>
      )}

      <p className="text-sm text-muted">
        In the plot the solid line is the L₂ distance and the dashed path the L₁ distance — the route you would travel
        along the coordinates. Cosine distance ignores length: scale one vector and only the Lᵣ distances change.
      </p>
    </div>
  );
}
