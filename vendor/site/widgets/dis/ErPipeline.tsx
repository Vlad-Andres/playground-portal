"use client";

import { useState } from "react";
import { ArrowRight, Boxes, Database, Fingerprint, GitMerge, Layers, Scale } from "lucide-react";
import { cn } from "@site/lib/cn";

const STAGES = [
  {
    id: "records",
    label: "Records",
    icon: Database,
    size: "N records",
    what: "Descriptions of real-world entities arriving from several sources, each with its own format, identifiers and spelling conventions.",
    why: "There is no global coordination of identifiers, so the same entity shows up under many names, and one name covers many entities.",
    cost: "Comparing everything costs N(N−1)/2 pairs.",
  },
  {
    id: "sets",
    label: "Sets of shingles",
    icon: Boxes,
    size: "N sets",
    what: "Each record or document becomes the set of k-shingles (substrings or word sequences of length k) that occur in it.",
    why: "Set overlap survives reordering and small edits, so lexical similarity becomes Jaccard similarity of sets.",
    cost: "Sets are large — roughly the size of the document, or four bytes per shingle once hashed.",
  },
  {
    id: "signatures",
    label: "Minhash signatures",
    icon: Fingerprint,
    size: "N × n integers",
    what: "Each set is summarised by n minhash values, one per hash function used as a random row permutation.",
    why: "The probability that two signatures agree in a row equals the Jaccard similarity of the sets they represent.",
    cost: "One pass over the data; 100 hashes turn any set into 100 small integers.",
  },
  {
    id: "candidates",
    label: "Candidate pairs",
    icon: Layers,
    size: "≪ N² pairs",
    what: "The signature matrix is split into b bands of r rows; columns that collide in any band become candidate pairs.",
    why: "The banding probability 1 − (1 − sᵣ)ᵇ is an S-curve, so similar pairs collide and dissimilar ones almost never do.",
    cost: "Tune b and r for a threshold of about (1/b)^(1/r). False negatives are the price.",
  },
  {
    id: "scores",
    label: "Scored matches",
    icon: Scale,
    size: "candidates only",
    what: "Only the candidates are scored with the expensive, field-aware similarity: edit distance on names, address and phone comparisons, weighted penalties.",
    why: "Record similarity does not fit the plain set model, so the accurate measure is reserved for a small pool.",
    cost: "Choose the score cut-off that separates true from false matches.",
  },
  {
    id: "clusters",
    label: "Clusters and merge",
    icon: GitMerge,
    size: "M < N entities",
    what: "Matching pairs are closed transitively into clusters, and each cluster is merged into one unified record.",
    why: "Deduplication is only finished once the data collection itself is updated with the clean relation.",
    cost: "Merging must decide which value wins per field — majority, most recent, or an aggregate.",
  },
] as const;

export function ErPipeline() {
  const [activeId, setActiveId] = useState<string>(STAGES[0].id);
  const active = STAGES.find((stage) => stage.id === activeId) ?? STAGES[0];

  return (
    <div className="grid gap-5">
      <ol className="grid gap-2 lg:flex lg:items-stretch lg:gap-1">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.id === activeId;

          return (
            <li key={stage.id} className="flex items-center gap-2 lg:min-w-0 lg:flex-1 lg:gap-1">
              <button
                type="button"
                onClick={() => setActiveId(stage.id)}
                aria-pressed={isActive}
                className={cn(
                  "grid min-w-0 flex-1 content-start gap-1.5 rounded-xl border px-3 py-3 text-left transition-colors",
                  isActive
                    ? "border-brand/50 bg-brand-soft"
                    : "border-line bg-surface hover:border-brand/30 hover:bg-brand-soft/40",
                )}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-brand" : "text-faint"}
                  aria-hidden
                />
                <span className={cn("text-sm font-semibold", isActive ? "text-brand-strong" : "text-ink")}>
                  {stage.label}
                </span>
                <span className="font-mono text-xs text-faint">{stage.size}</span>
              </button>

              {index < STAGES.length - 1 ? (
                <ArrowRight
                  size={16}
                  className="hidden shrink-0 self-center text-faint lg:block"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="animate-rise grid gap-3 rounded-xl border border-line bg-sunken p-4 sm:p-5" key={active.id}>
        <h4 className="text-sm font-semibold text-ink">{active.label}</h4>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="grid content-start gap-1">
            <dt className="text-xs font-semibold tracking-wide text-faint uppercase">What happens</dt>
            <dd className="text-sm text-muted">{active.what}</dd>
          </div>
          <div className="grid content-start gap-1">
            <dt className="text-xs font-semibold tracking-wide text-faint uppercase">Why it works</dt>
            <dd className="text-sm text-muted">{active.why}</dd>
          </div>
          <div className="grid content-start gap-1">
            <dt className="text-xs font-semibold tracking-wide text-faint uppercase">What it costs</dt>
            <dd className="text-sm text-muted">{active.cost}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
