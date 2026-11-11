"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const ATTRIBUTES = ["PersNr", "Name", "Level", "Room", "Department", "salary", "taxclass"] as const;
type Attribute = (typeof ATTRIBUTES)[number];

const KEY: Attribute = "PersNr";

const PROFESSORS: Record<Attribute, string>[] = [
  { PersNr: "2125", Name: "Sokrates", Level: "C4", Room: "226", Department: "Philosophy", salary: "85000", taxclass: "1" },
  { PersNr: "2126", Name: "Russel", Level: "C4", Room: "232", Department: "Philosophy", salary: "80000", taxclass: "3" },
  { PersNr: "2127", Name: "Kopernikus", Level: "C3", Room: "310", Department: "Physics", salary: "65000", taxclass: "5" },
  { PersNr: "2133", Name: "Popper", Level: "C3", Room: "52", Department: "Philosophy", salary: "68000", taxclass: "1" },
  { PersNr: "2134", Name: "Augustinus", Level: "C3", Room: "309", Department: "Theology", salary: "55000", taxclass: "5" },
  { PersNr: "2136", Name: "Curie", Level: "C4", Room: "36", Department: "Physics", salary: "95000", taxclass: "3" },
  { PersNr: "2137", Name: "Kant", Level: "C4", Room: "7", Department: "Philosophy", salary: "98000", taxclass: "1" },
];

const SPLIT_ATTRIBUTES: Attribute[] = ["Department", "Level", "taxclass"];
const DEFAULT_RIGHT: Attribute[] = ["salary", "taxclass"];

