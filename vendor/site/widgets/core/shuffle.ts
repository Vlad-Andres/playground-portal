function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic shuffle (same seed → same order, so server and browser agree). Never returns the input order. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  const next = random(hash(seed));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  if (result.length > 1 && result.every((item, index) => item === items[index])) result.push(result.shift() as T);
  return result;
}
