"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, Trash2 } from "lucide-react";
import { LearningKit } from "@site/components/difficult/LearningKit";
import { ReviewBlockView } from "@site/components/difficult/ReviewBlockView";
import { formatDue, type ResolvedItem } from "@site/components/difficult/kit";
import { Badge } from "@site/components/ui/Badge";
import { Card } from "@site/components/ui/Card";
import { MAX_BOX } from "@site/lib/difficult";
import { cn } from "@site/lib/cn";

export function MasteryDots({ box }: { box: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Box ${box} of ${MAX_BOX}`} aria-label={`Mastery ${box} of ${MAX_BOX}`}>
      {Array.from({ length: MAX_BOX }, (_, index) => (
        <span key={index} className={cn("size-2 rounded-full", index < box ? (box === MAX_BOX ? "bg-positive" : "bg-brand") : "bg-line-strong")} />
      ))}
    </span>
  );
}

interface DifficultItemCardProps {
  resolved: ResolvedItem;
  now: number;
  onRemove: () => void;
}

export function DifficultItemCard({ resolved, now, onRemove }: DifficultItemCardProps) {
  const { item, lecture } = resolved;
  return (
    <Card as="section" id={item.key} className="grid scroll-mt-24 gap-4 p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-xs font-medium text-faint">
            {lecture.number > 0 ? `Lecture ${lecture.number} · ` : ""}
            {lecture.title}
          </p>
          <h3 className="text-base font-semibold text-ink">
            {resolved.sectionTitle}
            {item.blockIndex === null ? <span className="font-normal text-faint"> · whole section</span> : null}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <MasteryDots box={item.box} />
            <Badge tone={item.due <= now ? "warning" : "neutral"}>{formatDue(item.due, now)}</Badge>
            {item.reviews > 0 ? <span className="text-xs text-faint">{item.reviews} reviews</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={resolved.href}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-brand/40 hover:text-brand"
          >
            In the lecture <ArrowUpRight size={13} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove from difficult parts"
            title="Remove from difficult parts"
            className="rounded-lg border border-line bg-surface p-1.5 text-faint hover:border-danger/40 hover:text-danger"
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      </header>

      <details open={item.blockIndex !== null} className="group rounded-xl border border-line px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink">
          <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden />
          The original text
        </summary>
        <div className="mt-4 grid gap-5">
          {resolved.blocks.map((block, index) => (
            <ReviewBlockView key={index} block={block} concepts={lecture.concepts} href={resolved.href} />
          ))}
        </div>
      </details>

      <LearningKit resolved={resolved} />
    </Card>
  );
}
