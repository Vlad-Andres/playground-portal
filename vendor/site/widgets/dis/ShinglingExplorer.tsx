"use client";

import { useMemo, useState } from "react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { TextField } from "@site/components/ui/TextField";
import { cn } from "@site/lib/cn";

type TokenMode = "characters" | "words";

const PRESETS = [
  { label: "Small example", a: "abcab", b: "abfef", k: 2, mode: "characters" as TokenMode },
  { label: "Book example", a: "abcdabd", b: "abcdabd", k: 2, mode: "characters" as TokenMode },
  {
    label: "One word changed",
    a: "The dog which chased the cat",
    b: "The dog that chased the cat",
    k: 3,
    mode: "characters" as TokenMode,
  },
  {
    label: "Reordered sentence",
    a: "entity resolution finds duplicate records",
    b: "finds duplicate records entity resolution",
    k: 2,
    mode: "words" as TokenMode,
  },
];

function hashShingle(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 20;
}

function buildShingles(text: string, k: number, mode: TokenMode) {
  const normalised = text.toLowerCase().replace(/\s+/g, " ").trim();
  const set = new Set<string>();

  if (mode === "words") {
    const words = normalised.split(" ").filter(Boolean);
    for (let index = 0; index + k <= words.length; index += 1) {
      set.add(words.slice(index, index + k).join(" "));
    }
  } else {
    for (let index = 0; index + k <= normalised.length; index += 1) {
      set.add(normalised.slice(index, index + k));
    }
  }
  return set;
}

export function ShinglingExplorer() {
  const [first, setFirst] = useState(PRESETS[2].a);
  const [second, setSecond] = useState(PRESETS[2].b);
  const [k, setK] = useState(PRESETS[2].k);
  const [mode, setMode] = useState<TokenMode>(PRESETS[2].mode);
  const [hashed, setHashed] = useState(false);

  const analysis = useMemo(() => {
    const setA = buildShingles(first, k, mode);
    const setB = buildShingles(second, k, mode);
    const union = new Set([...setA, ...setB]);
    const intersection = [...setA].filter((shingle) => setB.has(shingle));

    return {
      setA,
      setB,
      union: [...union].sort(),
      intersectionSize: intersection.length,
      similarity: union.size === 0 ? 0 : intersection.length / union.size,
    };
  }, [first, second, k, mode]);

  const label = (shingle: string) => (hashed ? String(hashShingle(shingle)) : shingle);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setFirst(preset.a);
              setSecond(preset.b);
              setK(preset.k);
              setMode(preset.mode);
            }}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Document 1" value={first} onChange={setFirst} multiline rows={2} />
        <TextField label="Document 2" value={second} onChange={setSecond} multiline rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <RangeField
          label={`Shingle size k (${mode})`}
          value={k}
          min={1}
          max={mode === "words" ? 5 : 9}
          display={`k = ${k}`}
          hint="Too small and every document looks alike; too large and near-duplicates stop overlapping."
          onChange={setK}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "characters" ? "words" : "characters")}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand/40 hover:text-brand"
          >
            Tokens: {mode}
          </button>
          <button
            type="button"
            onClick={() => setHashed((value) => !value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              hashed
                ? "border-brand/40 bg-brand-soft text-brand-strong"
                : "border-line bg-surface hover:border-brand/40 hover:text-brand",
            )}
          >
            {hashed ? "Hashed" : "Raw"} shingles
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="|S₁|" value={String(analysis.setA.size)} />
        <Stat label="|S₂|" value={String(analysis.setB.size)} />
        <Stat label="|S₁ ∩ S₂|" value={String(analysis.intersectionSize)} tone="positive" />
        <Stat
          label="Jaccard"
          value={analysis.similarity.toFixed(3)}
          hint={`distance ${(1 - analysis.similarity).toFixed(3)}`}
          tone="brand"
        />
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink">
          Union of both shingle sets ({analysis.union.length} elements)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {analysis.union.map((shingle) => {
            const inA = analysis.setA.has(shingle);
            const inB = analysis.setB.has(shingle);

            return (
              <span
                key={shingle}
                title={shingle}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-xs",
                  inA && inB
                    ? "border-positive/40 bg-positive-soft text-positive"
                    : inA
                      ? "border-brand/30 bg-brand-soft text-brand-strong"
                      : "border-accent/30 bg-accent-soft text-accent",
                )}
              >
                {label(shingle)}
              </span>
            );
          })}
        </div>
        <p className="text-xs text-faint">
          Green appears in both documents, purple only in document 1, orange only in document 2.
        </p>
      </div>
    </div>
  );
}
