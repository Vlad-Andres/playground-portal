import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMetric } from "@/lib/metrics-client";

describe("sendMetric", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only the event type and the course key with sendBeacon", async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    sendMetric("quiz_completed", "demo-course-0a1b2c3d");
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe("/api/metrics");
    expect(JSON.parse(await blob.text())).toEqual({ type: "quiz_completed", courseKey: "demo-course-0a1b2c3d" });
  });

  it("does nothing without sendBeacon", () => {
    vi.stubGlobal("navigator", {});
    expect(() => sendMetric("course_open", "demo-course-0a1b2c3d")).not.toThrow();
  });

  it("is wired into course pages and the share card", () => {
    expect(fs.readFileSync("app/courses/[key]/layout.tsx", "utf8")).toMatch(/<StudyCounter courseKey=\{key\} \/>/);
    const counter = fs.readFileSync("components/course/StudyCounter.tsx", "utf8");
    expect(counter).toContain('sendMetric("course_open"');
    expect(counter).toContain("STUDY_EVENT");
    expect(fs.readFileSync("components/course/ShareCard.tsx", "utf8")).toContain('sendMetric("share_copied"');
  });
});
