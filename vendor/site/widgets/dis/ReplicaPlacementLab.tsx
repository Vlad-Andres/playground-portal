"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Stat } from "@site/components/ui/Stat";
import { cn } from "@site/lib/cn";

const RACK_COUNT = 3;
const NODES_PER_RACK = 4;
const BLOCK_COUNT = 6;
const REPLICATION_FACTOR = 3;

const BLOCK_COLORS = ["bg-brand/25", "bg-positive/25", "bg-warning/25", "bg-info/25", "bg-accent/25", "bg-danger/25"];

interface DataNode {
  id: string;
  rack: number;
}

const DATA_NODES: DataNode[] = Array.from({ length: RACK_COUNT * NODES_PER_RACK }, (_, index) => ({
  id: `DN${index + 1}`,
  rack: Math.floor(index / NODES_PER_RACK),
}));

const nodeAt = (rack: number, slot: number) => DATA_NODES[rack * NODES_PER_RACK + (slot % NODES_PER_RACK)].id;

const initialPlacement = (): Record<number, string[]> =>
  Object.fromEntries(
    Array.from({ length: BLOCK_COUNT }, (_, block) => {
      const localRack = block % RACK_COUNT;
      const remoteRack = (localRack + 1) % RACK_COUNT;
      return [block, [nodeAt(localRack, block), nodeAt(localRack, block + 1), nodeAt(remoteRack, block + 2)]];
    }),
  );

const rackOf = (nodeId: string) => DATA_NODES.find((node) => node.id === nodeId)?.rack ?? 0;

export function ReplicaPlacementLab() {
  const [placement, setPlacement] = useState(initialPlacement);
  const [deadNodes, setDeadNodes] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<string[]>([]);

  const liveReplicas = (block: number) => placement[block].filter((nodeId) => !deadNodes.has(nodeId));

  const blockStates = useMemo(
    () =>
      Array.from({ length: BLOCK_COUNT }, (_, block) => {
        const live = placement[block].filter((nodeId) => !deadNodes.has(nodeId));
        return { block, live: live.length, racks: new Set(live.map(rackOf)).size };
      }),
    [placement, deadNodes],
  );

  const underReplicated = blockStates.filter((state) => state.live > 0 && state.live < REPLICATION_FACTOR).length;
  const lostBlocks = blockStates.filter((state) => state.live === 0).length;

  const failNodes = (nodeIds: string[]) => {
    const newlyDead = nodeIds.filter((nodeId) => !deadNodes.has(nodeId));
    if (newlyDead.length === 0) return;
    setDeadNodes((previous) => new Set([...previous, ...newlyDead]));
    setLog((previous) => [`${newlyDead.join(", ")} stopped sending Heartbeats → marked dead`, ...previous]);
  };

  const reReplicate = () => {
    const nextPlacement = { ...placement };
    const load = new Map(DATA_NODES.map((node) => [node.id, 0]));
    for (const nodeIds of Object.values(placement)) for (const nodeId of nodeIds) load.set(nodeId, (load.get(nodeId) ?? 0) + 1);
    const messages: string[] = [];

    for (let block = 0; block < BLOCK_COUNT; block++) {
      const live = liveReplicas(block);
      if (live.length === 0 || live.length === REPLICATION_FACTOR) continue;
      const replicas = [...live];
      while (replicas.length < REPLICATION_FACTOR) {
        const usedRacks = new Set(replicas.map(rackOf));
        const candidates = DATA_NODES.filter((node) => !deadNodes.has(node.id) && !replicas.includes(node.id));
        if (candidates.length === 0) break;
        const preferred = usedRacks.size === 1 ? candidates.filter((node) => !usedRacks.has(node.rack)) : candidates;
        const pool = preferred.length > 0 ? preferred : candidates;
        const target = pool.reduce((best, node) => ((load.get(node.id) ?? 0) < (load.get(best.id) ?? 0) ? node : best));
        load.set(target.id, (load.get(target.id) ?? 0) + 1);
        messages.push(`B${block + 1}: copy ${replicas[0]} → ${target.id} (rack ${target.rack + 1})`);
        replicas.push(target.id);
      }
      nextPlacement[block] = replicas;
    }

    setPlacement(nextPlacement);
    setLog((previous) => [
      messages.length > 0 ? `NameNode re-replicates: ${messages.join("; ")}` : "NameNode: no block below its replication factor that can be repaired",
      ...previous,
    ]);
  };

  const reset = () => {
    setPlacement(initialPlacement());
    setDeadNodes(new Set());
    setLog([]);
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: RACK_COUNT }, (_, rack) => (
          <div key={rack} className="grid gap-2 rounded-xl border border-line bg-sunken p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium tracking-wide text-faint uppercase">Rack {rack + 1}</span>
              <button
                type="button"
                onClick={() => failNodes(DATA_NODES.filter((node) => node.rack === rack).map((node) => node.id))}
                className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs transition-colors hover:border-danger/40 hover:text-danger"
              >
                Fail rack
              </button>
            </div>
            {DATA_NODES.filter((node) => node.rack === rack).map((node) => {
              const dead = deadNodes.has(node.id);
              const blocksOnNode = Object.entries(placement)
                .filter(([, nodeIds]) => nodeIds.includes(node.id))
                .map(([block]) => Number(block));
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => failNodes([node.id])}
                  disabled={dead}
                  title={dead ? `${node.id} is dead` : `Fail ${node.id}`}
                  className={cn(
                    "flex min-h-9 items-center gap-2 rounded-lg border px-2 py-1 text-left transition-colors",
                    dead ? "border-danger/40 bg-danger/10 opacity-60" : "border-line bg-surface hover:border-danger/40",
                  )}
                >
                  <span className={cn("w-9 shrink-0 font-mono text-xs", dead ? "text-danger line-through" : "text-ink")}>{node.id}</span>
                  <span className="flex flex-wrap gap-1">
                    {blocksOnNode.map((block) => (
                      <span key={block} className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] text-ink", BLOCK_COLORS[block])}>
                        B{block + 1}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reReplicate}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
        >
          NameNode: re-replicate
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/40 hover:text-brand"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Dead DataNodes" value={String(deadNodes.size)} />
        <Stat label="Under-replicated" value={String(underReplicated)} hint={`blocks with < ${REPLICATION_FACTOR} live replicas`} tone={underReplicated > 0 ? "warning" : "neutral"} />
        <Stat label="Lost blocks" value={String(lostBlocks)} hint="no live replica left" tone={lostBlocks > 0 ? "warning" : "positive"} />
        <Stat label="Blocks on 2+ racks" value={`${blockStates.filter((state) => state.racks >= 2).length}/${BLOCK_COUNT}`} tone="brand" />
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
          A file of six blocks, replication factor 3: each block has two replicas on two nodes of one rack and the third on
          another rack. Click a DataNode to fail it, or fail a whole rack — no block is lost. Then let the NameNode
          re-replicate the under-replicated blocks from their surviving copies.
        </p>
      )}
    </div>
  );
}
