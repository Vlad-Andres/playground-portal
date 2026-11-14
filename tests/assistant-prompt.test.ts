import { describe, expect, it } from "vitest";
import { buildSystem } from "@/lib/assistant/prompt";

describe("assistant system prompt", () => {
  const system = buildSystem("Circuits", "## [L1 §1] Charge\n\nText.");

  it("wraps the course in lecture tags", () => {
    expect(system).toContain("built into Circuits");
    expect(system).toContain("<lecture>\n## [L1 §1] Charge\n\nText.\n</lecture>");
  });

  it("asks for section citations with the exact labels", () => {
    expect(system).toMatch(/cite it with that exact label in square brackets/);
    expect(system).toContain("Cite only labels that appear in the course.");
  });
});
