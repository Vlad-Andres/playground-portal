"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { cn } from "@site/lib/cn";

interface ConceptMapProps {
  center: string;
  nodes: { term: string; detail: string }[];
}

const WIDTH = 640;
const HEIGHT = 340;

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

/** A radial mind map of the key terms: open every node to explain it, a small exploration game. */
export function ConceptMap({ center, nodes }: ConceptMapProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [opened, setOpened] = useState<Set<number>>(new Set());

  if (nodes.length === 0) {
    return <p className="text-sm text-muted">No key terms are marked in this part — try the flashcards or the explanation.</p>;
  }

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const positions = nodes.map((_, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
    return { x: cx + Math.cos(angle) * 225, y: cy + Math.sin(angle) * 125 };
  });

  function open(index: number) {
    setSelected(index);
    setOpened((current) => new Set(current).add(index));
  }

  return (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Network size={15} className="text-brand" aria-hidden />
        Before opening a node, say out loud what it means. Opened {opened.size} / {nodes.length}.
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full min-w-[520px]" role="img" aria-label={`Concept map of ${center}`}>
          {positions.map((position, index) => (
            <line
              key={`line-${index}`}
              x1={cx}
              y1={cy}
              x2={position.x}
              y2={position.y}
              strokeWidth={selected === index ? 2.5 : 1.2}
              className={selected === index ? "stroke-[var(--brand)]" : "stroke-[var(--line-strong)]"}
            />
          ))}
          <g>
            <rect x={cx - 95} y={cy - 22} width={190} height={44} rx={22} className="fill-[var(--brand)]" />
            <text x={cx} y={cy + 4} textAnchor="middle" className="fill-[var(--brand-ink)] text-[12px] font-semibold">
              {truncate(center, 28)}
            </text>
          </g>
          {nodes.map((node, index) => {
            const label = truncate(node.term, 22);
            const width = Math.min(170, label.length * 7 + 22);
            const { x, y } = positions[index];
            const isOpen = opened.has(index);
            return (
              <g
                key={node.term}
                role="button"
                tabIndex={0}
                onClick={() => open(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") open(index);
                }}
                className="cursor-pointer outline-none"
              >
                <rect
                  x={x - width / 2}
                  y={y - 16}
                  width={width}
                  height={32}
                  rx={10}
                  strokeWidth={selected === index ? 2 : 1}
                  className={cn(
                    selected === index
                      ? "fill-[var(--brand-soft)] stroke-[var(--brand)]"
                      : isOpen
                        ? "fill-[var(--positive-soft)] stroke-[var(--positive)]"
                        : "fill-[var(--sunken)] stroke-[var(--line-strong)]",
                  )}
                />
                <text x={x} y={y + 4} textAnchor="middle" className="fill-[var(--ink)] text-[11px] font-medium">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {selected !== null ? (
        <div className="animate-rise rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3 text-sm">
          <span className="font-semibold text-ink">{nodes[selected].term}</span>
          <span className="text-muted"> — {nodes[selected].detail || "Find it in the original text above."}</span>
        </div>
      ) : null}
    </div>
  );
}
