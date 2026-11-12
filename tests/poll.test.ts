import { describe, expect, it } from "vitest";
import { shouldAdvance, STALE_AFTER_MS } from "@/lib/jobs/poll";

const job = (status: string, updatedAt: string) => ({ status, updatedAt });
const now = 1_000_000_000;

describe("shouldAdvance", () => {
  it("advances an idle job", () => {
    expect(shouldAdvance(job("idle", new Date(0).toISOString()), now)).toBe(true);
  });

  it("waits for a working job that is only 10 s old", () => {
    expect(shouldAdvance(job("working", new Date(now - 10_000).toISOString()), now)).toBe(false);
  });

  it("resumes a working job that is 346 s old", () => {
    expect(shouldAdvance(job("working", new Date(now - 346_000).toISOString()), now)).toBe(true);
  });

  it("stays inside the stale threshold", () => {
    expect(shouldAdvance(job("working", new Date(now - STALE_AFTER_MS).toISOString()), now)).toBe(false);
  });

  it("never advances awaiting-review, done or failed jobs", () => {
    for (const status of ["awaiting-review", "done", "failed"]) {
      expect(shouldAdvance(job(status, new Date(now - 1_000_000).toISOString()), now)).toBe(false);
    }
  });

  it("treats an unparseable date as not stale", () => {
    expect(shouldAdvance(job("working", "not-a-date"), now)).toBe(false);
  });
});
