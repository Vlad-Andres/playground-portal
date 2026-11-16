import { describe, expect, it } from "vitest";
import { memoryStore } from "@/lib/jobs/store";
import { DEFAULT_SETTINGS, demoCourseUrl, newInviteCode, readSettings, withDemoCourses, writeSettings, type Settings } from "@/lib/settings";

const now = new Date("2026-11-16T10:00:00Z");
const EN = "energy-on-the-move-0a1b2c3d";
const RO = "energia-in-miscare-4e5f6a7b";

describe("demo course per language", () => {
  it("is unset by default", () => {
    expect(DEFAULT_SETTINGS.demoCourseKey).toEqual({ en: null, ro: null });
  });

  it("settings saved before this field still load, codes included", async () => {
    const store = memoryStore();
    const { demoCourseKey: _ignored, ...older } = { ...DEFAULT_SETTINGS, codes: [newInviteCode("Nov", "NOV-2026", now)] };
    await store.write("config/settings.json", JSON.stringify(older));
    const settings = await readSettings(store);
    expect(settings.codes).toHaveLength(1);
    expect(settings.demoCourseKey).toEqual({ en: null, ro: null });
  });

  it("round-trips and rejects a key that is not a course key", async () => {
    const store = memoryStore();
    const next: Settings = { ...DEFAULT_SETTINGS, demoCourseKey: { en: EN, ro: RO } };
    await writeSettings(store, next);
    expect((await readSettings(store)).demoCourseKey).toEqual({ en: EN, ro: RO });
    await expect(writeSettings(store, { ...DEFAULT_SETTINGS, demoCourseKey: { en: "Not a key", ro: null } })).rejects.toThrow();
  });

  it("withDemoCourses accepts only existing courses; empty clears", () => {
    const known = [EN, RO];
    expect(withDemoCourses(DEFAULT_SETTINGS, { en: EN, ro: "" }, known)?.demoCourseKey).toEqual({ en: EN, ro: null });
    expect(withDemoCourses(DEFAULT_SETTINGS, { en: EN, ro: RO }, known)?.demoCourseKey).toEqual({ en: EN, ro: RO });
    expect(withDemoCourses(DEFAULT_SETTINGS, { en: "gone-course-11111111", ro: "" }, known)).toBeNull();
  });

  it("demoCourseUrl links to the course for the page language, or null", () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, demoCourseKey: { en: EN, ro: null } };
    expect(demoCourseUrl(settings, "en")).toBe(`/courses/${EN}/`);
    expect(demoCourseUrl(settings, "ro")).toBeNull();
    expect(demoCourseUrl(settings, "fr")).toBeNull();
  });
});
