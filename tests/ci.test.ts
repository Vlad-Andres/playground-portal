import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(path.resolve(".github/workflows/ci.yml"), "utf8");

describe("CI workflow", () => {
  it("runs lint, tests, build and audit in that order", () => {
    const order = ["npm run lint", "npm test", "npm run build", "npm audit --omit=dev --audit-level=high"];
    const positions = order.map((command) => workflow.indexOf(`- run: ${command}`));
    for (const [index, position] of positions.entries()) {
      expect(position, `missing CI step: ${order[index]}`).toBeGreaterThanOrEqual(0);
      if (index > 0) expect(position, `CI steps out of order: ${order[index]}`).toBeGreaterThan(positions[index - 1]);
    }
  });
});
