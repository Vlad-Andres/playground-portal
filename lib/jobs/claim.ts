import { jobKey, type Step } from "./state";
import type { Store } from "./store";

/** A claim older than this is considered abandoned (the function was stopped). */
export const CLAIM_TTL_SECONDS = 330;

export function claimKey(id: string, step: Step, attempt: number): string {
  return jobKey(id, `claims/${step.replace(":", "-")}-${attempt}.json`);
}

/** Atomically claim one attempt at one step. False when someone already holds that claim. */
export async function claimStep(store: Store, id: string, step: Step, attempt: number, now: Date): Promise<boolean> {
  return store.create(claimKey(id, step, attempt), JSON.stringify({ at: now.toISOString() }));
}

export async function claimAge(store: Store, id: string, step: Step, attempt: number, now: Date): Promise<number | null> {
  const body = await store.read(claimKey(id, step, attempt));
  if (!body) return null;
  try {
    const at = Date.parse((JSON.parse(body) as { at: string }).at);
    return Number.isFinite(at) ? (now.getTime() - at) / 1000 : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
