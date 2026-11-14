import { describe, expect, it, vi } from "vitest";
import { cannedModel, type Brief } from "@core/generate/index";
import { advanceHandler, createJobHandler, getJobHandler } from "@/lib/api/handlers";
import { generationEnabled } from "@/lib/guard";
import { memoryStore } from "@/lib/jobs/store";
import { codeJobsThisMonth, DEFAULT_SETTINGS, matchCode, newInviteCode, readSettings, settingsSchema, writeSettings, type Settings } from "@/lib/settings";

const CODE = "correct-horse-battery";
const env = { PORTAL_ENABLE_GENERATION: "true", PORTAL_ACCESS_CODE: CODE, PORTAL_DAILY_JOB_LIMIT: "10" } as unknown as NodeJS.ProcessEnv;
const brief: Brief = { language: "en", level: "school", depth: "cram", examMode: false, quizzes: true, widgets: true, context: "" };
const materials = [{ name: "a.txt", pages: [{ n: 1, text: "Plants make glucose from light. ".repeat(20) }] }];
const create = (code: string) =>
  new Request("http://x/api/jobs", { method: "POST", body: JSON.stringify({ accessCode: code, brief, materials, rightsConfirmed: true }), headers: { "content-type": "application/json" } });
const now = new Date("2026-11-12T10:00:00Z");

describe("readSettings / writeSettings", () => {
  it("returns the defaults for a missing file", async () => {
    expect(await readSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it("returns the defaults for a corrupted or invalid file and logs it", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const store = memoryStore();
    await store.write("config/settings.json", "{not json");
    expect(await readSettings(store)).toEqual(DEFAULT_SETTINGS);
    await store.write("config/settings.json", JSON.stringify({ generationPaused: "yes" }));
    expect(await readSettings(store)).toEqual(DEFAULT_SETTINGS);
    expect(log.mock.calls.filter(([line]) => String(line).includes("settings.invalid"))).toHaveLength(2);
    log.mockRestore();
  });

  it("round-trips a valid value", async () => {
    const store = memoryStore();
    const next: Settings = { ...DEFAULT_SETTINGS, generationPaused: true, dailyJobLimit: 5, model: "gemini-3.1-flash-lite", announcement: { en: "Hi", ro: "Salut" } };
    await writeSettings(store, next);
    expect(await readSettings(store)).toEqual(next);
  });

  it("rejects a limit of 0 or 501, a model id with a space, 51 codes and a 301-character announcement", async () => {
    const store = memoryStore();
    await expect(writeSettings(store, { ...DEFAULT_SETTINGS, dailyJobLimit: 0 })).rejects.toThrow();
    await expect(writeSettings(store, { ...DEFAULT_SETTINGS, dailyJobLimit: 501 })).rejects.toThrow();
    await expect(writeSettings(store, { ...DEFAULT_SETTINGS, model: "gemini 3" })).rejects.toThrow();
    const entry = newInviteCode("x", now).entry;
    await expect(writeSettings(store, { ...DEFAULT_SETTINGS, codes: Array.from({ length: 51 }, () => entry) })).rejects.toThrow();
    await expect(writeSettings(store, { ...DEFAULT_SETTINGS, announcement: { en: "x".repeat(301), ro: "" } })).rejects.toThrow();
    expect(await store.read("config/settings.json")).toBeNull();
  });

  it("settingsSchema accepts the defaults", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });
});

describe("matchCode", () => {
  const invite = newInviteCode("Class A", now);
  const settings: Settings = { ...DEFAULT_SETTINGS, codes: [invite.entry] };

  it("a new code is 16 characters, its entry holds only the hash", () => {
    expect(invite.code).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(invite.entry).toMatchObject({ label: "Class A", active: true });
    expect(invite.entry.id).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(invite.entry)).not.toContain(invite.code);
  });

  it("returns env, the id of an active invite code, or null", () => {
    expect(matchCode(CODE, env, settings)).toBe("env");
    expect(matchCode(invite.code, env, settings)).toBe(invite.entry.id);
    expect(matchCode("wrong", env, settings)).toBeNull();
    expect(matchCode("", env, settings)).toBeNull();
  });

  it("a disabled invite code does not match", () => {
    expect(matchCode(invite.code, env, { ...settings, codes: [{ ...invite.entry, active: false }] })).toBeNull();
  });

  it("the env code needs 12 characters", () => {
    expect(matchCode("short", { PORTAL_ACCESS_CODE: "short" } as unknown as NodeJS.ProcessEnv, DEFAULT_SETTINGS)).toBeNull();
  });
});

