"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { DataTable } from "@site/components/content/DataTable";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

type Genre = "Rock" | "Jazz" | "Pop";
type MetricId = "l2" | "l1" | "cosine" | "dot";
type ModeId = "knn" | "ann" | "range";
type FilterStrategy = "pre" | "post";

interface Song {
  name: string;
  genre: Genre;
  x: number;
  y: number;
}

const SONGS: Song[] = [
  { name: "Thunder Road", genre: "Rock", x: 8.5, y: 2.0 },
  { name: "Iron Sky", genre: "Rock", x: 9.0, y: 3.2 },
  { name: "Neon Riot", genre: "Rock", x: 7.6, y: 1.2 },
  { name: "Wild Hearts", genre: "Rock", x: 6.8, y: 3.0 },
  { name: "Static", genre: "Rock", x: 8.0, y: 4.4 },
  { name: "Gravel", genre: "Rock", x: 5.8, y: 1.6 },
  { name: "Blue Hour", genre: "Jazz", x: 2.0, y: 8.5 },
  { name: "Smoke Rings", genre: "Jazz", x: 1.2, y: 7.2 },
  { name: "Late Train", genre: "Jazz", x: 3.2, y: 9.0 },
  { name: "Velvet", genre: "Jazz", x: 2.6, y: 6.4 },
  { name: "Night Owl", genre: "Jazz", x: 4.0, y: 7.6 },
  { name: "Moonwalk Bass", genre: "Jazz", x: 5.2, y: 6.0 },
  { name: "Sugar Rush", genre: "Pop", x: 6.0, y: 5.2 },
  { name: "Glow", genre: "Pop", x: 4.6, y: 4.4 },
  { name: "Paper Hearts", genre: "Pop", x: 3.4, y: 3.6 },
  { name: "Mirrors", genre: "Pop", x: 5.4, y: 8.0 },
  { name: "Summer Code", genre: "Pop", x: 7.0, y: 6.6 },
  { name: "Echo", genre: "Pop", x: 2.4, y: 2.6 },
];

const GENRE_CLASS: Record<Genre, string> = {
  Rock: "fill-[var(--brand)]",
  Jazz: "fill-[var(--accent)]",
  Pop: "fill-[var(--info)]",
};

const METRICS: { id: MetricId; label: string; scoreLabel: string; isDistance: boolean }[] = [
  { id: "l2", label: "Euclidean (L₂)", scoreLabel: "distance", isDistance: true },
  { id: "l1", label: "Manhattan (L₁)", scoreLabel: "distance", isDistance: true },
  { id: "cosine", label: "Cosine", scoreLabel: "cosine distance", isDistance: true },
  { id: "dot", label: "Inner product", scoreLabel: "inner product", isDistance: false },
];

const MODES: { id: ModeId; label: string }[] = [
  { id: "knn", label: "k-NN" },
  { id: "ann", label: "(c, k) ANN" },
  { id: "range", label: "Range" },
];

const SIZE = 400;
const PAD = 30;
const toPx = (value: number) => PAD + (value / 10) * (SIZE - 2 * PAD);
const toPy = (value: number) => SIZE - PAD - (value / 10) * (SIZE - 2 * PAD);
const fromPx = (px: number) => ((px - PAD) / (SIZE - 2 * PAD)) * 10;
const fromPy = (py: number) => ((SIZE - PAD - py) / (SIZE - 2 * PAD)) * 10;
const clamp = (value: number) => Math.min(10, Math.max(0.1, value));

/** Lower is closer for distances; for the inner product, higher is closer. */
function score(metric: MetricId, qx: number, qy: number, song: Song) {
  switch (metric) {
    case "l2":
      return Math.hypot(song.x - qx, song.y - qy);
    case "l1":
      return Math.abs(song.x - qx) + Math.abs(song.y - qy);
    case "cosine": {
      const cos = (song.x * qx + song.y * qy) / (Math.hypot(song.x, song.y) * Math.hypot(qx, qy));
      return 1 - cos;
    }
    case "dot":
      return song.x * qx + song.y * qy;
  }
}

