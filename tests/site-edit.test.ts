import { describe, expect, it } from "vitest";
import { buildSiteData, type SiteData } from "@core/site";
import type { Course, LectureFile } from "@core/schema";
import { applyCoursePatch, blockSummary, coursePatchSchema } from "@/lib/sites/edit";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

function makeSite(courseOverrides: Partial<Course> = {}, extraLectures: LectureFile[] = []): SiteData {
  const secondLecture: LectureFile = {
    ...structuredClone(fixtureLecture),
    meta: { ...structuredClone(fixtureLecture.meta), slug: "second", number: 2, title: "Second lecture" },
    sections: [
      {
        id: "s1",
        title: "Overview",
        kind: "intuition",
        blocks: [
          { kind: "prose", md: "First paragraph." },
          { kind: "info", variant: "note", title: "Tip", md: "Important detail." },
          { kind: "table", headers: ["A", "B"], rows: [["1", "2"]], caption: "Comparison" },
        ],
      },
      {
        id: "s2",
        title: "Interactive",
        kind: "playground",
        blocks: [
          {
            kind: "custom",
            id: "ex1",
            title: "Mini exercise",
            description: "Try it.",
            html: "<!doctype html><button>Click</button>",
          },
        ],
      },
    ],
  };

  return buildSiteData({
    key: "demo-12345678",
    course: { ...structuredClone(fixtureCourse), ...courseOverrides },
    lectures: [structuredClone(fixtureLecture), secondLecture, ...extraLectures],
    exam: null,
    expected: [],
  });
}

