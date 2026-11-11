"use client";

import { useMemo, useState } from "react";
import { TextField } from "@site/components/ui/TextField";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const PRESETS = [
  { label: "Author names", a: "John D. Smith", b: "J. D. Smith" },
  { label: "Jaro example", a: "DEIS", b: "DESI" },
  { label: "Book example", a: "abcde", b: "acfdeg" },
  { label: "Same person?", a: "Bob S. Jomes", b: "Robert Jones Jr." },
];

function levenshteinMatrix(a: string, b: string) {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const substitution = matrix[row - 1][column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1);
      matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, substitution);
    }
  }
  return matrix;
}

function longestCommonSubsequence(a: string, b: string) {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      table[row][column] =
        a[row - 1] === b[column - 1]
          ? table[row - 1][column - 1] + 1
          : Math.max(table[row - 1][column], table[row][column - 1]);
    }
  }
  return table[a.length][b.length];
}

function jaro(a: string, b: string) {
  if (a.length === 0 || b.length === 0) return { similarity: 0, common: 0, transpositions: 0 };

  const window = Math.max(Math.floor(Math.max(a.length, b.length) / 2) - 1, 0);
  const matchedA = new Array<boolean>(a.length).fill(false);
  const matchedB = new Array<boolean>(b.length).fill(false);
  let common = 0;

  for (let i = 0; i < a.length; i += 1) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, b.length);
    for (let j = start; j < end; j += 1) {
      if (matchedB[j] || a[i] !== b[j]) continue;
      matchedA[i] = true;
      matchedB[j] = true;
      common += 1;
      break;
    }
  }

  if (common === 0) return { similarity: 0, common: 0, transpositions: 0 };

  let mismatched = 0;
  let cursor = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!matchedA[i]) continue;
    while (!matchedB[cursor]) cursor += 1;
    if (a[i] !== b[cursor]) mismatched += 1;
    cursor += 1;
  }

  const transpositions = mismatched / 2;
  const similarity =
    (common / a.length + common / b.length + (common - transpositions) / common) / 3;

  return { similarity, common, transpositions };
}

function shingles(value: string, k: number) {
  const normalised = value.toLowerCase().replace(/\s+/g, " ").trim();
  const result = new Set<string>();
  for (let i = 0; i + k <= normalised.length; i += 1) result.add(normalised.slice(i, i + k));
  return result;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function StringSimilarityLab() {
  const [first, setFirst] = useState(PRESETS[1].a);
  const [second, setSecond] = useState(PRESETS[1].b);

  const analysis = useMemo(() => {
    const matrix = levenshteinMatrix(first, second);
    const editDistance = matrix[first.length][second.length];
    const lcs = longestCommonSubsequence(first, second);
    const longest = Math.max(first.length, second.length, 1);

    return {
      matrix,
      editDistance,
      normalised: 1 - editDistance / longest,
      indelDistance: first.length + second.length - 2 * lcs,
      jaro: jaro(first, second),
      jaccard: jaccard(shingles(first, 2), shingles(second, 2)),
    };
  }, [first, second]);

  const matrixFits = first.length <= 14 && second.length <= 14 && first.length > 0 && second.length > 0;

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
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              first === preset.a && second === preset.b
                ? "border-brand/40 bg-brand-soft text-brand-strong"
                : "border-line bg-surface text-muted hover:border-brand/40 hover:text-brand",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="String 1" value={first} onChange={setFirst} />
        <TextField label="String 2" value={second} onChange={setSecond} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Levenshtein"
          value={String(analysis.editDistance)}
          hint="insert / delete / update"
          tone="brand"
        />
        <Stat
          label="Indel distance"
          value={String(analysis.indelDistance)}
          hint="|s₁|+|s₂|−2·LCS"
        />
        <Stat
          label="Jaro"
          value={analysis.jaro.similarity.toFixed(4)}
          hint={`C=${analysis.jaro.common}, T=${analysis.jaro.transpositions}`}
        />
        <Stat
          label="Jaccard (2-shingles)"
          value={analysis.jaccard.toFixed(4)}
          hint="character bigrams"
        />
      </div>

      {matrixFits ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">Levenshtein dynamic-programming table</p>
          <div className="overflow-x-auto">
            <table className="border-collapse font-mono text-xs">
              <tbody>
                <tr>
                  <td className="p-1" />
                  <td className="p-1" />
                  {second.split("").map((character, index) => (
                    <td key={index} className="p-1 text-center font-semibold text-brand">
                      {character}
                    </td>
                  ))}
                </tr>
                {analysis.matrix.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="p-1 text-center font-semibold text-brand">
                      {rowIndex === 0 ? "" : first[rowIndex - 1]}
                    </td>
                    {row.map((cell, columnIndex) => (
                      <td
                        key={columnIndex}
                        className={cn(
                          "min-w-7 border border-line p-1 text-center tabular-nums",
                          rowIndex === first.length && columnIndex === second.length
                            ? "bg-brand text-brand-ink font-semibold"
                            : rowIndex === 0 || columnIndex === 0
                              ? "bg-sunken text-faint"
                              : "bg-surface text-muted",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-faint">
            Each cell is the cheapest edit script for the two prefixes; the highlighted corner is the
            answer.
          </p>
        </div>
      ) : (
        <p className="text-xs text-faint">
          The dynamic-programming table is shown for strings of up to 14 characters.
        </p>
      )}
    </div>
  );
}
