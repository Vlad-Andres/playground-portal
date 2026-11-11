"use client";

import { useState } from "react";
import { RotateCcw, StepForward } from "lucide-react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

interface Point {
  id: string;
  x: number;
  y: number;
}

const POINTS: Point[] = [
  { id: "A", x: 1, y: 5 },
  { id: "B", x: 3, y: 5 },
  { id: "C", x: 6, y: 1 },
  { id: "D", x: 7, y: 2 },
  { id: "E", x: 8, y: 1 },
  { id: "F", x: 8, y: 9 },
  { id: "G", x: 10, y: 8 },
  { id: "H", x: 12, y: 10 },
];

const INITIAL_CENTRES = [
  { x: 1, y: 5 },
  { x: 3, y: 5 },
  { x: 12, y: 10 },
];

const COLOURS = ["var(--brand)", "var(--positive)", "var(--warning)", "var(--info)", "var(--danger)", "var(--accent)"];
const SCALE = 26;
const PLOT_WIDTH = 13 * SCALE;
const PLOT_HEIGHT = 11 * SCALE;

const squaredDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const toScreen = (point: { x: number; y: number }) => ({ left: point.x * SCALE, top: PLOT_HEIGHT - point.y * SCALE });
const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

function assign(centres: { x: number; y: number }[]) {
  return POINTS.map((point) => {
    let best = 0;
    centres.forEach((centre, index) => {
      if (squaredDistance(point, centre) < squaredDistance(point, centres[best])) best = index;
    });
    return best;
  });
}

function recentre(centres: { x: number; y: number }[], assignment: number[]) {
  return centres.map((centre, index) => {
    const members = POINTS.filter((_, pointIndex) => assignment[pointIndex] === index);
    if (members.length === 0) return centre;
    return {
      x: members.reduce((sum, point) => sum + point.x, 0) / members.length,
      y: members.reduce((sum, point) => sum + point.y, 0) / members.length,
    };
  });
}

function densityClusters(epsilon: number, minimumPoints: number) {
  const parent = POINTS.map((_, index) => index);
  const find = (index: number): number => (parent[index] === index ? index : (parent[index] = find(parent[index])));
  POINTS.forEach((a, i) =>
    POINTS.forEach((b, j) => {
      if (i < j && Math.sqrt(squaredDistance(a, b)) <= epsilon) parent[find(i)] = find(j);
    }),
  );
  const roots = POINTS.map((_, index) => find(index));
  const sizes = new Map<number, number>();
  roots.forEach((root) => sizes.set(root, (sizes.get(root) ?? 0) + 1));
  const labels = [...new Set(roots.filter((root) => (sizes.get(root) ?? 0) >= minimumPoints))];
  return roots.map((root) => labels.indexOf(root));
}

export function ClusteringLab() {
  const [mode, setMode] = useState<"kmeans" | "dbscan">("kmeans");
  const [centres, setCentres] = useState(INITIAL_CENTRES);
  const [iteration, setIteration] = useState(0);
  const [epsilon, setEpsilon] = useState(2.5);
  const [minimumPoints, setMinimumPoints] = useState(2);

  const assignment = mode === "kmeans" ? assign(centres) : densityClusters(epsilon, minimumPoints);
  const nextCentres = recentre(centres, assign(centres));
  const converged = nextCentres.every((centre, index) => centre.x === centres[index].x && centre.y === centres[index].y);
  const clusterCount = new Set(assignment.filter((label) => label >= 0)).size;
  const cost = POINTS.reduce((sum, point, index) => sum + squaredDistance(point, centres[assign(centres)[index]]), 0);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "kmeans", label: "k-means, k = 3" },
            { id: "dbscan", label: "DBSCAN" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            className={cn(
              "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
              mode === option.id ? "border-brand/50 bg-brand-soft text-brand-strong" : "border-line bg-surface text-muted hover:border-brand/40",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <svg viewBox={`-10 -10 ${PLOT_WIDTH + 20} ${PLOT_HEIGHT + 20}`} className="w-full max-w-sm rounded-xl border border-line bg-sunken" role="img" aria-label="The eight points and their clusters">
          {mode === "dbscan"
            ? POINTS.map((point) => {
                const at = toScreen(point);
                return <circle key={`radius-${point.id}`} cx={at.left} cy={at.top} r={(epsilon / 2) * SCALE} fill="var(--brand)" fillOpacity={0.06} stroke="var(--line-strong)" strokeDasharray="3 3" />;
              })
            : null}
          {POINTS.map((point, index) => {
            const at = toScreen(point);
            const label = assignment[index];
            return (
              <g key={point.id}>
                <circle cx={at.left} cy={at.top} r={6} fill={label < 0 ? "var(--surface)" : COLOURS[label % COLOURS.length]} stroke={label < 0 ? "var(--faint)" : "none"} strokeWidth={2} />
                <text x={at.left + 8} y={at.top - 7} fontSize={11} fill="var(--ink)">
                  {point.id}
                </text>
              </g>
            );
          })}
          {mode === "kmeans"
            ? centres.map((centre, index) => {
                const at = toScreen(centre);
                return (
                  <g key={`centre-${index}`}>
                    <path d={`M ${at.left - 7} ${at.top - 7} L ${at.left + 7} ${at.top + 7} M ${at.left + 7} ${at.top - 7} L ${at.left - 7} ${at.top + 7}`} stroke={COLOURS[index]} strokeWidth={3} />
                    <text x={at.left + 9} y={at.top + 14} fontSize={10} fill="var(--muted)">
                      C{index + 1}
                    </text>
                  </g>
                );
              })
            : null}
        </svg>

        <div className="grid content-start gap-3">
          {mode === "kmeans" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={converged}
                  onClick={() => {
                    setCentres(nextCentres);
                    setIteration((value) => value + 1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <StepForward size={14} aria-hidden />
                  {converged ? "Converged" : "Next iteration"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCentres(INITIAL_CENTRES);
                    setIteration(0);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <RotateCcw size={14} aria-hidden />
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Iteration" value={String(iteration)} tone="brand" />
                <Stat label="Σ ‖p − c‖²" value={format(cost)} hint="what k-means minimises" />
              </div>
              <ul className="grid gap-1 text-sm text-muted">
                {centres.map((centre, index) => (
                  <li key={index} className="font-mono text-xs">
                    C{index + 1} = ({format(centre.x)}, {format(centre.y)}) ←{" "}
                    {POINTS.filter((_, pointIndex) => assignment[pointIndex] === index)
                      .map((point) => point.id)
                      .join(", ") || "—"}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <RangeField label="Distance ε" value={epsilon} min={1} max={6} step={0.5} display={`ε = ${epsilon}`} hint="Points at most ε apart end up in the same cluster." onChange={setEpsilon} />
              <RangeField label="minPts" value={minimumPoints} min={1} max={5} display={`minPts = ${minimumPoints}`} hint="Smaller clusters are marked as noise (hollow points)." onChange={setMinimumPoints} />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Clusters" value={String(clusterCount)} tone="brand" />
                <Stat label="Noise points" value={String(assignment.filter((label) => label < 0).length)} tone="warning" />
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-muted">
        {mode === "kmeans"
          ? "Starting from the centres A, B and H, the first iteration assigns {A}, {B, C, D, E}, {F, G, H} and moves C₂ to the mean of its four points. Keep stepping until no centre moves."
          : "A simplified DBSCAN: start with every point as its own cluster, merge clusters closer than ε, and mark clusters with fewer than minPts points as noise. Unlike k-means, nobody fixes the number of clusters in advance. The dashed circles have diameter ε."}
      </p>
    </div>
  );
}
