"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const ORDER = 2;
const MAX_ENTRIES = 2 * ORDER;
const RANGE_LOW = 15;
const RANGE_HIGH = 30;

type TreeNode =
  | { kind: "leaf"; keys: number[] }
  | { kind: "inner"; keys: number[]; children: TreeNode[] };

interface Split {
  separator: number;
  right: TreeNode;
}

const leaf = (keys: number[]): TreeNode => ({ kind: "leaf", keys });
const inner = (keys: number[], children: TreeNode[]): TreeNode => ({ kind: "inner", keys, children });

const BOOK_TREE = inner(
  [13, 17, 24, 30],
  [leaf([2, 3, 5, 7]), leaf([14, 16]), leaf([19, 20, 22]), leaf([24, 27, 29]), leaf([33, 34, 38, 39])],
);

function childIndex(keys: number[], key: number) {
  let index = 0;
  while (index < keys.length && key >= keys[index]) index += 1;
  return index;
}

function formatKeys(keys: number[], star = false) {
  return `[${keys.map((key) => `${key}${star ? "*" : ""}`).join(" ")}]`;
}

function describeInterval(keys: number[], index: number) {
  if (index === 0) return `< ${keys[0]}`;
  if (index === keys.length) return `≥ ${keys[keys.length - 1]}`;
  return `${keys[index - 1]} ≤ k < ${keys[index]}`;
}

function insertInto(node: TreeNode, key: number, log: string[]): { node: TreeNode; split?: Split } {
  if (node.kind === "leaf") {
    if (node.keys.includes(key)) throw new Error(`${key}* is already in the tree. This lab keeps search keys unique.`);
    const keys = [...node.keys, key].sort((a, b) => a - b);
    if (keys.length <= MAX_ENTRIES) {
      log.push(`The leaf has room: it becomes ${formatKeys(keys, true)}.`);
      return { node: leaf(keys) };
    }
    const left = keys.slice(0, ORDER);
    const right = keys.slice(ORDER);
    log.push(
      `The leaf would hold ${keys.length} entries, more than 2d = ${MAX_ENTRIES}: split it into ${formatKeys(left, true)} and ${formatKeys(right, true)}. The key ${right[0]} is copied up — ${right[0]}* stays in the leaf, because every data entry must live at the leaf level.`,
    );
    return { node: leaf(left), split: { separator: right[0], right: leaf(right) } };
  }

  const index = childIndex(node.keys, key);
  const result = insertInto(node.children[index], key, log);
  const children = [...node.children];
  children[index] = result.node;
  if (!result.split) return { node: inner(node.keys, children) };

  const keys = [...node.keys];
  keys.splice(index, 0, result.split.separator);
  children.splice(index + 1, 0, result.split.right);
  if (keys.length <= MAX_ENTRIES) {
    log.push(`The parent index node has room for the new entry: it becomes ${formatKeys(keys)}.`);
    return { node: inner(keys, children) };
  }

  const middle = keys[ORDER];
  const leftKeys = keys.slice(0, ORDER);
  const rightKeys = keys.slice(ORDER + 1);
  log.push(
    `The index node would hold ${keys.length} keys and ${children.length} pointers: split it into ${formatKeys(leftKeys)} and ${formatKeys(rightKeys)}. The middle key ${middle} is pushed up — it moves to the parent and no longer appears at this level.`,
  );
  return {
    node: inner(leftKeys, children.slice(0, ORDER + 1)),
    split: { separator: middle, right: inner(rightKeys, children.slice(ORDER + 1)) },
  };
}

function insertKey(root: TreeNode, key: number) {
  const log: string[] = [];
  const result = insertInto(root, key, log);
  if (!result.split) return { root: result.node, log };
  log.push(
    `The old root split, so a new root ${formatKeys([result.split.separator])} is created above the two halves. The tree grows by one level — at the top, never at the bottom, which keeps every leaf at the same depth.`,
  );
  return { root: inner([result.split.separator], [result.node, result.split.right]), log };
}

function searchPath(root: TreeNode, key: number) {
  const path: TreeNode[] = [root];
  let node = root;
  while (node.kind === "inner") {
    node = node.children[childIndex(node.keys, key)];
    path.push(node);
  }
  return path;
}

function levelsOf(root: TreeNode) {
  const levels: TreeNode[][] = [];
  let current: TreeNode[] = [root];
  while (current.length > 0) {
    levels.push(current);
    current = current.flatMap((node) => (node.kind === "inner" ? node.children : []));
  }
  return levels;
}

