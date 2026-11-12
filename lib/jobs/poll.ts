/** A step older than this is considered abandoned (the request that ran it was stopped). */
export const STALE_AFTER_MS = 345_000; // CLAIM_TTL_SECONDS (330 s) + 15 s

/**
 * Whether the open job page should POST /advance. `idle` jobs always advance; a `working` job
 * advances again only once its last save is old enough that the original request must be gone.
 */
export function shouldAdvance(job: { status: string; updatedAt: string }, nowMs: number): boolean {
  if (job.status === "idle") return true;
  if (job.status !== "working") return false;
  const updatedAt = Date.parse(job.updatedAt);
  if (!Number.isFinite(updatedAt)) return false;
  return nowMs - updatedAt > STALE_AFTER_MS;
}
