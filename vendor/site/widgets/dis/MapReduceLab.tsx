"use client";

import { useState } from "react";
import { cn } from "@site/lib/cn";

type Pair = [string, string];

interface Job {
  id: string;
  label: string;
  input: string;
  inputHint: string;
  map: (record: string) => Pair[];
  reduce: (key: string, values: string[]) => Pair[];
  combinable?: boolean;
}

const words = (text: string) => text.toLowerCase().match(/[a-z']+/g) ?? [];

const lengthClass = (word: string) =>
  word.length >= 10 ? "yellow (10+)" : word.length >= 5 ? "red (5–9)" : word.length >= 2 ? "blue (2–4)" : "pink (1)";

const JOBS: Job[] = [
  {
    id: "word-count",
    label: "Word count",
    input: "doc1: the people and the government\ndoc2: we the people\ndoc3: government of the people by the people",
    inputHint: "One document per line: name: contents",
    map: (record) => words(record.split(":").slice(1).join(":")).map((word) => [word, "1"]),
    reduce: (key, values) => [[key, String(values.reduce((sum, value) => sum + Number(value), 0))]],
    combinable: true,
  },
  {
    id: "histogram",
    label: "Word-length histogram",
    input: "chunk1: a constitution establishes the government and protects the liberty of the people\nchunk2: we hold these truths to be self evident that all men are created equal",
    inputHint: "One chunk per line: name: text",
    map: (record) => words(record.split(":").slice(1).join(":")).map((word) => [lengthClass(word), "1"]),
    reduce: (key, values) => [[key, String(values.reduce((sum, value) => sum + Number(value), 0))]],
    combinable: true,
  },
  {
    id: "inverted-index",
    label: "Inverted index",
    input: "tweet1: I love pancakes for breakfast\ntweet2: I dislike pancakes\ntweet3: What should I eat for breakfast?\ntweet4: I love to eat",
    inputHint: "One tweet per line: id: text",
    map: (record) => {
      const [id, ...rest] = record.split(":");
      return [...new Set(words(rest.join(":")))].map((word) => [word, id.trim()]);
    },
    reduce: (key, values) => [[key, [...new Set(values)].sort().join(", ")]],
  },
  {
    id: "join",
    label: "Join Employee ⋈ Department",
    input: "Employee, Sue, 999999999\nEmployee, Tony, 777777777\nDepartment, 999999999, Accounts\nDepartment, 777777777, Sales\nDepartment, 777777777, Marketing",
    inputHint: "Tagged tuples: Employee, name, SSN or Department, SSN, name",
    map: (record) => {
      const [relation, first, second] = record.split(",").map((part) => part.trim());
      return [[relation === "Employee" ? second : first, record.trim()]];
    },
    reduce: (key, values) => {
      const employees = values.filter((value) => value.startsWith("Employee"));
      const departments = values.filter((value) => value.startsWith("Department"));
      return employees.flatMap((employee) =>
        departments.map((department): Pair => [key, `${employee.split(",")[1].trim()}, ${key}, ${department.split(",")[2].trim()}`]),
      );
    },
  },
  {
    id: "friends",
    label: "Count friends",
    input: "Jim, Sue\nSue, Jim\nLin, Joe\nJoe, Lin\nJim, Kai\nKai, Jim\nJim, Lin\nLin, Jim",
    inputHint: "One friendship direction per line: person, friend",
    map: (record) => [[record.split(",")[0].trim(), "1"]],
    reduce: (key, values) => [[key, String(values.reduce((sum, value) => sum + Number(value), 0))]],
    combinable: true,
  },
  {
    id: "matrix",
    label: "Matrix multiply (one step)",
    input: "A,1,1,1\nA,1,2,2\nA,2,1,-1\nA,2,2,3\nA,2,3,2\nB,1,1,4\nB,2,2,5\nB,3,1,6\nB,3,2,7",
    inputHint: "Non-zero entries: matrix, row, column, value — here m = 2, n = 3, p = 2",
    map: (record) => {
      const [tag, row, column, value] = record.split(",").map((part) => part.trim());
      return tag === "A"
        ? [1, 2].map((k): Pair => [`(${row},${k})`, `A,${column},${value}`])
        : [1, 2].map((i): Pair => [`(${i},${column})`, `B,${row},${value}`]);
    },
    reduce: (key, values) => {
      const left = new Map<string, number>();
      const right = new Map<string, number>();
      for (const value of values) {
        const [tag, inner, number] = value.split(",");
        (tag === "A" ? left : right).set(inner, Number(number));
      }
      let total = 0;
      for (const [inner, number] of left) total += number * (right.get(inner) ?? 0);
      return [[key, String(total)]];
    },
  },
];

function PairList({ pairs, highlight }: { pairs: Pair[]; highlight?: string | null }) {
  return (
    <ul className="grid gap-0.5 font-mono text-xs">
      {pairs.map(([key, value], index) => (
        <li key={`${key}-${value}-${index}`} className={cn("rounded px-1.5 py-0.5", highlight === key ? "bg-brand-soft text-brand-strong" : "text-muted")}>
          ({key}, {value})
        </li>
      ))}
    </ul>
  );
}

export function MapReduceLab() {
  const [jobId, setJobId] = useState(JOBS[0].id);
  const job = JOBS.find((candidate) => candidate.id === jobId)!;
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [useCombiner, setUseCombiner] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const input = inputs[job.id] ?? job.input;
  const records = input.split("\n").filter((line) => line.trim().length > 0);
  const mapOutputs = records.map((record) => {
    const pairs = job.map(record);
    if (!useCombiner || !job.combinable) return pairs;
    const local = new Map<string, string[]>();
    for (const [key, value] of pairs) local.set(key, [...(local.get(key) ?? []), value]);
    return [...local].flatMap(([key, values]) => job.reduce(key, values));
  });
  const groups = new Map<string, string[]>();
  for (const [key, value] of mapOutputs.flat()) groups.set(key, [...(groups.get(key) ?? []), value]);
  const sortedKeys = [...groups.keys()].sort();
  const output = sortedKeys.flatMap((key) => job.reduce(key, groups.get(key)!));
  const shuffled = mapOutputs.flat().length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-1.5">
        {JOBS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => {
              setJobId(candidate.id);
              setHighlight(null);
            }}
            className={cn(
              "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
              jobId === candidate.id ? "border-brand/50 bg-brand-soft text-brand-strong" : "border-line bg-surface text-muted hover:border-brand/40",
            )}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-ink">Input — {job.inputHint}</span>
        <textarea
          value={input}
          rows={Math.min(records.length + 1, 9)}
          onChange={(event) => setInputs((previous) => ({ ...previous, [job.id]: event.target.value }))}
          className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-brand/60"
        />
      </label>

      {job.combinable ? (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={useCombiner} onChange={(event) => setUseCombiner(event.target.checked)} className="accent-brand" />
          Run the reduce function as a combiner inside each map task
        </label>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="grid content-start gap-2 rounded-xl border border-line bg-sunken p-3">
          <h4 className="text-xs font-semibold tracking-wide text-faint uppercase">1 · Map — one task per record</h4>
          {mapOutputs.map((pairs, index) => (
            <div key={index} className="grid gap-1 border-t border-line pt-1.5 first-of-type:border-0 first-of-type:pt-0">
              <span className="truncate text-xs text-ink">{records[index]}</span>
              <PairList pairs={pairs} highlight={highlight} />
            </div>
          ))}
        </section>
        <section className="grid content-start gap-2 rounded-xl border border-line bg-sunken p-3">
          <h4 className="text-xs font-semibold tracking-wide text-faint uppercase">2 · Shuffle — group by key ({shuffled} pairs moved)</h4>
          <ul className="grid gap-1">
            {sortedKeys.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setHighlight(highlight === key ? null : key)}
                  className={cn("w-full rounded px-1.5 py-0.5 text-left font-mono text-xs transition-colors", highlight === key ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-surface")}
                >
                  {key} → [{groups.get(key)!.join(" | ")}]
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="grid content-start gap-2 rounded-xl border border-line bg-sunken p-3">
          <h4 className="text-xs font-semibold tracking-wide text-faint uppercase">3 · Reduce — one call per key</h4>
          <PairList pairs={output} highlight={highlight} />
        </section>
      </div>

      <p className="text-sm text-muted">
        Edit the input and every stage recomputes. Click a key in the shuffle column to follow it from the map outputs to its
        reducer. Turning on the combiner shrinks the number of pairs that cross the network without changing the result.
      </p>
    </div>
  );
}