export function BPlusTreeLab() {
  const [root, setRoot] = useState(BOOK_TREE);
  const [input, setInput] = useState("8");
  const [highlighted, setHighlighted] = useState<TreeNode[]>([]);
  const [scanned, setScanned] = useState<TreeNode[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const levels = levelsOf(root);
  const leaves = levels[levels.length - 1];
  const entryCount = leaves.reduce((sum, node) => sum + node.keys.length, 0);

  const readKey = () => {
    const key = Number(input);
    if (!Number.isInteger(key) || key < 1 || key > 99) {
      setError("Enter a whole number between 1 and 99.");
      return null;
    }
    return key;
  };

  const insert = () => {
    const key = readKey();
    if (key === null) return;
    try {
      const path = searchPath(root, key);
      const outcome = insertKey(root, key);
      setRoot(outcome.root);
      setLog([`Search for ${key} from the root down to the leaf ${formatKeys(path[path.length - 1].keys, true)}.`, ...outcome.log]);
      setHighlighted(searchPath(outcome.root, key));
      setScanned([]);
      setError(null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  };

  const find = () => {
    const key = readKey();
    if (key === null) return;
    const path = searchPath(root, key);
    const target = path[path.length - 1];
    setHighlighted(path);
    setScanned([]);
    setError(null);
    setLog([
      ...path.slice(0, -1).map(
        (node, depth) =>
          `Level ${depth}: in ${formatKeys(node.keys)} follow pointer P${childIndex(node.keys, key)}, the subtree for keys ${describeInterval(node.keys, childIndex(node.keys, key))}.`,
      ),
      target.keys.includes(key)
        ? `The leaf ${formatKeys(target.keys, true)} contains ${key}* — found after reading ${path.length} pages.`
        : `The leaf ${formatKeys(target.keys, true)} does not contain ${key}*, so it is not in the tree. One root-to-leaf path is enough to be sure.`,
    ]);
  };

  const rangeScan = () => {
    const path = searchPath(root, RANGE_LOW);
    const startIndex = leaves.indexOf(path[path.length - 1]);
    const visited: TreeNode[] = [];
    const found: number[] = [];
    for (let index = startIndex; index < leaves.length; index += 1) {
      visited.push(leaves[index]);
      found.push(...leaves[index].keys.filter((key) => key > RANGE_LOW && key < RANGE_HIGH));
      if (leaves[index].keys.some((key) => key >= RANGE_HIGH)) break;
    }
    setHighlighted(path);
    setScanned(visited);
    setError(null);
    setLog([
      `Descend once, as for an equality search on ${RANGE_LOW}, to the leaf ${formatKeys(path[path.length - 1].keys, true)}.`,
      `Then follow the sibling pointers through ${visited.length} leaf page${visited.length === 1 ? "" : "s"} without going back up the tree, stopping at the first entry ≥ ${RANGE_HIGH}.`,
      `Result: ${found.map((key) => `${key}*`).join(" ") || "no entries"}.`,
    ]);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Search key</span>
          <input
            type="number"
            min={1}
            max={99}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") insert();
            }}
            className="w-24 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-sm outline-none transition-colors focus:border-brand/60"
          />
        </label>
        <button
          type="button"
          onClick={insert}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
        >
          Insert
        </button>
        <button
          type="button"
          onClick={find}
          className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-strong transition-colors hover:bg-brand-soft/70"
        >
          Find
        </button>
        <button
          type="button"
          onClick={rangeScan}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          All &gt; {RANGE_LOW}* and &lt; {RANGE_HIGH}*
        </button>
        <button
          type="button"
          onClick={() => {
            setRoot(BOOK_TREE);
            setHighlighted([]);
            setScanned([]);
            setLog([]);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>
      </div>

      <div className="grid gap-4 overflow-x-auto rounded-xl border border-line bg-sunken p-3 sm:p-4">
        {levels.map((level, depth) => (
          <div key={depth} className="flex min-w-max justify-center gap-2">
            {level.map((node, index) => {
              const onPath = highlighted.includes(node);
              const isScanned = scanned.includes(node);
              return (
                <div
                  key={index}
                  className={cn(
                    "flex rounded-lg border bg-surface",
                    onPath ? "border-brand ring-2 ring-brand/30" : isScanned ? "border-positive ring-2 ring-positive/30" : "border-line-strong",
                  )}
                >
                  {Array.from({ length: MAX_ENTRIES }, (_, slot) => {
                    const key = node.keys[slot];
                    return (
                      <span
                        key={slot}
                        className={cn(
                          "min-w-8 border-r border-line px-1.5 py-1 text-center font-mono text-xs last:border-r-0",
                          key === undefined ? "text-faint" : "text-ink",
                        )}
                      >
                        {key === undefined ? "" : node.kind === "leaf" ? `${key}*` : key}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
        <p className="text-center text-xs text-faint">
          Leaves are chained left to right (the sequence set) · order d = {ORDER}, so every node except the root holds {ORDER}–{MAX_ENTRIES} entries
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Height" value={String(levels.length - 1)} hint="edges from root to leaf" tone="brand" />
        <Stat label="Leaf pages" value={String(leaves.length)} />
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
          This is the textbook tree of order 2. Insert 8* to watch the leaf split copy 5 up, the full root split push 17
          up, and the tree grow a level. Use Find for an equality search and the range button for
          “all entries above 15* and below 30*”.
        </p>
      )}
    </div>
  );
}
