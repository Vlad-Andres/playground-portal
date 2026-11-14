import fs from "node:fs";
import { describe, expect, it } from "vitest";

type Legal = { privacy: { title: string; beta: string; sections: { heading: string; body: string }[] }; terms: { title: string; beta: string; sections: { heading: string; body: string }[] }; footer: Record<string, string> };
const legal = (locale: string) => (JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8")) as { legal: Legal }).legal;

describe("privacy and terms", () => {
  it("exist as pages and are linked from the landing and create footers", () => {
    for (const file of ["app/privacy/page.tsx", "app/terms/page.tsx"]) expect(fs.existsSync(file), file).toBe(true);
    for (const file of ["app/page.tsx", "components/create/Builder.tsx"]) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).toContain('href="/privacy"');
      expect(source, file).toContain('href="/terms"');
    }
  });

  it("have the same sections in English and Romanian and say they are for the beta", () => {
    const en = legal("en");
    const ro = legal("ro");
    for (const page of ["privacy", "terms"] as const) {
      expect(ro[page].sections).toHaveLength(en[page].sections.length);
      expect(en[page].beta).toMatch(/beta/i);
    }
  });

  it("state the facts the code implements and name no model or provider", () => {
    const text = JSON.stringify(legal("en").privacy).toLowerCase();
    for (const fact of ["read in your browser", "7 days", "keep my files", "anyone with the link", "delete"]) expect(text).toContain(fact);
    expect(JSON.stringify([legal("en"), legal("ro")])).not.toMatch(/gemini|google ai|openai|anthropic|claude|model name/i);
  });
});