function Relation({
  caption,
  attributes,
  rows,
  tone = "neutral",
}: {
  caption: string;
  attributes: Attribute[];
  rows: Record<Attribute, string>[];
  tone?: "neutral" | "brand" | "positive";
}) {
  return (
    <figure className="grid gap-1.5">
      <figcaption
        className={cn(
          "font-mono text-xs font-semibold",
          tone === "brand" ? "text-brand" : tone === "positive" ? "text-positive" : "text-muted",
        )}
      >
        {caption}
      </figcaption>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-sunken">
              {attributes.map((attribute) => (
                <th
                  key={attribute}
                  className={cn(
                    "px-2.5 py-1.5 text-left font-semibold whitespace-nowrap",
                    attribute === KEY ? "text-brand" : "text-ink",
                  )}
                >
                  {attribute}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.PersNr} className="border-t border-line">
                {attributes.map((attribute) => (
                  <td key={attribute} className="px-2.5 py-1 font-mono whitespace-nowrap text-muted">
                    {row[attribute]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function Criterion({ label, met, detail }: { label: string; met: boolean; detail: string }) {
  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs",
        met ? "border-positive/35 bg-positive-soft/50" : "border-danger/35 bg-danger-soft/50",
      )}
    >
      {met ? (
        <Check size={14} className="mt-0.5 shrink-0 text-positive" aria-hidden />
      ) : (
        <X size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden />
      )}
      <span className="grid gap-0.5">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-faint">{detail}</span>
      </span>
    </li>
  );
}

export function FragmentationLab() {
  const [mode, setMode] = useState<"horizontal" | "vertical">("horizontal");
  const [splitAttribute, setSplitAttribute] = useState<Attribute>("Department");
  const [rightAttributes, setRightAttributes] = useState<Attribute[]>(DEFAULT_RIGHT);
  const [keyInBoth, setKeyInBoth] = useState(true);

  const horizontal = useMemo(() => {
    const groups = new Map<string, Record<Attribute, string>[]>();
    for (const row of PROFESSORS) {
      const value = row[splitAttribute];
      groups.set(value, [...(groups.get(value) ?? []), row]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [splitAttribute]);

  const leftAttributes = ATTRIBUTES.filter(
    (attribute) => !rightAttributes.includes(attribute) || (attribute === KEY && keyInBoth),
  );
  const rightWithKey = keyInBoth
    ? [KEY, ...rightAttributes.filter((attribute) => attribute !== KEY)]
    : rightAttributes;

  const reconstructable = mode === "horizontal" || (keyInBoth && rightAttributes.length > 0);
  const disjoint = mode === "horizontal" || !keyInBoth;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["horizontal", "vertical"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              mode === value
                ? "border-brand/50 bg-brand-soft text-brand-strong"
                : "border-line bg-surface text-muted hover:border-brand/40 hover:text-brand",
            )}
          >
            {value === "horizontal" ? "Horizontal (σ, rebuilt with ∪)" : "Vertical (π, rebuilt with ⋈)"}
          </button>
        ))}
      </div>

      <Relation caption="Professoren — the original relation, 7 tuples" attributes={[...ATTRIBUTES]} rows={PROFESSORS} />

      {mode === "horizontal" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">Decomposition predicate on</span>
            {SPLIT_ATTRIBUTES.map((attribute) => (
              <button
                key={attribute}
                type="button"
                onClick={() => setSplitAttribute(attribute)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-xs transition-colors",
                  splitAttribute === attribute
                    ? "border-brand/40 bg-brand-soft text-brand-strong"
                    : "border-line bg-surface text-muted hover:border-brand/40",
                )}
              >
                {attribute}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {horizontal.map(([value, rows]) => (
              <Relation
                key={value}
                caption={`σ ${splitAttribute} = '${value}' (Professoren) — ${rows.length} tuples`}
                attributes={[...ATTRIBUTES]}
                rows={rows}
                tone="brand"
              />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Fragments" value={String(horizontal.length)} tone="brand" />
            <Stat
              label="Tuples after ∪"
              value={String(horizontal.reduce((sum, [, rows]) => sum + rows.length, 0))}
              hint="must equal 7"
              tone="positive"
            />
            <Stat
              label="Predicates"
              value={String(horizontal.length)}
              hint={`2^${horizontal.length} = ${2 ** horizontal.length} combinations, mutually exclusive`}
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3">
            <p className="text-sm font-medium text-ink">
              Click an attribute to move it to the second fragment
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ATTRIBUTES.filter((attribute) => attribute !== KEY).map((attribute) => {
                const isRight = rightAttributes.includes(attribute);
                return (
                  <button
                    key={attribute}
                    type="button"
                    onClick={() =>
                      setRightAttributes((previous) =>
                        isRight
                          ? previous.filter((value) => value !== attribute)
                          : [...previous, attribute],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 font-mono text-xs transition-colors",
                      isRight
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-brand/30 bg-brand-soft text-brand-strong",
                    )}
                  >
                    {attribute}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setKeyInBoth((value) => !value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  keyInBoth
                    ? "border-positive/40 bg-positive-soft text-positive"
                    : "border-danger/40 bg-danger-soft text-danger",
                )}
              >
                {keyInBoth ? "PersNr in both fragments" : "PersNr only on the left"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Relation caption={`R₁ = π ${leftAttributes.join(", ")} (Professoren)`} attributes={leftAttributes} rows={PROFESSORS} tone="brand" />
            {rightWithKey.length > 0 ? (
              <Relation
                caption={`R₂ = π ${rightWithKey.join(", ")} (Professoren)`}
                attributes={rightWithKey}
                rows={PROFESSORS}
                tone="brand"
              />
            ) : (
              <p className="self-center text-sm text-faint">
                Move at least one attribute to the right to create a second fragment.
              </p>
            )}
          </div>
        </>
      )}

      <div className="grid gap-3 rounded-xl border border-line bg-sunken p-4">
        <p className="text-sm font-medium text-ink">
          Reconstruction:{" "}
          <span className="font-mono text-brand">
            {mode === "horizontal"
              ? horizontal.map((_, index) => `R${index + 1}`).join(" ∪ ")
              : "R₁ ⋈ R₂ on PersNr"}
          </span>
        </p>
        <ul className="grid gap-2 sm:grid-cols-3">
          <Criterion
            label="Completeness"
            met
            detail="Every tuple of Professoren appears in at least one fragment."
          />
          <Criterion
            label="Reconstructability"
            met={reconstructable}
            detail={
              reconstructable
                ? mode === "horizontal"
                  ? "The union of the fragments gives back all 7 tuples."
                  : "Both fragments carry PersNr, so the join is lossless."
                : "Without a shared candidate key the fragments cannot be joined back."
            }
          />
          <Criterion
            label="Disjointness"
            met={disjoint}
            detail={
              disjoint
                ? "The fragments do not overlap."
                : "PersNr is stored twice — an accepted trade for reconstructability."
            }
          />
        </ul>
      </div>
    </div>
  );
}