export function VectorSearchLab() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [query, setQuery] = useState({ x: 6.5, y: 3.5 });
  const [metricId, setMetricId] = useState<MetricId>("l2");
  const [modeId, setModeId] = useState<ModeId>("knn");
  const [k, setK] = useState(4);
  const [c, setC] = useState(1.5);
  const [radius, setRadius] = useState(2);
  const [genreFilter, setGenreFilter] = useState<Genre | "none">("none");
  const [strategy, setStrategy] = useState<FilterStrategy>("post");

  const metric = METRICS.find((candidate) => candidate.id === metricId) ?? METRICS[0];
  const effectiveMode: ModeId = metric.isDistance ? modeId : "knn";
  const cosineRange = metricId === "cosine";
  const rangeValue = cosineRange ? radius / 20 : radius;

  const result = useMemo(() => {
    const scored = SONGS.map((song) => ({ song, value: score(metricId, query.x, query.y, song) }));
    const ranked = [...scored].sort((a, b) => (metric.isDistance ? a.value - b.value : b.value - a.value));
    const passes = (song: Song) => genreFilter === "none" || song.genre === genreFilter;

    if (effectiveMode === "range") {
      const hits = ranked.filter((entry) => entry.value <= rangeValue && passes(entry.song));
      return { hits, acceptable: new Set<string>(), note: "" };
    }

    if (effectiveMode === "ann") {
      const pool = ranked.filter((entry) => passes(entry.song));
      const best = pool[0]?.value ?? 0;
      const acceptable = pool.filter((entry) => entry.value <= c * best);
      const exact = pool.slice(0, k);
      const tolerated = new Set(acceptable.map((entry) => entry.song.name));
      const note =
        acceptable.length >= k
          ? `Any ${k} of the ${acceptable.length} vectors within ${c.toFixed(2)} × the best ${metric.scoreLabel} (${best.toFixed(2)}) are a correct answer — an index may return them instead of the exact top ${k}.`
          : `Only ${acceptable.length} vector${acceptable.length === 1 ? "" : "s"} lie within ${c.toFixed(2)} × the best ${metric.scoreLabel}, so the answer must be the exact top ${Math.min(k, pool.length)} — raise c to allow more slack.`;
      return { hits: exact, acceptable: tolerated, note };
    }

    if (genreFilter === "none") return { hits: ranked.slice(0, k), acceptable: new Set<string>(), note: "" };
    if (strategy === "pre") {
      return {
        hits: ranked.filter((entry) => passes(entry.song)).slice(0, k),
        acceptable: new Set<string>(),
        note: `Pre-filtering: only ${genreFilter} songs are searched, so all ${k} results match the predicate.`,
      };
    }
    const top = ranked.slice(0, k);
    const kept = top.filter((entry) => passes(entry.song));
    return {
      hits: kept,
      acceptable: new Set<string>(),
      note: `Post-filtering: the ${k} nearest songs were found first, then ${top.length - kept.length} of them failed genre = ${genreFilter} and were dropped — only ${kept.length} of the ${k} requested results remain.`,
    };
  }, [metricId, metric, query, effectiveMode, k, c, rangeValue, genreFilter, strategy]);

  const hitNames = new Map(result.hits.map((entry, index) => [entry.song.name, index + 1]));
  const kth = result.hits[result.hits.length - 1]?.value;

  function moveQuery(event: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * SIZE;
    const py = ((event.clientY - box.top) / box.height) * SIZE;
    setQuery({ x: Math.round(clamp(fromPx(px)) * 10) / 10, y: Math.round(clamp(fromPy(py)) * 10) / 10 });
  }

  const pxPerUnit = (SIZE - 2 * PAD) / 10;
  const ringRadius =
    metricId === "l2"
      ? effectiveMode === "range"
        ? rangeValue
        : effectiveMode === "ann"
          ? c * (result.hits[0]?.value ?? 0)
          : kth
      : undefined;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">Score</span>
          {METRICS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setMetricId(candidate.id)}
              aria-pressed={metricId === candidate.id}
              className={cn(
                "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
                metricId === candidate.id
                  ? "border-brand/50 bg-brand-soft text-brand-strong"
                  : "border-line bg-surface text-muted hover:border-brand/40",
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">Query type</span>
          {MODES.map((candidate) => {
            const disabled = !metric.isDistance && candidate.id !== "knn";
            return (
              <button
                key={candidate.id}
                type="button"
                disabled={disabled}
                title={disabled ? "Needs a distance: the inner product has no fixed 'best' to compare against" : undefined}
                onClick={() => setModeId(candidate.id)}
                aria-pressed={effectiveMode === candidate.id}
                className={cn(
                  "rounded-lg border px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  effectiveMode === candidate.id
                    ? "border-brand/50 bg-brand-soft text-brand-strong"
                    : "border-line bg-surface text-muted hover:border-brand/40",
                )}
              >
                {candidate.label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {effectiveMode !== "range" ? (
            <RangeField label="k" value={k} min={1} max={8} step={1} onChange={setK} display={String(k)} />
          ) : (
            <RangeField
              label={cosineRange ? "Threshold (cosine distance)" : "Radius r"}
              value={radius}
              min={0.5}
              max={5}
              step={0.1}
              onChange={setRadius}
              display={cosineRange ? (radius / 20).toFixed(3) : radius.toFixed(1)}
            />
          )}
          {effectiveMode === "ann" ? (
            <RangeField label="c (slack)" value={c} min={1} max={3} step={0.05} onChange={setC} display={c.toFixed(2)} />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">Hybrid filter</span>
          <select
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value as Genre | "none")}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-brand/60"
          >
            <option value="none">none</option>
            <option value="Rock">genre = Rock</option>
            <option value="Jazz">genre = Jazz</option>
            <option value="Pop">genre = Pop</option>
          </select>
          {genreFilter !== "none" && effectiveMode === "knn"
            ? (["pre", "post"] as const).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => setStrategy(candidate)}
                  aria-pressed={strategy === candidate}
                  className={cn(
                    "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
                    strategy === candidate
                      ? "border-brand/50 bg-brand-soft text-brand-strong"
                      : "border-line bg-surface text-muted hover:border-brand/40",
                  )}
                >
                  {candidate === "pre" ? "Pre-filter" : "Post-filter"}
                </button>
              ))
            : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="h-auto w-full cursor-crosshair rounded-xl border border-line bg-surface"
            role="img"
            aria-label="Song embeddings in two dimensions; click to move the query vector"
            onClick={moveQuery}
          >
            <line x1={PAD} y1={SIZE - PAD} x2={SIZE - PAD} y2={SIZE - PAD} className="stroke-[var(--line-strong)]" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={SIZE - PAD} className="stroke-[var(--line-strong)]" />
            <text x={SIZE - PAD} y={SIZE - 8} textAnchor="end" className="fill-[var(--faint)] text-[10px]">
              dimension 1 (energy)
            </text>
            <text x={8} y={PAD - 10} className="fill-[var(--faint)] text-[10px]">
              dimension 2 (acoustic)
            </text>

            {metricId === "cosine" || metricId === "dot" ? (
              <line
                x1={toPx(0)}
                y1={toPy(0)}
                x2={toPx(query.x * 10 / Math.max(query.x, query.y))}
                y2={toPy(query.y * 10 / Math.max(query.x, query.y))}
                strokeDasharray="4 4"
                className="stroke-[var(--faint)]"
              />
            ) : null}

            {ringRadius !== undefined && ringRadius > 0 ? (
              <circle
                cx={toPx(query.x)}
                cy={toPy(query.y)}
                r={ringRadius * pxPerUnit}
                strokeDasharray="5 4"
                className="fill-[var(--brand-soft)] stroke-[var(--brand)] opacity-60"
              />
            ) : null}

            {SONGS.map((song) => {
              const rank = hitNames.get(song.name);
              const tolerated = result.acceptable.has(song.name);
              const dimmed = genreFilter !== "none" && song.genre !== genreFilter;
              return (
                <g key={song.name} className={cn(dimmed && "opacity-35")}>
                  {rank !== undefined || tolerated ? (
                    <circle
                      cx={toPx(song.x)}
                      cy={toPy(song.y)}
                      r={rank !== undefined ? 10 : 9}
                      strokeWidth={2}
                      strokeDasharray={rank === undefined ? "3 2" : undefined}
                      className="fill-none stroke-[var(--ink)]"
                    />
                  ) : null}
                  <circle cx={toPx(song.x)} cy={toPy(song.y)} r={5.5} className={GENRE_CLASS[song.genre]} />
                  <text x={toPx(song.x) + 9} y={toPy(song.y) + 3.5} className="fill-[var(--muted)] text-[9px]">
                    {rank !== undefined ? `${rank}. ` : ""}
                    {song.name}
                  </text>
                </g>
              );
            })}

            <g>
              <path
                d={`M ${toPx(query.x)} ${toPy(query.y) - 9} L ${toPx(query.x) + 9} ${toPy(query.y)} L ${toPx(query.x)} ${toPy(query.y) + 9} L ${toPx(query.x) - 9} ${toPy(query.y)} Z`}
                className="fill-[var(--ink)]"
              />
              <text x={toPx(query.x) + 11} y={toPy(query.y) - 8} className="fill-[var(--ink)] text-[10px] font-semibold">
                q ({query.x.toFixed(1)}, {query.y.toFixed(1)})
              </text>
            </g>
          </svg>
          <p className="flex flex-wrap gap-3 text-xs text-faint">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-brand" /> Rock
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-accent" /> Jazz
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-info" /> Pop
            </span>
            <span>Click anywhere to move the query q.</span>
          </p>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Compared" value={String(SONGS.length)} hint="brute force: N·D work" />
            <Stat label="Results" value={String(result.hits.length)} tone="brand" />
            <Stat
              label={effectiveMode === "range" ? "Threshold" : `${metric.isDistance ? "k-th" : "lowest"} score`}
              value={effectiveMode === "range" ? rangeValue.toFixed(cosineRange ? 3 : 1) : kth !== undefined ? kth.toFixed(2) : "—"}
            />
          </div>
          <DataTable
            headers={["#", "Song", "Genre", metric.scoreLabel]}
            rows={result.hits.map((entry, index) => [
              String(index + 1),
              entry.song.name,
              entry.song.genre,
              entry.value.toFixed(metricId === "cosine" ? 3 : 2),
            ])}
          />
          {result.note ? <p className="text-sm text-muted">{result.note}</p> : null}
          {metricId === "cosine" ? (
            <p className="text-sm text-muted">Cosine ignores length: every song on the dashed ray from the origin through q is equally close.</p>
          ) : null}
          {metricId === "dot" ? (
            <p className="text-sm text-muted">The inner product rewards long vectors: songs far from the origin in q&apos;s direction win, even if they are far from q itself.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
