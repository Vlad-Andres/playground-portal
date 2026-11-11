import { mixHex, readableInk } from "@core/color";
import type { CourseTheme } from "@core/schema";

const RADII = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];

/** CSS that applies a course theme on top of globals.css. Values come from the validated schema. */
export function themeCss(theme: CourseTheme | undefined): string {
  if (!theme) return "";
  const rules: string[] = [];
  const accent = theme.accent;
  if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
    const strong = mixHex(accent, "#000000", 0.82);
    const soft = mixHex(accent, "#ffffff", 0.14);
    rules.push(`:root{--brand:${accent};--brand-strong:${strong};--brand-soft:${soft};--brand-ink:${readableInk(accent)};}`);
    const darkBrand = mixHex(accent, "#ffffff", 0.62);
    const darkStrong = mixHex(accent, "#ffffff", 0.48);
    const darkSoft = mixHex(accent, "#000000", 0.32);
    rules.push(`.dark{--brand:${darkBrand};--brand-strong:${darkStrong};--brand-soft:${darkSoft};--brand-ink:${readableInk(darkBrand)};}`);
  }
  if (theme.corners === "sharp") {
    rules.push(`:root{${RADII.map((name) => `--radius-${name}:3px;`).join("")}}`);
  }
  return rules.join("\n");
}
