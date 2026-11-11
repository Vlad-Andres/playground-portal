export interface LaidOutNode<T> {
  node: T;
  x: number;
  y: number;
  rank: number;
}

/**
 * Left-to-right layered layout: a node's rank is the longest path to it from a node without
 * incoming edges (cycles are cut by visiting each edge at most once per pass).
 */
export function layeredLayout<T extends { id: string }>(
  nodes: T[],
  edges: { from: string; to: string }[],
  box: { width: number; height: number; gapX: number; gapY: number },
): { placed: LaidOutNode<T>[]; width: number; height: number } {
  const rank = new Map(nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const edge of edges) {
      const from = rank.get(edge.from);
      const to = rank.get(edge.to);
      if (from === undefined || to === undefined || edge.from === edge.to) continue;
      if (to < from + 1 && from + 1 < nodes.length) {
        rank.set(edge.to, from + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const columns = new Map<number, T[]>();
  for (const node of nodes) columns.set(rank.get(node.id) ?? 0, [...(columns.get(rank.get(node.id) ?? 0) ?? []), node]);
  const tallest = Math.max(...[...columns.values()].map((column) => column.length));
  const height = tallest * box.height + (tallest - 1) * box.gapY;
  const placed: LaidOutNode<T>[] = [];
  for (const [column, members] of [...columns].sort((a, b) => a[0] - b[0])) {
    const columnHeight = members.length * box.height + (members.length - 1) * box.gapY;
    members.forEach((node, index) => {
      placed.push({
        node,
        rank: column,
        x: column * (box.width + box.gapX),
        y: (height - columnHeight) / 2 + index * (box.height + box.gapY),
      });
    });
  }
  const maxRank = Math.max(...placed.map((item) => item.rank));
  return { placed, width: (maxRank + 1) * box.width + maxRank * box.gapX, height };
}

/** Sample y = f(x) at `count` points; non-finite values become null (gaps). */
export function sampleFunction(f: (x: number) => number, xMin: number, xMax: number, count = 200): { x: number; y: number | null }[] {
  return Array.from({ length: count }, (_, index) => {
    const x = xMin + ((xMax - xMin) * index) / (count - 1);
    const y = f(x);
    return { x, y: Number.isFinite(y) ? y : null };
  });
}
