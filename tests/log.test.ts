import { afterEach, describe, expect, it, vi } from "vitest";
import { cannedModel, type Brief, type Material } from "@core/generate/index";
import { advance, createJob } from "@/lib/jobs/steps";
import { jobKey } from "@/lib/jobs/state";
import { memoryStore } from "@/lib/jobs/store";
import { logEvent } from "@/lib/log";

const MATERIAL_TEXT = "Energy is conserved in every closed system. ";
const brief: Brief = { language: "en", level: "university", depth: "cram", examMode: false, quizzes: true, widgets: true, context: "" };
const materials: Material[] = [{ name: "a.txt", pages: [{ n: 1, text: MATERIAL_TEXT.repeat(30) }] }];

afterEach(() => {
  vi.restoreAllMocks();
});

function lines(log: ReturnType<typeof vi.spyOn>): string[] {
  return log.mock.calls.map((call) => String(call[0]));
}

describe("logEvent", () => {
  it("writes exactly one JSON line with ts and the event", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logEvent("job.step", { jobId: "abc", ok: true });

    expect(log).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0][0]);
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed).toMatchObject({ event: "job.step", jobId: "abc", ok: true });
    expect(typeof parsed.ts).toBe("string");
    expect(Number.isNaN(Date.parse(String(parsed.ts)))).toBe(false);
  });

  it("leaves undefined fields out", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logEvent("course.published", { key: "demo-12345678", jobId: "x", lectures: undefined });
    const parsed = JSON.parse(String(log.mock.calls[0][0])) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["ts", "event", "key", "jobId"]);
  });
});

describe("job logs", () => {
  it("log every step without the material text or the owner token", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const store = memoryStore();
    const deps = { store, model: cannedModel(), now: () => new Date("2026-11-12T09:00:00Z") };
    const { id } = await createJob(store, { brief, materials }, deps.now());

    let state = await advance(id, deps);
    await store.write(jobKey(id, "state.json"), JSON.stringify({ ...state, step: "lecture:1", status: "idle" }));
    for (let i = 0; i < 20 && state.status !== "done" && state.status !== "failed"; i += 1) state = await advance(id, deps);
    expect(state.status).toBe("done");

    const token = /^\/manage\/([A-Za-z0-9_-]{32})$/.exec(state.manageUrl ?? "")?.[1];
    expect(token).toBeTruthy();

    const events = lines(log).map((line) => JSON.parse(line) as { event: string });
    expect(events.filter((entry) => entry.event === "job.step").length).toBeGreaterThan(2);
    expect(events.some((entry) => entry.event === "course.published")).toBe(true);
    for (const line of lines(log)) {
      expect(line).not.toContain("Energy is conserved");
      expect(line).not.toContain(token);
    }
  });

  it("logs job.failed when a job gives up", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const store = memoryStore();
    const deps = { store, model: cannedModel(), now: () => new Date("2026-11-12T09:00:00Z") };
    const { id } = await createJob(store, { brief, materials }, deps.now());
    const state = JSON.parse((await store.read(jobKey(id, "state.json"))) ?? "{}");
    await store.write(jobKey(id, "state.json"), JSON.stringify({ ...state, usage: { inputTokens: 600_000, outputTokens: 0, calls: 99 } }));

    expect((await advance(id, deps)).status).toBe("failed");
    const failed = lines(log)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((entry) => entry.event === "job.failed");
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ jobId: id, step: "design" });
    expect(typeof failed[0].code).toBe("string");
  });
});
