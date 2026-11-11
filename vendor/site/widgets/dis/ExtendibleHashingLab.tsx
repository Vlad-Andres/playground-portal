"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const BUCKET_CAPACITY = 4;
const MAX_GLOBAL_DEPTH = 5;
const BOOK_SEQUENCE = [13, 20, 9];

const BUCKET_TONES = [
  "border-brand/40 bg-brand-soft/60",
  "border-positive/40 bg-positive-soft/60",
  "border-warning/40 bg-warning-soft/60",
  "border-info/40 bg-info-soft/60",
  "border-danger/35 bg-danger-soft/50",
  "border-accent/40 bg-accent-soft/60",
];

interface Bucket {
  name: string;
  localDepth: number;
  keys: number[];
  tone: number;
}

interface HashFile {
  globalDepth: number;
  directory: string[];
  buckets: Bucket[];
}

interface InsertOutcome {
  file: HashFile;
  log: string[];
  touched: string[];
}

const INITIAL_FILE: HashFile = {
  globalDepth: 2,
  directory: ["A", "B", "C", "D"],
  buckets: [
    { name: "A", localDepth: 2, keys: [4, 12, 32, 16], tone: 0 },
    { name: "B", localDepth: 2, keys: [1, 5, 21], tone: 1 },
    { name: "C", localDepth: 2, keys: [10], tone: 2 },
    { name: "D", localDepth: 2, keys: [15, 7, 19], tone: 3 },
  ],
};

function binary(value: number, width: number) {
  return value.toString(2).padStart(width, "0");
}

function lastBits(key: number, depth: number) {
  return key & ((1 << depth) - 1);
}

function splitImageName(buckets: Bucket[], name: string) {
  const base = name.replace(/\d+$/, "");
  const siblings = buckets.filter((bucket) => bucket.name.replace(/\d+$/, "") === base).length;
  return `${base}${siblings + 1}`;
}

function insertKey(file: HashFile, key: number): InsertOutcome {
  const log: string[] = [];
  const touched = new Set<string>();
  let globalDepth = file.globalDepth;
  let directory = [...file.directory];
  const buckets = file.buckets.map((bucket) => ({ ...bucket, keys: [...bucket.keys] }));

  if (buckets.some((bucket) => bucket.keys.includes(key))) {
    throw new Error(`${key}* is already in the file. This lab keeps keys unique; real collisions need overflow pages.`);
  }

  for (;;) {
    const slot = lastBits(key, globalDepth);
    const bucket = buckets.find((candidate) => candidate.name === directory[slot])!;
    touched.add(bucket.name);

    if (bucket.keys.length < BUCKET_CAPACITY) {
      bucket.keys.push(key);
      log.push(
        `h(${key}) = ${binary(key, globalDepth)}: the last ${globalDepth} bits are ${binary(slot, globalDepth)}, so the entry goes to bucket ${bucket.name}, which has room.`,
      );
      return { file: { globalDepth, directory, buckets }, log, touched: [...touched] };
    }

    log.push(
      `h(${key}) = ${binary(key, globalDepth)} leads to bucket ${bucket.name} via directory entry ${binary(slot, globalDepth)}, but ${bucket.name} already holds ${BUCKET_CAPACITY} entries — it must split.`,
    );

    if (bucket.localDepth === globalDepth) {
      if (globalDepth === MAX_GLOBAL_DEPTH) {
        throw new Error(
          `Splitting ${bucket.name} would need more than ${MAX_GLOBAL_DEPTH} bits. With keys this alike, a real system falls back to an overflow page.`,
        );
      }
      directory = [...directory, ...directory];
      globalDepth += 1;
      log.push(
        `Its local depth equals the global depth (${bucket.localDepth}), so the directory doubles to ${directory.length} entries by copying itself, and the global depth becomes ${globalDepth}.`,
      );
    } else {
      log.push(
        `Its local depth ${bucket.localDepth} is below the global depth ${globalDepth}: ${2 ** (globalDepth - bucket.localDepth)} directory entries already point to ${bucket.name}, so it splits without doubling the directory.`,
      );
    }

    const splitBit = 1 << bucket.localDepth;
    const image: Bucket = {
      name: splitImageName(buckets, bucket.name),
      localDepth: bucket.localDepth + 1,
      keys: bucket.keys.filter((entry) => (entry & splitBit) !== 0),
      tone: buckets.length % BUCKET_TONES.length,
    };
    bucket.keys = bucket.keys.filter((entry) => (entry & splitBit) === 0);
    bucket.localDepth += 1;
    buckets.push(image);
    touched.add(image.name);
    directory = directory.map((name, index) =>
      name === bucket.name && (index & splitBit) !== 0 ? image.name : name,
    );

    log.push(
      `Redistribute on the last ${bucket.localDepth} bits: ${bucket.name} keeps ${bucket.keys.map((entry) => `${entry}*`).join(" ") || "nothing"}, its split image ${image.name} takes ${image.keys.map((entry) => `${entry}*`).join(" ") || "nothing"}. Both now have local depth ${bucket.localDepth}.`,
    );
  }
}

