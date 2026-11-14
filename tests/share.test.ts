import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { courseShareUrl } from "@/lib/sites/share";

const messages = (locale: string) => JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>;

describe("courseShareUrl", () => {
  it("gives the full course link for a course path", () => {
    expect(courseShareUrl("https://x.test", "/courses/circuits-1a2b3c4d/")).toBe("https://x.test/courses/circuits-1a2b3c4d/");
    expect(courseShareUrl("https://x.test", "/courses/circuits-1a2b3c4d")).toBe("https://x.test/courses/circuits-1a2b3c4d/");
  });

  it("never shares a management, job or token link", () => {
    for (const path of ["/manage/abc", "/jobs/123", "/my/circuits-1a2b3c4d", "/courses/x/?token=1", "/courses/../manage/x", "https://evil.test/courses/x/"]) {
      expect(courseShareUrl("https://x.test", path), path).toBeNull();
    }
  });
});

describe("share card", () => {
  it("is shown after a job finishes and on both owner pages", () => {
    for (const file of ["app/jobs/[id]/page.tsx", "app/my/[key]/page.tsx", "app/manage/[token]/page.tsx"]) {
      expect(fs.readFileSync(file, "utf8"), file).toMatch(/<ShareCard /);
    }
  });

  it("says in both languages that anyone with the link can read the course", () => {
    expect(messages("en").share.note).toMatch(/Anyone with this link can read the course/);
    expect(Object.keys(messages("ro").share).sort()).toEqual(Object.keys(messages("en").share).sort());
  });
});
