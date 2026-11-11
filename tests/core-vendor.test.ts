import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { validateBlock } from "@core/index";
import { checkMaterials } from "@core/generate/index";

describe("vendored core", () => {
  it("records the template commit", () => expect(fs.readFileSync("vendor/core/TEMPLATE_SHA", "utf8").trim()).toMatch(/^[0-9a-f]{40}$/));
  it("validates blocks", () => {
    expect(validateBlock({ kind: "prose", md: "Hi" })).toEqual([]);
    expect(validateBlock({ kind: "nope" })[0].code).toBe("E003");
  });
  it("exposes the generator", () => expect(checkMaterials([]).ok).toBe(false));
});
