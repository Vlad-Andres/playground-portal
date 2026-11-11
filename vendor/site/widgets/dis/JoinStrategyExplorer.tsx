"use client";

import { useState } from "react";
import { cn } from "@site/lib/cn";

type Strategy = "co-located" | "distributed" | "broadcast";

const STRATEGIES: {
  id: Strategy;
  label: string;
  summary: string;
  requires: string;
  cost: string;
  movement: "none" | "shuffle" | "broadcast";
}[] = [
  {
    id: "co-located",
    label: "Co-located join",
    summary:
      "Both tables are sharded on the join column, so matching rows already sit on the same machine. Every node joins locally and only the results go to the master.",
    requires: "Both tables sharded on the join column.",
    cost: "No cross-shard communication at all — only the final results travel.",
    movement: "none",
  },
  {
    id: "distributed",
    label: "Distributed join",
    summary:
      "Neither table is sharded on the join column, so both are re-partitioned on it first. Once the rows have moved, every node joins its own partition locally.",
    requires: "Nothing, but it moves the most data.",
    cost: "Both tables cross the interconnect. The slowest of the three.",
    movement: "shuffle",
  },
  {
    id: "broadcast",
    label: "Broadcast join",
    summary:
      "The smaller relation is copied to every machine, which then joins it against its own shard of the large one. MemSQL's reference tables are exactly this, pre-replicated.",
    requires: "One relation small enough to fit on every node.",
    cost: "The small table is sent n times; the large table never moves.",
    movement: "broadcast",
  },
];

const NODES = [0, 1, 2];
const PAIRS: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 2],
];

export function JoinStrategyExplorer() {
  const [strategy, setStrategy] = useState<Strategy>("co-located");
  const active = STRATEGIES.find((item) => item.id === strategy) ?? STRATEGIES[0];

  const nodeX = (index: number) => 70 + index * 150;

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 sm:grid-cols-3">
        {STRATEGIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStrategy(item.id)}
            aria-pressed={strategy === item.id}
            className={cn(
              "rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
              strategy === item.id
                ? "border-brand/50 bg-brand-soft text-brand-strong"
                : "border-line bg-surface text-ink hover:border-brand/40",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-sunken p-3">
        <svg viewBox="0 0 440 210" className="h-auto w-full" role="img" aria-label={`${active.label} data movement`}>
          <defs>
            <marker id="join-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
            </marker>
          </defs>

          {NODES.map((index) => (
            <g key={index}>
              <text x={nodeX(index)} y={52} textAnchor="middle" className="fill-[var(--muted)] text-[11px] font-semibold">
                Node {index + 1}
              </text>
              <rect
                x={nodeX(index) - 55}
                y={62}
                width={110}
                height={95}
                rx={10}
                fill="var(--surface)"
                stroke="var(--line-strong)"
              />
              <rect
                x={nodeX(index) - 42}
                y={75}
                width={84}
                height={26}
                rx={6}
                fill="var(--brand-soft)"
                stroke="var(--brand)"
                strokeOpacity={0.4}
              />
              <text x={nodeX(index)} y={92} textAnchor="middle" className="fill-[var(--ink)] font-mono text-[11px]">
                R shard {index + 1}
              </text>
              <rect
                x={nodeX(index) - 42}
                y={119}
                width={84}
                height={26}
                rx={6}
                fill={active.movement === "broadcast" ? "var(--accent-soft)" : "var(--sunken)"}
                stroke={active.movement === "broadcast" ? "var(--accent)" : "var(--line-strong)"}
                strokeOpacity={0.5}
              />
              <text x={nodeX(index)} y={136} textAnchor="middle" className="fill-[var(--ink)] font-mono text-[11px]">
                {active.movement === "broadcast" ? "S (full copy)" : `S shard ${index + 1}`}
              </text>
            </g>
          ))}

          {active.movement === "shuffle"
            ? PAIRS.map(([from, to]) => (
                <path
                  key={`${from}-${to}`}
                  d={`M ${nodeX(from)} 38 Q ${(nodeX(from) + nodeX(to)) / 2} ${38 - 18 - 8 * (to - from)} ${nodeX(to)} 38`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  markerStart="url(#join-arrow)"
                  markerEnd="url(#join-arrow)"
                />
              ))
            : null}

          {active.movement === "broadcast"
            ? NODES.filter((index) => index !== 0).map((index) => (
                <path
                  key={index}
                  d={`M ${nodeX(0)} 38 Q ${(nodeX(0) + nodeX(index)) / 2} ${38 - 18 - 8 * index} ${nodeX(index)} 38`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  markerEnd="url(#join-arrow)"
                />
              ))
            : null}

          <text x={220} y={176} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
            {active.movement === "none"
              ? "join computed locally — nothing crosses the network"
              : active.movement === "shuffle"
                ? "both tables re-partitioned on the join column"
                : "the small relation is copied to every node"}
          </text>
          <text x={220} y={196} textAnchor="middle" className="fill-[var(--faint)] text-[10px]">
            results are collected by the master / aggregator node
          </text>
        </svg>
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-sunken p-4 sm:grid-cols-3">
        <div className="grid content-start gap-1">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">How it works</p>
          <p className="text-sm text-muted">{active.summary}</p>
        </div>
        <div className="grid content-start gap-1">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Requires</p>
          <p className="text-sm text-muted">{active.requires}</p>
        </div>
        <div className="grid content-start gap-1">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Network cost</p>
          <p className="text-sm text-muted">{active.cost}</p>
        </div>
      </div>
    </div>
  );
}
