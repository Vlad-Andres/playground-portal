const HEX = /^#[0-9a-fA-F]{6}$/;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  if (!HEX.test(hex)) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [1, 3, 5].map((start) => channel(Number.parseInt(hex.slice(start, start + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Mix two #rrggbb colours in sRGB; weight is the share of `a` (0..1). */
export function mixHex(a: string, b: string, weight: number): string {
  const parts = (hex: string) => [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  if (!HEX.test(a) || !HEX.test(b)) throw new Error("Not a #rrggbb colour");
  const [pa, pb] = [parts(a), parts(b)];
  return `#${pa
    .map((value, index) => Math.round(value * weight + pb[index] * (1 - weight)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Black or white, whichever has the higher WCAG contrast on the given background. */
export function readableInk(hex: string): "#000000" | "#ffffff" {
  const luminance = relativeLuminance(hex);
  return contrast(luminance, 0) >= contrast(luminance, 1) ? "#000000" : "#ffffff";
}
