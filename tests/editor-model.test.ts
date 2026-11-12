import { describe, expect, it } from "vitest";
import { buildSiteData } from "@core/site";
import { editorModel } from "@/lib/sites/editor-model";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

describe("editorModel", () => {
  const site = buildSiteData({ key: "demo-12345678", course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });
  const model = editorModel(site);

  it("carries the course fields and a default accent", () => {
    expect(model).toMatchObject({ key: "demo-12345678", title: "Demo course", description: "A demo course.", accent: "#237b55" });
  });

  it("lists every block with its original index; only prose and info carry Markdown", () => {
    const blocks = model.lectures[0].sections.flatMap((section) => section.blocks);
    expect(blocks.length).toBe(fixtureLecture.sections.flatMap((section) => section.blocks).length);
    for (const block of blocks) {
      expect(block.editable).toBe(block.kind === "prose" || block.kind === "info");
      expect("md" in block).toBe(block.editable);
    }
    expect(blocks.map((block) => block.index)).toEqual(blocks.map((_, i) => i).slice(0, blocks.length).map((_, i) => blocks[i].index));
  });

  it("never includes the lectures' full content", () => {
    expect(JSON.stringify(model)).not.toContain("quiz");
  });
});
