"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const LINES = ["coffee panda", "happy panda", "happiest panda party"];

interface Stage {
  id: string;
  code: string;
  kind: "source" | "transformation";
  describe: string;
}

const STAGES: Stage[] = [
  { id: "lines", code: 'lines = sc.parallelize(["coffee panda", "happy panda", "happiest panda party"])', kind: "source", describe: "3 lines" },
  { id: "words", code: "words = lines.flatMap(lambda line: line.split())", kind: "transformation", describe: "flatMap: 7 words" },
  { id: "pairs", code: "pairs = words.map(lambda w: (w, 1))", kind: "transformation", describe: "map: 7 (word, 1) pairs" },
];

const ACTIONS = [
  { id: "count", code: "pairs.count()", run: (pairs: [string, number][]) => String(pairs.length) },
  { id: "take", code: "pairs.take(2)", run: (pairs: [string, number][]) => JSON.stringify(pairs.slice(0, 2)) },
  {
    id: "reduce",
    code: "pairs.reduceByKey(lambda a, b: a + b).collect()",
    run: (pairs: [string, number][]) => {
      const counts = new Map<string, number>();
      for (const [word, one] of pairs) counts.set(word, (counts.get(word) ?? 0) + one);
      return JSON.stringify([...counts]);
    },
  },
];

const computePairs = (): [string, number][] => LINES.flatMap((line) => line.split(" ")).map((word): [string, number] => [word, 1]);

export function LazyEvaluationLab() {
  const [cached, setCached] = useState(false);
  const [materialised, setMaterialised] = useState(false);
  const [computations, setComputations] = useState<Record<string, number>>({ lines: 0, words: 0, pairs: 0 });
  const [log, setLog] = useState<string[]>([]);

  const runAction = (action: (typeof ACTIONS)[number]) => {
    const fromCache = cached && materialised;
    if (!fromCache) {
      setComputations((previous) => ({ lines: previous.lines + 1, words: previous.words + 1, pairs: previous.pairs + 1 }));
      if (cached) setMaterialised(true);
    }
    const result = action.run(computePairs());
    setLog((previous) => [
      `${action.code} → ${result}  ${fromCache ? "(read pairs from the cache)" : "(the DAG was computed starting from lines)"}`,
      ...previous,
    ]);
  };

  const reset = () => {
    setMaterialised(false);
    setComputations({ lines: 0, words: 0, pairs: 0 });
    setLog([]);
  };

  const totalWork = Object.values(computations).reduce((sum, value) => sum + value, 0);

  return (
    <div className="grid gap-5">
      <ol className="grid gap-2">
        {STAGES.map((stage) => (
          <li key={stage.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-sunken px-3 py-2">
            <code className="font-mono text-xs text-ink">{stage.code}</code>
            <span className="flex items-center gap-2 text-xs text-faint">
              <span className="rounded-md border border-line bg-surface px-1.5 py-0.5">{stage.kind}</span>
              {stage.describe} · computed {computations[stage.id]}×
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs">
          <input
            id="cache-toggle"
            type="checkbox"
            checked={cached}
            onChange={(event) => {
              setCached(event.target.checked);
              setMaterialised(false);
            }}
            className="accent-brand"
          />
          <label htmlFor="cache-toggle" className="font-mono text-ink">
            pairs.cache()
          </label>
          <span className="text-faint">— keep pairs in memory after it is first computed</span>
        </li>
      </ol>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => runAction(action)}
            className="rounded-lg bg-brand px-3 py-1.5 font-mono text-xs font-medium text-brand-ink transition-opacity hover:opacity-90"
          >
            {action.code}
          </button>
        ))}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Actions run" value={String(log.length)} />
        <Stat label="RDD computations" value={String(totalWork)} hint="each action recomputes the chain unless cached" tone="brand" />
        <Stat label="pairs in cache" value={cached && materialised ? "yes" : "no"} tone={cached && materialised ? "positive" : "neutral"} />
      </div>

      {log.length > 0 ? (
        <ol className="grid gap-1 rounded-xl border border-line bg-sunken p-3 font-mono text-xs text-muted">
          {log.map((line, index) => (
            <li key={`${index}-${line}`} className={cn(index === 0 && "text-ink")}>
              {line}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">
          Defining lines, words and pairs computed nothing — they are transformations. Run an action: only then does Spark
          build the DAG and compute it from the source. Run a second action and the whole chain is computed again, unless
          pairs is cached.
        </p>
      )}
    </div>
  );
}
