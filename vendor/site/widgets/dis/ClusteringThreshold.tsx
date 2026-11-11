"use client";

import { useMemo, useState } from "react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

interface SourceRecord {
  id: string;
  name: string;
  zip: string;
  income: number;
  x: number;
  y: number;
}

const RECORDS: SourceRecord[] = [
  { id: "P1", name: "Green", zip: "51519", income: 30, x: 70, y: 55 },
  { id: "P2", name: "Green", zip: "51518", income: 32, x: 175, y: 45 },
  { id: "P5", name: "Gree", zip: "51519", income: 55, x: 118, y: 150 },
  { id: "P3", name: "Peter", zip: "30528", income: 40, x: 295, y: 50 },
  { id: "P4", name: "Peter", zip: "30528", income: 40, x: 295, y: 150 },
  { id: "P6", name: "Chuck", zip: "51519", income: 30, x: 400, y: 100 },
];

const SCORED_PAIRS: { a: string; b: string; score: number }[] = [
  { a: "P3", b: "P4", score: 1.0 },
  { a: "P1", b: "P2", score: 0.9 },
  { a: "P2", b: "P5", score: 0.5 },
  { a: "P1", b: "P5", score: 0.3 },
  { a: "P1", b: "P6", score: 0.3 },
  { a: "P5", b: "P6", score: 0.3 },
  { a: "P2", b: "P6", score: 0.2 },
];