describe("settings in the API", () => {
  it("a job made with an invite code stores its id; the public job does not show it", async () => {
    const store = memoryStore();
    const invite = newInviteCode("Class A", now);
    await writeSettings(store, { ...DEFAULT_SETTINGS, codes: [invite.entry] });
    const response = await createJobHandler(create(invite.code), store, env, now);
    expect(response.status).toBe(202);
    const { id } = await response.json();
    expect(JSON.parse((await store.read(`jobs/${id}/state.json`)) as string).codeId).toBe(invite.entry.id);
    const job = await (await getJobHandler(id, store)).json();
    expect(JSON.stringify(job)).not.toContain(invite.entry.id);
    expect(Object.keys(job)).not.toContain("codeId");
  });

  it("a job made with the environment code is marked env", async () => {
    const store = memoryStore();
    const { id } = await (await createJobHandler(create(CODE), store, env, now)).json();
    expect(JSON.parse((await store.read(`jobs/${id}/state.json`)) as string).codeId).toBe("env");
  });

  it("a disabled invite code gets wrong-code", async () => {
    const store = memoryStore();
    const invite = newInviteCode("x", now);
    await writeSettings(store, { ...DEFAULT_SETTINGS, codes: [{ ...invite.entry, active: false }] });
    const response = await createJobHandler(create(invite.code), store, env, now);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "wrong-code" });
  });

  it("with generation paused, create and advance both answer 503 generation-off", async () => {
    const store = memoryStore();
    const open = await createJobHandler(create(CODE), store, env, now);
    const { id } = await open.json();
    const paused = { ...DEFAULT_SETTINGS, generationPaused: true };
    await writeSettings(store, paused);
    const created = await createJobHandler(create(CODE), store, env, now);
    expect(created.status).toBe(503);
    expect(await created.json()).toMatchObject({ code: "generation-off" });
    const advanced = await advanceHandler(id, () => ({ store, model: cannedModel(), now: () => now }), env, paused);
    expect(advanced.status).toBe(503);
    expect(await advanced.json()).toMatchObject({ code: "generation-off" });
  });

  it("a daily limit of 1 in the settings blocks the second job even when the environment says 10", async () => {
    const store = memoryStore();
    await writeSettings(store, { ...DEFAULT_SETTINGS, dailyJobLimit: 1 });
    expect((await createJobHandler(create(CODE), store, env, now)).status).toBe(202);
    const second = await createJobHandler(create(CODE), store, env, now);
    expect(second.status).toBe(429);
    expect(await second.json()).toMatchObject({ code: "daily-limit" });
  });

  it("the stored settings never contain a code in clear text", async () => {
    const store = memoryStore();
    const invite = newInviteCode("x", now);
    await writeSettings(store, { ...DEFAULT_SETTINGS, codes: [invite.entry] });
    expect(await store.read("config/settings.json")).not.toContain(invite.code);
  });

  it("generationEnabled is false while paused", () => {
    expect(generationEnabled(env, DEFAULT_SETTINGS)).toBe(true);
    expect(generationEnabled(env, { ...DEFAULT_SETTINGS, generationPaused: true })).toBe(false);
  });
});

describe("monthly limit per invite code", () => {
  it("blocks a group's next job once its monthly limit is reached, with group-limit", async () => {
    const store = memoryStore();
    const invite = newInviteCode("Class A", now);
    await writeSettings(store, { ...DEFAULT_SETTINGS, codes: [{ ...invite.entry, monthlyJobLimit: 1 }] });
    expect((await createJobHandler(create(invite.code), store, env, now)).status).toBe(202);
    const second = await createJobHandler(create(invite.code), store, env, now);
    expect(second.status).toBe(429);
    expect(await second.json()).toMatchObject({ code: "group-limit" });
    // Other codes and the environment code are not affected.
    expect((await createJobHandler(create(CODE), store, env, now)).status).toBe(202);
  });

  it("counts per UTC month and only for that code", async () => {
    const store = memoryStore();
    const invite = newInviteCode("Class A", now);
    await writeSettings(store, { ...DEFAULT_SETTINGS, codes: [{ ...invite.entry, monthlyJobLimit: 1 }] });
    expect((await createJobHandler(create(invite.code), store, env, now)).status).toBe(202);
    const nextMonth = new Date("2026-12-01T00:00:00Z");
    expect((await createJobHandler(create(invite.code), store, env, nextMonth)).status).toBe(202);
    expect(await codeJobsThisMonth(store, invite.entry.id, nextMonth)).toBe(1);
    expect(await codeJobsThisMonth(store, invite.entry.id, now)).toBe(1);
  });

  it("keeps working with stored codes that have no limit field, and rejects a limit of 0", async () => {
    const store = memoryStore();
    const invite = newInviteCode("x", now);
    const { monthlyJobLimit: _ignored, ...legacy } = { ...invite.entry, monthlyJobLimit: null };
    await store.write("config/settings.json", JSON.stringify({ ...DEFAULT_SETTINGS, codes: [legacy] }));
    expect((await readSettings(store)).codes).toHaveLength(1);
    await expect(writeSettings(store, { ...DEFAULT_SETTINGS, codes: [{ ...invite.entry, monthlyJobLimit: 0 }] })).rejects.toThrow();
  });
});

describe("withCodeLimit", () => {
  it("sets and clears one code's monthly limit, leaving the others; unknown ids give null", async () => {
    const { withCodeLimit } = await import("@/lib/settings");
    const a = newInviteCode("A", now).entry;
    const b = newInviteCode("B", now).entry;
    const settings: Settings = { ...DEFAULT_SETTINGS, codes: [a, b] };
    const limited = withCodeLimit(settings, a.id, 20)!;
    expect(limited.codes.map((code) => code.monthlyJobLimit ?? null)).toEqual([20, null]);
    expect(withCodeLimit(limited, a.id, null)!.codes[0].monthlyJobLimit).toBeNull();
    expect(withCodeLimit(settings, "ffffffff", 3)).toBeNull();
  });
});
