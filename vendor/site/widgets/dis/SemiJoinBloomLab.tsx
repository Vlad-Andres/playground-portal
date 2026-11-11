"use client";

import { useMemo, useState } from "react";
import { RangeField } from "@site/components/ui/RangeField";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

type Strategy = "naive" | "semijoin" | "bloom";

const R_TUPLES = [
  ["a1", "b1", "c1"],
  ["a2", "b2", "c2"],
  ["a3", "b3", "c1"],
  ["a4", "b4", "c2"],
  ["a5", "b5", "c3"],
  ["a6", "b6", "c2"],
  ["a7", "b7", "c6"],
];

const S_TUPLES = [
  ["c1", "d1", "e1"],
  ["c3", "d2", "e2"],
  ["c4", "d3", "e1"],
  ["c5", "d4", "e2"],
  ["c7", "d5", "e3"],
  ["c8", "d6", "e2"],
  ["c5", "d7", "e6"],
];

const HASH_COEFFICIENTS = [
  { a: 1, b: 2 },
  { a: 3, b: 1 },
  { a: 5, b: 4 },
];

const STRATEGIES: { id: Strategy; label: string; sends: string }[] = [
  { id: "naive", label: "Ship all of S", sends: "every tuple of S" },
  { id: "semijoin", label: "Semi-join filter", sends: "π_C(R), the join values" },
  { id: "bloom", label: "Bloom filter", sends: "an m-bit vector" },
];

function keyNumber(value: string) {
  return Number(value.slice(1));
}

