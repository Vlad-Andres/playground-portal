// Copies the template's pure core/ into vendor/core and records the template commit it came from.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const template = path.resolve(process.argv[2] ?? "../playground-template");
const source = path.join(template, "core");
const target = path.resolve("vendor/core");

if (!fs.existsSync(source)) {
  console.error(`No core/ folder at ${source}`);
  process.exit(1);
}
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
const sha = execFileSync("git", ["-C", template, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
fs.writeFileSync(path.join(target, "TEMPLATE_SHA"), `${sha}\n`);
console.log(`vendor/core synced from ${sha.slice(0, 7)}`);
