"use client";

import Link from "next/link";
import { MousePointerClick } from "lucide-react";
import type { Concept } from "@site/content/types";
import { ConceptCard } from "@site/components/content/ConceptCard";
import { DataTable } from "@site/components/content/DataTable";
import { FigureImage } from "@site/components/content/FigureImage";
import { Formula } from "@site/components/content/Formula";
import { HighlightList } from "@site/components/content/HighlightList";
import { InfoBox } from "@site/components/content/InfoBox";
import { Markdown } from "@site/components/content/Markdown";
import { MemoryCards } from "@site/components/content/MemoryCards";
import { PracticeSet } from "@site/components/content/PracticeSet";
import { Timeline } from "@site/components/content/Timeline";
import { WorkedExample } from "@site/components/content/WorkedExample";
import type { ReviewBlock } from "@site/lib/reviewData";
import { RunnableCode } from "@site/components/content/RunnableCode";
import { runLanguage } from "@site/lib/runner/types";

interface ReviewBlockViewProps {
  block: ReviewBlock;
  concepts: Concept[];
  href: string;
}

/** Client-side counterpart of BlockRenderer for content loaded as JSON. */
export function ReviewBlockView({ block, concepts, href }: ReviewBlockViewProps) {
  switch (block.kind) {
    case "prose":
      return <Markdown>{block.md}</Markdown>;
    case "info":
      return (
        <InfoBox variant={block.variant} title={block.title}>
          {block.md}
        </InfoBox>
      );
    case "concepts":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {block.ids
            .map((id) => concepts.find((concept) => concept.id === id))
            .filter((concept): concept is Concept => Boolean(concept))
            .map((concept) => (
              <ConceptCard key={concept.id} concept={concept} />
            ))}
        </div>
      );
    case "formula":
      return <Formula tex={block.tex} caption={block.caption} />;
    case "code": {
      const engine = block.run === false ? null : runLanguage(block.lang);
      if (engine) {
        const config = block.run || {};
        return <RunnableCode lang={engine} code={block.code} runCode={config.code} note={config.note} hint={config.hint} caption={block.caption} />;
      }
      return (
        <figure className="grid gap-2">
          <pre className="overflow-x-auto rounded-xl border border-line bg-sunken p-4 font-mono text-xs leading-relaxed text-ink">
            {block.code}
          </pre>
          {block.caption ? <figcaption className="text-xs text-faint">{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case "table":
      return <DataTable headers={block.headers} rows={block.rows} caption={block.caption} />;
    case "figure":
      return <FigureImage src={block.src} alt={block.alt} width={block.width} height={block.height} caption={block.caption} />;
    case "steps":
      return <WorkedExample title={block.title} intro={block.intro} steps={block.steps} />;
    case "timeline":
      return <Timeline items={block.items} />;
    case "list":
      return <HighlightList variant={block.variant} items={block.items} />;
    case "recall":
      return <MemoryCards cards={block.cards} />;
    case "practice":
      return <PracticeSet id={block.id} tasks={block.tasks} />;
    case "widget":
    case "exercises":
    case "custom":
      return (
        <Link
          href={href}
          className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3 text-sm hover:border-brand/60"
        >
          <MousePointerClick size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
          <span className="grid gap-0.5">
            <span className="font-semibold text-ink">{block.title}</span>
            <span className="text-muted">
              {block.kind === "widget"
                ? (block.description ?? "Interactive playground")
                : block.kind === "custom"
                  ? block.description
                  : "Exercise sheet"}{" "}
              — open it in the lecture to try it.
            </span>
          </span>
        </Link>
      );
  }
}
