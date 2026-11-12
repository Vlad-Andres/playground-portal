import { describe, expect, it, vi } from "vitest";
import { memoryStore } from "@/lib/jobs/store";
import {
  applyOverrides,
  checkOverride,
  EMPTY_OVERRIDES,
  flattenMessages,
  readOverrides,
  updateOverrides,
} from "@/lib/translations";
import en from "@/messages/en.json";

describe("flattenMessages", () => {
  it("turns nested messages into dotted keys, arrays by index", () => {
    expect(flattenMessages({ a: { b: "x", c: ["y", "z"] }, d: "w" })).toEqual({ "a.b": "x", "a.c.0": "y", "a.c.1": "z", d: "w" });
  });
});

describe("applyOverrides", () => {
  it("replaces only known keys and never changes the input", () => {
    const base = { landing: { cta: "Create", lead: "Lead" }, list: ["one", "two"] };
    const copy = structuredClone(base);
    const result = applyOverrides(base, { "landing.cta": "Start", "list.1": "deux", "unknown.key": "x" });
    expect(result).toEqual({ landing: { cta: "Start", lead: "Lead" }, list: ["one", "deux"] });
    expect(base).toEqual(copy);
  });
});

describe("checkOverride", () => {
  it("accepts plain text and the same placeholders", () => {
    expect(checkOverride("Hello", "Salut")).toBeNull();
    expect(checkOverride("Use at most {max} files.", "Max {max} fișiere.")).toBeNull();
    expect(checkOverride("Turn notes into a <em>study site.</em>", "Notițe într-un <em>site.</em>")).toBeNull();
    expect(checkOverride("{count, plural, one {# page} other {# pages}}", "{count, plural, one {# pagină} few {# pagini} other {# de pagini}}")).toBeNull();
  });
  it("rejects a missing or extra placeholder", () => {
    expect(checkOverride("Use at most {max} files.", "Use few files.")).toMatch(/placeholder/i);
    expect(checkOverride("Hello", "Hello {name}")).toMatch(/placeholder/i);
  });
  it("rejects missing or broken tags and unbalanced braces", () => {
    expect(checkOverride("a <em>b</em>", "a b")).toMatch(/tag/i);
    expect(checkOverride("a <em>b</em>", "a <em>b")).toMatch(/tag/i);
    expect(checkOverride("Hello {name}", "Hello {name")).toMatch(/brace/i);
  });
  it("rejects empty and over-long text", () => {
    expect(checkOverride("Hello", "   ")).toMatch(/empty/i);
    expect(checkOverride("Hello", "x".repeat(2001))).toMatch(/2000/);
  });
});

describe("readOverrides / updateOverrides", () => {
  it("is empty when there is no file or the file is broken", async () => {
    const store = memoryStore();
    expect(await readOverrides(store)).toEqual(EMPTY_OVERRIDES);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await store.write("config/messages.json", "{nope");
    expect(await readOverrides(store)).toEqual(EMPTY_OVERRIDES);
    log.mockRestore();
  });

  it("stores valid changes, removes a change set to null, and reports each invalid one without saving it", async () => {
    const store = memoryStore();
    const first = await updateOverrides(store, [
      { locale: "en", key: "landing.cta", value: "Start now" },
      { locale: "ro", key: "materials.too-many-files", value: "Prea multe" },
      { locale: "en", key: "no.such.key", value: "x" },
    ]);
    expect(first.saved).toBe(1);
    expect(first.errors.map((error) => error.key).sort()).toEqual(["materials.too-many-files", "no.such.key"]);
    expect((await readOverrides(store)).en["landing.cta"]).toBe("Start now");

    const second = await updateOverrides(store, [{ locale: "en", key: "landing.cta", value: null }]);
    expect(second).toEqual({ saved: 1, errors: [] });
    expect((await readOverrides(store)).en).toEqual({});
  });

  it("a value equal to the default is not stored", async () => {
    const store = memoryStore();
    await updateOverrides(store, [{ locale: "en", key: "landing.cta", value: flattenMessages(en)["landing.cta"] }]);
    expect((await readOverrides(store)).en).toEqual({});
  });
});