describe("coursePatchSchema", () => {
  it("accepts valid fields and rejects unknown keys, bad accents and oversized blocks arrays", () => {
    expect(coursePatchSchema.safeParse({ title: "  New title  ", accent: "#0f766e" }).success).toBe(true);
    expect(coursePatchSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(coursePatchSchema.safeParse({ accent: "green" }).success).toBe(false);
    expect(coursePatchSchema.safeParse({ extra: true }).success).toBe(false);
    expect(
      coursePatchSchema.safeParse({
        blocks: Array.from({ length: 201 }, (_, index) => ({ slug: "intro", sectionId: "s1", index })),
      }).success,
    ).toBe(false);
  });
});

describe("blockSummary", () => {
  it("marks only prose and info as editable and extracts a <= 140-character preview", () => {
    expect(blockSummary({ kind: "prose", md: "x".repeat(200) })).toEqual({
      kind: "prose",
      text: "x".repeat(140),
      editable: true,
    });
    expect(blockSummary({ kind: "info", variant: "note", title: "Note", md: "Remember this." })).toEqual({
      kind: "info",
      text: "Note — Remember this.",
      editable: true,
    });
    expect(blockSummary({ kind: "table", headers: ["Col"], rows: [["Val"]], caption: "My table" })).toEqual({
      kind: "table",
      text: "My table",
      editable: false,
    });
    expect(
      blockSummary({ kind: "custom", id: "c1", title: "Sandbox lab", description: "Desc", html: "<p>Hi</p>" }),
    ).toEqual({
      kind: "custom",
      text: "Sandbox lab",
      editable: false,
    });
  });
});

describe("applyCoursePatch", () => {
  it("returns a deep-equal site on an empty patch and never mutates the input", () => {
    const site = makeSite();
    const snapshot = structuredClone(site);
    const result = applyCoursePatch(site, {});
    expect(result).toEqual({ ok: true, site: snapshot });
    expect(site).toEqual(snapshot);
    if (result.ok) expect(result.site).not.toBe(site);
  });

  it("updates title, matching shortTitle, description and theme accent while preserving corners", () => {
    const matching = makeSite({ title: "Same", shortTitle: "Same", theme: { corners: "sharp" } });
    const snapshot = structuredClone(matching);
    const res1 = applyCoursePatch(matching, { title: "Updated", description: "Fresh", accent: "#123456" });
    expect(matching).toEqual(snapshot);
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.site.course.title).toBe("Updated");
      expect(res1.site.course.shortTitle).toBe("Updated");
      expect(res1.site.course.description).toBe("Fresh");
      expect(res1.site.course.theme).toEqual({ corners: "sharp", accent: "#123456" });
    }

    const distinct = makeSite({ title: "Long title", shortTitle: "Short" });
    const res2 = applyCoursePatch(distinct, { title: "Another title", accent: "#abcdef" });
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.site.course.title).toBe("Another title");
      expect(res2.site.course.shortTitle).toBe("Short");
      expect(res2.site.course.theme).toEqual({ accent: "#abcdef" });
    }
  });

  it("renames a lecture, updates the index and rejects an unknown lecture slug", () => {
    const site = makeSite();
    expect(applyCoursePatch(site, { lectures: [{ slug: "missing", title: "Nope" }] })).toEqual({
      ok: false,
      code: "unknown-lecture",
    });

    const renamed = applyCoursePatch(site, { lectures: [{ slug: "second", title: "Renamed lecture" }] });
    expect(renamed.ok).toBe(true);
    if (renamed.ok) {
      expect(renamed.site.lectures[1].meta.title).toBe("Renamed lecture");
      expect(renamed.site.index[1].meta.title).toBe("Renamed lecture");
    }
  });

  it("applies md edits first and removals by original index, and drops empty sections including custom blocks", () => {
    const site = makeSite();
    const snapshot = structuredClone(site);
    const res = applyCoursePatch(site, {
      blocks: [
        { slug: "second", sectionId: "s1", index: 0, remove: true },
        { slug: "second", sectionId: "s1", index: 1, md: "Edited info markdown." },
        { slug: "second", sectionId: "s2", index: 0, remove: true },
      ],
    });
    expect(site).toEqual(snapshot);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const lecture = res.site.lectures[1];
      expect(lecture.sections).toHaveLength(1);
      expect(lecture.meta.outline).toHaveLength(1);
      expect(lecture.sections[0].blocks).toEqual([
        { kind: "info", variant: "note", title: "Tip", md: "Edited info markdown." },
        { kind: "table", headers: ["A", "B"], rows: [["1", "2"]], caption: "Comparison" },
      ]);
    }
  });

  it("returns unknown-block, not-editable, empty-lecture, last-lecture and invalid when violated", () => {
    const site = makeSite();

    expect(applyCoursePatch(site, { blocks: [{ slug: "second", sectionId: "s1", index: 9, remove: true }] })).toEqual({
      ok: false,
      code: "unknown-block",
    });
    expect(applyCoursePatch(site, { blocks: [{ slug: "second", sectionId: "nope", index: 0, remove: true }] })).toEqual({
      ok: false,
      code: "unknown-block",
    });
    expect(applyCoursePatch(site, { blocks: [{ slug: "nope", sectionId: "s1", index: 0, remove: true }] })).toEqual({
      ok: false,
      code: "unknown-block",
    });

    expect(applyCoursePatch(site, { blocks: [{ slug: "second", sectionId: "s1", index: 2, md: "Nope" }] })).toEqual({
      ok: false,
      code: "not-editable",
    });

    expect(
      applyCoursePatch(site, {
        blocks: [
          { slug: "intro", sectionId: "s1", index: 0, remove: true },
          { slug: "intro", sectionId: "s1", index: 1, remove: true },
        ],
      }),
    ).toEqual({ ok: false, code: "empty-lecture" });

    expect(
      applyCoursePatch(site, {
        lectures: [
          { slug: "intro", remove: true },
          { slug: "second", remove: true },
        ],
      }),
    ).toEqual({ ok: false, code: "last-lecture" });

    expect(applyCoursePatch(site, { title: "   " })).toEqual({ ok: false, code: "invalid" });
    expect(applyCoursePatch(site, { blocks: [{ slug: "intro", sectionId: "s1", index: 0, md: "x".repeat(6001) }] })).toEqual({
      ok: false,
      code: "invalid",
    });
  });

  it("drops removed lectures, renumbers remaining lectures 1..N, and rebuilds the index", () => {
    const site = makeSite();
    const res = applyCoursePatch(site, { lectures: [{ slug: "intro", remove: true }] });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.site.lectures).toHaveLength(1);
      expect(res.site.lectures[0].meta.slug).toBe("second");
      expect(res.site.lectures[0].meta.number).toBe(1);
      expect(res.site.index.map((entry) => [entry.meta.slug, entry.meta.number])).toEqual([["second", 1]]);
    }
  });
});