export function SemiJoinBloomLab() {
  const [strategy, setStrategy] = useState<Strategy>("semijoin");
  const [bits, setBits] = useState(6);
  const [hashes, setHashes] = useState(1);

  const analysis = useMemo(() => {
    const joinKeys = new Set(R_TUPLES.map((tuple) => tuple[2]));

    const positions = (value: string) =>
      HASH_COEFFICIENTS.slice(0, hashes).map(
        ({ a, b }) => (a * keyNumber(value) + b) % bits,
      );

    const filter = new Array<boolean>(bits).fill(false);
    for (const key of joinKeys) {
      for (const position of positions(key)) filter[position] = true;
    }

    const rows = S_TUPLES.map((tuple) => {
      const isMatch = joinKeys.has(tuple[0]);
      const passesFilter = positions(tuple[0]).every((position) => filter[position]);
      const shipped =
        strategy === "naive" ? true : strategy === "semijoin" ? isMatch : passesFilter;

      return { tuple, isMatch, shipped, falseDrop: shipped && !isMatch };
    });

    const shippedBack = rows.filter((row) => row.shipped);
    const result = R_TUPLES.flatMap((left) =>
      S_TUPLES.filter((right) => right[0] === left[2]).map((right) => [...left, right[1], right[2]]),
    );

    const valuesOut =
      strategy === "naive" ? 0 : strategy === "semijoin" ? joinKeys.size : 0;
    const bitsOut = strategy === "bloom" ? bits : 0;
    const valuesBack = shippedBack.length * 3;

    return {
      joinKeys: [...joinKeys],
      filter,
      rows,
      result,
      valuesOut,
      bitsOut,
      valuesBack,
      falseDrops: rows.filter((row) => row.falseDrop).length,
    };
  }, [strategy, bits, hashes]);

  const naiveCost = S_TUPLES.length * 3;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {STRATEGIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStrategy(item.id)}
            aria-pressed={strategy === item.id}
            className={cn(
              "grid gap-0.5 rounded-xl border px-3.5 py-2 text-left transition-colors",
              strategy === item.id
                ? "border-brand/50 bg-brand-soft"
                : "border-line bg-surface hover:border-brand/40",
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                strategy === item.id ? "text-brand-strong" : "text-ink",
              )}
            >
              {item.label}
            </span>
            <span className="text-xs text-faint">sends {item.sends}</span>
          </button>
        ))}
      </div>

      {strategy === "bloom" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <RangeField
            label="Filter width m"
            value={bits}
            min={4}
            max={16}
            display={`m = ${bits} bits`}
            onChange={setBits}
          />
          <RangeField
            label="Hash functions k"
            value={hashes}
            min={1}
            max={3}
            display={`k = ${hashes}`}
            hint="hᵢ(n) = (aᵢ · n + bᵢ) mod m"
            onChange={setHashes}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <figure className="grid gap-1.5">
          <figcaption className="font-mono text-xs font-semibold text-brand">
            Site R — R(A, B, C), 7 tuples
          </figcaption>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-sunken">
                  {["A", "B", "C"].map((column) => (
                    <th key={column} className="px-3 py-1.5 text-left font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {R_TUPLES.map((tuple) => (
                  <tr key={tuple[0]} className="border-t border-line">
                    {tuple.map((value, valueIndex) => (
                      <td
                        key={value}
                        className={cn(
                          "px-3 py-1 font-mono",
                          valueIndex === 2 ? "text-brand" : "text-muted",
                        )}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>

        <figure className="grid gap-1.5">
          <figcaption className="font-mono text-xs font-semibold text-accent">
            Site S — S(C, D, E), 7 tuples
          </figcaption>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-sunken">
                  {["C", "D", "E", "shipped back"].map((column) => (
                    <th key={column} className="px-3 py-1.5 text-left font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      "border-t border-line",
                      !row.shipped && "opacity-45",
                      row.falseDrop && "bg-warning-soft/50",
                    )}
                  >
                    {row.tuple.map((value, valueIndex) => (
                      <td
                        key={valueIndex}
                        className={cn("px-3 py-1 font-mono", valueIndex === 0 ? "text-accent" : "text-muted")}
                      >
                        {value}
                      </td>
                    ))}
                    <td className="px-3 py-1 text-xs">
                      {row.falseDrop ? (
                        <span className="text-warning">false drop</span>
                      ) : row.shipped ? (
                        <span className="text-positive">yes</span>
                      ) : (
                        <span className="text-faint">filtered out</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      </div>

      {strategy === "bloom" ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">
            Bit vector built from π_C(R) = {"{"}
            {analysis.joinKeys.join(", ")}
            {"}"}
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.filter.map((bit, bitIndex) => (
              <span
                key={bitIndex}
                className={cn(
                  "grid size-8 place-items-center rounded-md border font-mono text-xs",
                  bit
                    ? "border-brand/40 bg-brand text-brand-ink"
                    : "border-line bg-sunken text-faint",
                )}
              >
                {bit ? 1 : 0}
              </span>
            ))}
          </div>
        </div>
      ) : strategy === "semijoin" ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">
            π_C(R) shipped to site S — {analysis.joinKeys.length} values
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.joinKeys.map((key) => (
              <span
                key={key}
                className="rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 font-mono text-xs text-brand-strong"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Sent to S"
          value={strategy === "bloom" ? `${analysis.bitsOut} bits` : `${analysis.valuesOut} values`}
          tone="brand"
        />
        <Stat label="Sent back" value={`${analysis.valuesBack} values`} hint={`${analysis.valuesBack / 3} tuples`} />
        <Stat
          label="False drops"
          value={String(analysis.falseDrops)}
          hint="extra tuples, never lost ones"
          tone={analysis.falseDrops > 0 ? "warning" : "positive"}
        />
        <Stat
          label="Versus shipping S"
          value={`${Math.round((analysis.valuesBack / naiveCost) * 100)}%`}
          hint={`naive costs ${naiveCost} values`}
          tone="positive"
        />
      </div>

      <figure className="grid gap-1.5">
        <figcaption className="font-mono text-xs font-semibold text-positive">
          R ⋈ S computed at site R — {analysis.result.length} tuples, {analysis.result.length * 5} attribute values
        </figcaption>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-sunken">
                {["A", "B", "C", "D", "E"].map((column) => (
                  <th key={column} className="px-3 py-1.5 text-left font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.result.map((tuple, rowIndex) => (
                <tr key={rowIndex} className="border-t border-line">
                  {tuple.map((value, valueIndex) => (
                    <td key={valueIndex} className="px-3 py-1 font-mono text-muted">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>

      <p className="text-sm text-muted">
        The result never changes — only the traffic does. Shipping S costs 21 attribute values; the
        semi-join costs 4 out and 6 back; the 6-bit Bloom filter costs 6 bits out and 12 values back,
        two tuples of which are false drops that the final join throws away.
      </p>
    </div>
  );
}
