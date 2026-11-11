"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import type { ConceptMapProps } from "@core/widgets";
import { cn } from "@site/lib/cn";

const WIDTH = 640;
const HEIGHT = 360;

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

/** Ideas on an ellipse joined by labelled links; clicking a node highlights its links. */
export function ConceptMap({ nodes, links }: ConceptMapProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const position = new Map(
    nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
      return [node.id, { x: cx + Math.cos(angle) * 240, y: cy + Math.sin(angle) * 140 }];
    }),
  );
  const label = (id: string) => nodes.find((node) => node.id === id)?.label ?? id;
  const related = selected ? links.filter((link) => link.from === selected || link.to === selected) : [];

  return (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Network size={15} className="text-brand" aria-hidden />
        Select an idea to see how it connects.
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full min-w-[520px]" role="img" aria-label="Concept map">
          {links.map((link, index) => {
            const from = position.get(link.from);
            const to = position.get(link.to);
            if (!from || !to) return null;
            const active = selected !== null && (link.from === selected || link.to === selected);
            return (
              <g key={index} className={selected !== null && !active ? "opacity-25" : undefined}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  strokeWidth={active ? 2.4 : 1.2}
                  className={active ? "stroke-[var(--brand)]" : "stroke-[var(--line-strong)]"}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 4}
                  textAnchor="middle"
                  className={cn("text-[10px]", active ? "fill-[var(--brand-strong)] font-semibold" : "fill-[var(--muted)]")}
                >
                  {truncate(link.label, 18)}
                </text>
              </g>
            );
          })}
          {nodes.map((node) => {
            const point = position.get(node.id);
            if (!point) return null;
            const text = truncate(node.label, 22);
            const width = Math.min(170, text.length * 7 + 22);
            const active = node.id === selected;
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={node.label}
                onClick={() => setSelected(active ? null : node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(active ? null : node.id);
                  }
                }}
                className="cursor-pointer"
              >
                <rect
                  x={point.x - width / 2}
                  y={point.y - 16}
                  width={width}
                  height={32}
                  rx={10}
                  strokeWidth={active ? 2 : 1}
                  className={
                    active ? "fill-[var(--brand)] stroke-[var(--brand-strong)]" : "fill-[var(--sunken)] stroke-[var(--line-strong)]"
                  }
                />
                <text
                  x={point.x}
                  y={point.y + 4}
                  textAnchor="middle"
                  className={cn("text-[11px] font-medium", active ? "fill-[var(--brand-ink)]" : "fill-[var(--ink)]")}
                >
                  {text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {selected ? (
        <ul className="animate-rise grid gap-1 rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3 text-sm" aria-live="polite">
          {related.length === 0 ? <li className="text-muted">No links from {label(selected)}.</li> : null}
          {related.map((link, index) => (
            <li key={index} className="text-ink">
              <span className="font-semibold">{label(link.from)}</span> <span className="text-muted">— {link.label} →</span>{" "}
              <span className="font-semibold">{label(link.to)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
