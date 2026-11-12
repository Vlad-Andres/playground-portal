import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, pickLocale } from "@/i18n/config";

type Tree = { [key: string]: string | Tree | (string | Tree)[] };

function load(locale: string): Tree {
  return JSON.parse(fs.readFileSync(path.resolve("messages", `${locale}.json`), "utf8")) as Tree;
}

function flatten(tree: Tree | (string | Tree)[], prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  const entries = Array.isArray(tree) ? tree.map((value, index) => [String(index), value] as const) : Object.entries(tree);
  for (const [key, value] of entries) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result[full] = value;
    else Object.assign(result, flatten(value, full));
  }
  return result;
}

const en = flatten(load("en"));
const ro = flatten(load("ro"));

const API_CODES = ["generation-off", "too-large", "bad-request", "wrong-code", "daily-limit", "bad-id", "not-found", "wrong-state", "bad-outline"];
const JOB_CODES = ["course-too-big", "plan-failed", "lecture-failed", "busy", "material-gone", "step-failed"];
const MATERIAL_CODES = ["empty", "too-many-files", "too-many-pages", "too-long", "scanned"];

describe("messages", () => {
  it("English and Romanian have exactly the same keys", () => {
    expect(Object.keys(ro).sort()).toEqual(Object.keys(en).sort());
  });

  it("no value is empty", () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(ro)]) expect(value.trim(), key).not.toBe("");
  });

  it("every placeholder of an English value is in the Romanian value", () => {
    for (const [key, value] of Object.entries(en)) {
      for (const [, name] of value.matchAll(/\{(\w+)[,}]/g)) expect(ro[key], `${key} {${name}}`).toContain(`{${name}`);
    }
  });

  it("has a text for every error and material code", () => {
    for (const code of [...API_CODES, ...JOB_CODES, "unauthorized", "generic", "network"]) expect(en[`errors.${code}`], code).toBeTruthy();
    for (const code of MATERIAL_CODES) expect(en[`materials.${code}`], code).toBeTruthy();
  });

  it("Romanian uses comma-below diacritics, never cedillas", () => {
    for (const [key, value] of Object.entries(ro)) expect(value, key).not.toMatch(/[şţŞŢ]/);
  });
});

describe("pickLocale", () => {
  it("a known cookie wins", () => {
    expect(pickLocale("ro", "en-US,en;q=0.9")).toBe("ro");
    expect(pickLocale("en", "ro-RO,ro;q=0.9")).toBe("en");
  });
  it("an unknown cookie value is ignored", () => {
    expect(pickLocale("xx", "ro-RO,ro;q=0.9")).toBe("ro");
    expect(pickLocale("", null)).toBe(DEFAULT_LOCALE);
  });
  it("follows Accept-Language by quality", () => {
    expect(pickLocale(undefined, "ro-RO,ro;q=0.9,en;q=0.8")).toBe("ro");
    expect(pickLocale(undefined, "de-DE,en;q=0.5,ro;q=0.9")).toBe("ro");
  });
  it("falls back to English", () => {
    expect(pickLocale(undefined, "de-DE")).toBe("en");
    expect(pickLocale(undefined, null)).toBe("en");
    expect(LOCALES).toEqual(["en", "ro"]);
  });
});