export function ExtendibleHashingLab() {
  const [file, setFile] = useState(INITIAL_FILE);
  const [input, setInput] = useState("13");
  const [log, setLog] = useState<string[]>([]);
  const [touched, setTouched] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const entryCount = file.buckets.reduce((sum, bucket) => sum + bucket.keys.length, 0);
  const nextBookKey = BOOK_SEQUENCE.find((key) => !file.buckets.some((bucket) => bucket.keys.includes(key)));

  const insert = (key: number) => {
    try {
      const outcome = insertKey(file, key);
      setFile(outcome.file);
      setLog(outcome.log);
      setTouched(outcome.touched);
      setError(null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  };

  const submit = () => {
    const key = Number(input);
    if (!Number.isInteger(key) || key < 0 || key > 999) {
      setError("Enter a whole number between 0 and 999.");
      return;
    }
    insert(key);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Data entry k*</span>
          <input
            type="number"
            min={0}
            max={999}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            className="w-28 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-sm outline-none transition-colors focus:border-brand/60"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
        >
          Insert
        </button>
        {nextBookKey !== undefined ? (
          <button
            type="button"
            onClick={() => insert(nextBookKey)}
            className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-strong transition-colors hover:bg-brand-soft/70"
          >
            Book step: insert {nextBookKey}*
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setFile(INITIAL_FILE);
            setLog([]);
            setTouched([]);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">
            Directory · global depth {file.globalDepth}
          </p>
          <ul className="grid gap-1">
            {file.directory.map((name, index) => {
              const bucket = file.buckets.find((candidate) => candidate.name === name)!;
              return (
                <li
                  key={index}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-2.5 py-1 font-mono text-xs",
                    BUCKET_TONES[bucket.tone],
                    touched.includes(name) ? "ring-2 ring-brand/40" : "",
                  )}
                >
                  <span className="text-ink">{binary(index, file.globalDepth)}</span>
                  <span className="text-muted">→ {name}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid content-start gap-2">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">
            Data pages · {BUCKET_CAPACITY} entries each
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {file.buckets.map((bucket) => (
              <li
                key={bucket.name}
                className={cn(
                  "grid gap-2 rounded-xl border px-3 py-2.5 transition-shadow",
                  BUCKET_TONES[bucket.tone],
                  touched.includes(bucket.name) ? "ring-2 ring-brand/40" : "",
                )}
              >
                <span className="flex items-center justify-between text-sm font-semibold text-ink">
                  Bucket {bucket.name}
                  <span className="font-mono text-xs font-normal text-muted">local depth {bucket.localDepth}</span>
                </span>
                <span className="grid grid-cols-4 gap-1">
                  {Array.from({ length: BUCKET_CAPACITY }, (_, slot) => {
                    const key = bucket.keys[slot];
                    return (
                      <span
                        key={slot}
                        className={cn(
                          "rounded-md border px-1 py-1 text-center font-mono text-xs",
                          key === undefined
                            ? "border-dashed border-line-strong text-faint"
                            : "border-line bg-surface text-ink",
                        )}
                        title={key === undefined ? "free slot" : `${key} = ${key.toString(2)}`}
                      >
                        {key === undefined ? "·" : `${key}*`}
                      </span>
                    );
                  })}
                </span>
                <span className="font-mono text-[11px] text-faint">
                  last {bucket.localDepth} bits:{" "}
                  {bucket.keys.map((key) => binary(lastBits(key, bucket.localDepth), bucket.localDepth)).join(" ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Global depth" value={String(file.globalDepth)} hint="bits used by the directory" tone="brand" />
        <Stat label="Directory" value={`${file.directory.length} entries`} hint={`2^${file.globalDepth} pointers`} />
        <Stat label="Buckets" value={String(file.buckets.length)} hint="one page each, no overflow" />
        <Stat label="Data entries" value={String(entryCount)} />
      </div>

      {error ? (
        <p className="animate-rise rounded-xl border border-warning/35 bg-warning-soft/50 px-4 py-3 text-sm text-ink">{error}</p>
      ) : log.length > 0 ? (
        <ol className="animate-rise grid list-decimal gap-1.5 rounded-xl border border-line bg-sunken py-3 pr-4 pl-9 text-sm text-muted marker:text-faint">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">
          The file starts as in the textbook: hash value = the key itself, four entries per page, last two bits pick the
          bucket. Follow the book steps — 13* fits into B, 20* splits A and doubles the directory, 9* splits B
          without doubling — then insert your own keys.
        </p>
      )}
    </div>
  );
}