const CLUSTER_COLOURS = ["var(--brand)", "var(--positive)", "var(--accent)", "var(--info)", "var(--danger)"];

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function buildClusters(threshold: number) {
  const parent = new Map(RECORDS.map((record) => [record.id, record.id]));

  const find = (id: string): string => {
    const next = parent.get(id) as string;
    if (next === id) return id;
    const root = find(next);
    parent.set(id, root);
    return root;
  };

  for (const pair of SCORED_PAIRS) {
    if (pair.score < threshold) continue;
    const rootA = find(pair.a);
    const rootB = find(pair.b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  const groups = new Map<string, SourceRecord[]>();
  for (const record of RECORDS) {
    const root = find(record.id);
    groups.set(root, [...(groups.get(root) ?? []), record]);
  }

  return [...groups.values()].sort((a, b) => RECORDS.indexOf(a[0]) - RECORDS.indexOf(b[0]));
}

export function ClusteringThreshold() {
  const [threshold, setThreshold] = useState(0.5);

  const clusters = useMemo(() => buildClusters(threshold), [threshold]);
  const clusterOf = useMemo(() => {
    const lookup = new Map<string, number>();
    clusters.forEach((members, index) => {
      for (const member of members) lookup.set(member.id, index);
    });
    return lookup;
  }, [clusters]);

  const activeEdges = SCORED_PAIRS.filter((pair) => pair.score >= threshold);
  const positionOf = (id: string) => RECORDS.find((record) => record.id === id)!;

  return (
    <div className="grid gap-5">
      <RangeField
        label="Match threshold"
        value={threshold}
        min={0}
        max={1}
        step={0.05}
        display={threshold.toFixed(2)}
        hint="Pairs scoring at or above the threshold are matches; clusters are their transitive closure."
        onChange={setThreshold}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pairs in total" value={String((RECORDS.length * (RECORDS.length - 1)) / 2)} hint="N(N−1)/2" />
        <Stat label="Matching pairs" value={String(activeEdges.length)} tone="brand" />
        <Stat
          label="Entities after merge"
          value={String(clusters.length)}
          hint={`from ${RECORDS.length} records`}
          tone="positive"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-sunken p-3">
        <svg viewBox="0 0 470 200" className="h-auto w-full" role="img" aria-label="Record similarity graph">
          {activeEdges.map((pair) => {
            const from = positionOf(pair.a);
            const to = positionOf(pair.b);

            return (
              <line
                key={`edge-${pair.a}-${pair.b}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={CLUSTER_COLOURS[(clusterOf.get(pair.a) ?? 0) % CLUSTER_COLOURS.length]}
                strokeWidth={1 + pair.score * 2.5}
                strokeOpacity={0.45}
              />
            );
          })}

          {RECORDS.map((record) => {
            const colour = CLUSTER_COLOURS[(clusterOf.get(record.id) ?? 0) % CLUSTER_COLOURS.length];
            return (
              <g key={record.id}>
                <circle cx={record.x} cy={record.y} r={22} fill={colour} fillOpacity={0.16} stroke={colour} strokeWidth={2} />
                <text x={record.x} y={record.y + 4} textAnchor="middle" className="fill-[var(--ink)] text-[11px] font-semibold">
                  {record.id}
                </text>
              </g>
            );
          })}

          {activeEdges.map((pair) => {
            const from = positionOf(pair.a);
            const to = positionOf(pair.b);

            return (
              <text
                key={`score-${pair.a}-${pair.b}`}
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 4}
                textAnchor="middle"
                paintOrder="stroke"
                stroke="var(--sunken)"
                strokeWidth={3}
                className="fill-[var(--muted)] text-[10px] font-medium"
              >
                {pair.score.toFixed(1)}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          <p className="text-sm font-medium text-ink">Relation with duplicates</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-sunken text-xs">
                  <th className="px-3 py-2 text-left font-semibold">ID</th>
                  <th className="px-3 py-2 text-left font-semibold">name</th>
                  <th className="px-3 py-2 text-left font-semibold">ZIP</th>
                  <th className="px-3 py-2 text-left font-semibold">income</th>
                </tr>
              </thead>
              <tbody>
                {RECORDS.map((record) => (
                  <tr key={record.id} className="border-t border-line">
                    <td className="px-3 py-1.5">
                      <span
                        className="inline-block size-2 rounded-full align-middle"
                        style={{
                          backgroundColor:
                            CLUSTER_COLOURS[(clusterOf.get(record.id) ?? 0) % CLUSTER_COLOURS.length],
                        }}
                      />
                      <span className="ml-2 font-mono">{record.id}</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{record.name}</td>
                    <td className="px-3 py-1.5 font-mono text-muted">{record.zip}</td>
                    <td className="px-3 py-1.5 font-mono text-muted">{record.income}k</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid content-start gap-2">
          <p className="text-sm font-medium text-ink">Clean relation after merging</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-sunken text-xs">
                  <th className="px-3 py-2 text-left font-semibold">ID</th>
                  <th className="px-3 py-2 text-left font-semibold">name</th>
                  <th className="px-3 py-2 text-left font-semibold">ZIP</th>
                  <th className="px-3 py-2 text-left font-semibold">income</th>
                  <th className="px-3 py-2 text-left font-semibold">merged from</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((members, index) => (
                  <tr key={members[0].id} className="border-t border-line">
                    <td className="px-3 py-1.5">
                      <span
                        className="inline-block size-2 rounded-full align-middle"
                        style={{ backgroundColor: CLUSTER_COLOURS[index % CLUSTER_COLOURS.length] }}
                      />
                      <span className="ml-2 font-mono">C{index + 1}</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{mostFrequent(members.map((m) => m.name))}</td>
                    <td className="px-3 py-1.5 font-mono text-muted">
                      {mostFrequent(members.map((m) => m.zip))}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-muted">
                      {Math.round(members.reduce((sum, m) => sum + m.income, 0) / members.length)}k
                    </td>
                    <td className={cn("px-3 py-1.5 font-mono text-xs", members.length > 1 ? "text-brand" : "text-faint")}>
                      {members.map((m) => m.id).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">
        Merge rules here are majority value per field and the mean income. At a threshold of 0.50 the
        result is exactly the clean relation from the lecture: Green / 51519 / 39k, Peter / 30528 /
        40k and Chuck / 51519 / 30k.
      </p>
    </div>
  );
}
