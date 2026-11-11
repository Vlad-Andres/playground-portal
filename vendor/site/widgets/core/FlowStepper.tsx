"use client";

import { useId, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { FlowStepperProps } from "@core/widgets";
import { Markdown } from "@site/components/content/Markdown";
import { cn } from "@site/lib/cn";
import { layeredLayout } from "./layout";
import { buttonClass, primaryButtonClass } from "./ui";

const BOX = { width: 150, height: 46, gapX: 56, gapY: 18 };
const PAD = 12;

function short(text: string, length = 20): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

/** Boxes and arrows, left to right; Next/Back walks through the nodes and shows each one's detail. */
export function FlowStepper({ nodes, edges }: FlowStepperProps) {
  const layout = useMemo(() => layeredLayout(nodes, edges, BOX), [nodes, edges]);
  const order = useMemo(
    () => [...layout.placed].sort((a, b) => a.rank - b.rank || a.y - b.y).map((item) => item.node.id),
    [layout],
  );
  const [step, setStep] = useState(0);
  const markerId = `flow-arrow-${useId().replace(/:/g, "")}`;
  const currentId = order[step];
  const current = nodes.find((node) => node.id === currentId);
  const position = new Map(layout.placed.map((item) => [item.node.id, item]));
  const width = layout.width + PAD * 2;
  const height = layout.height + PAD * 2 + 14;

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          style={{ minWidth: Math.min(width, 640) }}
          role="img"
          aria-label={`Flow: ${nodes.map((node) => node.label).join(", ")}`}
        >
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-[var(--line-strong)]" />
            </marker>
          </defs>
          {edges.map((edge, index) => {
            const from = position.get(edge.from);
            const to = position.get(edge.to);
            if (!from || !to) return null;
            const x1 = PAD + from.x + BOX.width;
            const y1 = PAD + from.y + BOX.height / 2;
            const x2 = PAD + to.x;
            const y2 = PAD + to.y + BOX.height / 2;
            const backwards = x2 <= x1;
            const path = backwards
              ? `M ${PAD + from.x + BOX.width / 2} ${PAD + from.y + BOX.height} C ${PAD + from.x + BOX.width / 2} ${height}, ${PAD + to.x + BOX.width / 2} ${height}, ${PAD + to.x + BOX.width / 2} ${PAD + to.y + BOX.height}`
              : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
            const active = edge.from === currentId || edge.to === currentId;
            return (
              <g key={index}>
                <path
                  d={path}
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                  strokeWidth={active ? 2 : 1.3}
                  className={active ? "stroke-[var(--brand)]" : "stroke-[var(--line-strong)]"}
                />
                {edge.label && !backwards ? (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
                    {short(edge.label, 16)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {layout.placed.map(({ node, x, y }) => {
            const index = order.indexOf(node.id);
            const active = node.id === currentId;
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={node.label}
                aria-current={active ? "step" : undefined}
                onClick={() => setStep(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setStep(index);
                  }
                }}
                className="cursor-pointer"
              >
                <rect
                  x={PAD + x}
                  y={PAD + y}
                  width={BOX.width}
                  height={BOX.height}
                  rx={10}
                  strokeWidth={active ? 2 : 1}
                  className={cn(
                    active
                      ? "fill-[var(--brand)] stroke-[var(--brand-strong)]"
                      : index < step
                        ? "fill-[var(--brand-soft)] stroke-[var(--brand)]"
                        : "fill-[var(--sunken)] stroke-[var(--line-strong)]",
                  )}
                />
                <text
                  x={PAD + x + BOX.width / 2}
                  y={PAD + y + BOX.height / 2 + 4}
                  textAnchor="middle"
                  className={cn("text-[12px] font-medium", active ? "fill-[var(--brand-ink)]" : "fill-[var(--ink)]")}
                >
                  {short(node.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grid gap-2 rounded-xl border border-line bg-surface px-4 py-3" aria-live="polite">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">
          Step {step + 1} of {order.length}
        </p>
        <p className="font-semibold text-ink">{current?.label}</p>
        {current?.detail ? (
          <div className="text-sm text-muted">
            <Markdown>{current.detail}</Markdown>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} onClick={() => setStep((value) => value - 1)} disabled={step === 0}>
          <ArrowLeft size={15} aria-hidden /> Back
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => setStep((value) => value + 1)}
          disabled={step === order.length - 1}
        >
          Next <ArrowRight size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
