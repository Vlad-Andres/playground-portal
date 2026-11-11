import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSiteData, siteDataSchema } from "@core/site";
import { HomeScreen } from "@site/screens/HomeScreen";
import { SiteProvider } from "@site/site/context";
import { fixtureCourse, fixtureLecture } from "./fixtures/site";

const BASE = "/courses/demo-12345678";
const site = buildSiteData({ key: "demo-12345678", course: fixtureCourse, lectures: [fixtureLecture], exam: null, expected: [] });

describe("vendored template UI", () => {
  it("contains the screens and the stylesheet, but not the template's own course", () => {
    expect(fs.existsSync(path.resolve("vendor/site/screens/LectureScreen.tsx"))).toBe(true);
    expect(fs.existsSync(path.resolve("vendor/site/site.css"))).toBe(true);
    expect(fs.existsSync(path.resolve("vendor/site/content/static.ts"))).toBe(false);
    expect(fs.existsSync(path.resolve("vendor/site/content/generated"))).toBe(false);
  });

  it("records the same template commit as vendor/core", () => {
    const read = (dir: string) => fs.readFileSync(path.resolve(dir, "TEMPLATE_SHA"), "utf8");
    expect(read("vendor/site")).toBe(read("vendor/core"));
  });

  it("renders the home screen from SiteData with course-relative links", () => {
    expect(siteDataSchema.safeParse(site).success).toBe(true);
    const html = renderToStaticMarkup(
      <SiteProvider data={site} base={BASE}>
        <HomeScreen data={site} />
      </SiteProvider>,
    );
    expect(html).toContain("Demo course");
    const internal = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
    expect(internal.length).toBeGreaterThan(0);
    for (const href of internal) expect(href.startsWith(`${BASE}/`)).toBe(true);
  });
});
