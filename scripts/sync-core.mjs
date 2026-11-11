// Copies the template's pure core/ into vendor/core and its shared UI into vendor/site, and records
// the template commit they came from. Run after every change to the template's core or UI.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const template = path.resolve(process.argv[2] ?? "../playground-template");
const sha = execFileSync("git", ["-C", template, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

function fresh(target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

function requireDir(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Missing ${path.relative(template, dir) || dir} in the template`);
    process.exit(1);
  }
}

// vendor/core: the pure TypeScript core.
const coreSource = path.join(template, "core");
requireDir(coreSource);
const coreTarget = path.resolve("vendor/core");
fresh(coreTarget);
fs.cpSync(coreSource, coreTarget, { recursive: true });
fs.writeFileSync(path.join(coreTarget, "TEMPLATE_SHA"), `${sha}\n`);

// vendor/site: the shared UI, without the template's own build-time course.
const SITE_DIRS = ["components", "widgets", "hooks", "lib", "site", "screens", "content"];
const SKIP = new Set(["content/generated", "content/static.ts"]);
const siteTarget = path.resolve("vendor/site");
fresh(siteTarget);
for (const dir of SITE_DIRS) {
  const from = path.join(template, "src", dir);
  requireDir(from);
  fs.cpSync(from, path.join(siteTarget, dir), {
    recursive: true,
    filter: (source) => !SKIP.has(path.relative(path.join(template, "src"), source).split(path.sep).join("/")),
  });
}
fs.copyFileSync(path.join(template, "src/app/globals.css"), path.join(siteTarget, "site.css"));
fs.writeFileSync(path.join(siteTarget, "TEMPLATE_SHA"), `${sha}\n`);

// The in-browser PostgreSQL used by runnable SQL snippets is copied into public/ before dev and build.
fs.copyFileSync(path.join(template, "scripts/copy-pglite.mjs"), path.resolve("scripts/copy-pglite.mjs"));

console.log(`vendor/core and vendor/site synced from ${sha.slice(0, 7)}`);
