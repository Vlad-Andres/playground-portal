import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { groupRows } from "@/lib/metrics";

describe("beta numbers in admin", () => {
  it("labels each group, keeps the environment code, and gives a success rate with its denominator", () => {
    const rows = groupRows(
      { a1b2c3d4: { submitted: 4, published: 3, failed: 1 }, env: { submitted: 1, published: 0, failed: 0 }, gone0000: { submitted: 2, published: 2, failed: 0 } },
      [{ id: "a1b2c3d4", label: "Databases class" }],
    );
    expect(rows).toEqual([
      { group: "a1b2c3d4", label: "Databases class", submitted: 4, published: 3, failed: 1, success: "3 / 4" },
      { group: "env", label: "Environment code", submitted: 1, published: 0, failed: 0, success: "0 / 1" },
      { group: "gone0000", label: "Deleted code", submitted: 2, published: 2, failed: 0, success: "2 / 2" },
    ]);
  });

  it("the admin page shows the numbers and the feedback", () => {
    const page = fs.readFileSync("app/admin/page.tsx", "utf8");
    expect(page).toMatch(/<BetaNumbers /);
    expect(page).toMatch(/<FeedbackList /);
  });
});
