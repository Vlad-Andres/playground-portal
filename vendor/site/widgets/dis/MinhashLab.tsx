"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const ROWS = 5;
const COLUMNS = ["C₁", "C₂"];
const HASHES = [
  { name: "h(x) = x mod 5", apply: (x: number) => x % 5 },
  { name: "g(x) = (2x+1) mod 5", apply: (x: number) => (2 * x + 1) % 5 },
];

const INITIAL_MATRIX = [
  [true, false],
  [false, true],
  [true, true],
  [true, false],
  [false, true],
];

function computeSignatures(matrix: boolean[][], steps: number) {
  const signatures = HASHES.map(() => COLUMNS.map(() => Number.POSITIVE_INFINITY));
  const updated = HASHES.map(() => COLUMNS.map(() => false));

  for (let row = 0; row < steps; row += 1) {
    HASHES.forEach((hash, hashIndex) => {
      const value = hash.apply(row + 1);
      COLUMNS.forEach((_, columnIndex) => {
        if (!matrix[row][columnIndex]) return;
        if (value < signatures[hashIndex][columnIndex]) {
          signatures[hashIndex][columnIndex] = value;
          updated[hashIndex][columnIndex] = row === steps - 1;
        }
      });
    });
  }
  return { signatures, updated };
}

function jaccardOfColumns(matrix: boolean[][]) {
  let intersection = 0;
  let union = 0;
  for (const row of matrix) {
    if (row[0] && row[1]) intersection += 1;
    if (row[0] || row[1]) union += 1;
  }
  return union === 0 ? 0 : intersection / union;
}

export function MinhashLab() {
  const [matrix, setMatrix] = useState(INITIAL_MATRIX);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const isPlaying = playing && step < ROWS;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => setStep((value) => Math.min(value + 1, ROWS)), 1100);
    return () => window.clearTimeout(timer);
  }, [isPlaying, step]);

  const { signatures, updated } = useMemo(() => computeSignatures(matrix, step), [matrix, step]);

  const agreement = useMemo(() => {
    if (step < ROWS) return null;
    const agreeing = signatures.filter((row) => row[0] === row[1]).length;
    return agreeing / HASHES.length;
  }, [signatures, step]);

  const trueJaccard = jaccardOfColumns(matrix);

  const toggleCell = (row: number, column: number) => {
    setMatrix((previous) =>
      previous.map((values, rowIndex) =>
        rowIndex === row ? values.map((value, columnIndex) => (columnIndex === column ? !value : value)) : values,
      ),
    );
    setStep(0);
    setPlaying(false);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStep((value) => Math.min(value + 1, ROWS))}
          disabled={step >= ROWS}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
        >
          <StepForward size={15} aria-hidden />
          Next row
        </button>
        <button
          type="button"
          onClick={() => {
            if (isPlaying) {
              setPlaying(false);
              return;
            }
            if (step >= ROWS) setStep(0);
            setPlaying(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          {isPlaying ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setPlaying(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          <RotateCcw size={15} aria-hidden />
          Reset
        </button>
        <span className="text-xs text-faint">
          Row {Math.min(step, ROWS)} of {ROWS} scanned · click any 0/1 cell to change the input
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">Input matrix (shingles × sets)</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-sunken text-xs">
                  <th className="px-3 py-2 text-left font-semibold">Row</th>
                  {COLUMNS.map((column) => (
                    <th key={column} className="px-3 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                  {HASHES.map((hash) => (
                    <th key={hash.name} className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
                      {hash.name.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rowIndex) => {
                  const isCurrent = rowIndex === step - 1;
                  const isScanned = rowIndex < step;

                  return (
                    <tr
                      key={rowIndex}
                      className={cn(
                        "border-t border-line transition-colors",
                        isCurrent && "bg-brand-soft",
                        !isCurrent && isScanned && "bg-surface",
                        !isScanned && "bg-surface opacity-60",
                      )}
                    >
                      <td className="px-3 py-1.5 font-mono tabular-nums">{rowIndex + 1}</td>
                      {row.map((value, columnIndex) => (
                        <td key={columnIndex} className="px-3 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(rowIndex, columnIndex)}
                            aria-label={`Toggle row ${rowIndex + 1} of column ${COLUMNS[columnIndex]}`}
                            className={cn(
                              "size-7 rounded-md border font-mono text-xs transition-colors",
                              value
                                ? "border-brand/40 bg-brand text-brand-ink"
                                : "border-line bg-sunken text-faint hover:border-brand/40",
                            )}
                          >
                            {value ? 1 : 0}
                          </button>
                        </td>
                      ))}
                      {HASHES.map((hash) => (
                        <td
                          key={hash.name}
                          className={cn(
                            "px-3 py-1.5 text-center font-mono tabular-nums",
                            isScanned ? "text-ink" : "text-faint",
                          )}
                        >
                          {hash.apply(rowIndex + 1)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid content-start gap-2">
          <p className="text-sm font-medium text-ink">Signature matrix M</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-sunken text-xs">
                  <th className="px-3 py-2 text-left font-semibold">Hash</th>
                  {COLUMNS.map((column) => (
                    <th key={column} className="px-3 py-2 font-semibold">
                      sig({column})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HASHES.map((hash, hashIndex) => (
                  <tr key={hash.name} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{hash.name}</td>
                    {COLUMNS.map((column, columnIndex) => {
                      const value = signatures[hashIndex][columnIndex];
                      return (
                        <td key={column} className="px-3 py-2 text-center">
                          <span
                            className={cn(
                              "inline-grid size-8 place-items-center rounded-md border font-mono text-sm tabular-nums transition-colors",
                              updated[hashIndex][columnIndex]
                                ? "border-positive/40 bg-positive-soft text-positive"
                                : "border-line bg-sunken text-ink",
                            )}
                          >
                            {Number.isFinite(value) ? value : "∞"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <Stat
              label="True Jaccard"
              value={trueJaccard.toFixed(2)}
              hint="from the full columns"
              tone="brand"
            />
            <Stat
              label="Signature estimate"
              value={agreement === null ? "—" : agreement.toFixed(2)}
              hint={agreement === null ? "finish the scan" : "fraction of agreeing rows"}
              tone={agreement !== null && Math.abs(agreement - trueJaccard) > 0.25 ? "warning" : "positive"}
            />
          </div>
          <p className="text-xs text-faint">
            Two hash functions is far too short a signature: the estimate is unbiased but very noisy.
            Real systems use 100 or more.
          </p>
        </div>
      </div>
    </div>
  );
}
