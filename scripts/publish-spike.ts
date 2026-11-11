import fs from "node:fs";
import path from "node:path";
import { githubPublisher } from "../lib/publish/github";
import { repoNameFor } from "../lib/publish/names";

if (fs.existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore
  }
}

const token = process.env.GITHUB_PUBLISH_TOKEN;
const owner = process.env.GITHUB_PUBLISH_OWNER;
const template = process.env.TEMPLATE_REPO ?? "Vlad-Andres/playground-template";

if (!token || !owner) {
  console.error("Missing GITHUB_PUBLISH_TOKEN or GITHUB_PUBLISH_OWNER in environment.");
  process.exit(1);
}

const showcaseDir = path.resolve(process.cwd(), "../playground-template/examples/showcase");
if (!fs.existsSync(showcaseDir)) {
  console.error(`Showcase directory not found at ${showcaseDir}`);
  process.exit(1);
}

const files: Record<string, string> = {};
function readDir(dir: string, prefix = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      readDir(full, rel);
    } else if (entry.isFile() && rel.endsWith(".json")) {
      files[rel] = fs.readFileSync(full, "utf8");
    }
  }
}
readDir(showcaseDir);

const publisher = githubPublisher({ token, owner, template });
const repoName = repoNameFor("showcase", Date.now().toString(16).padStart(8, "0"));

console.log(`Starting spike publish for repo: ${owner}/${repoName}...`);
const startT0 = Date.now();
const { repo, commitSha } = await publisher.start({ repoName, files });
const startDuration = ((Date.now() - startT0) / 1000).toFixed(1);
console.log(`Repository created and files committed in ${startDuration}s (commit: ${commitSha}).`);

console.log("Waiting for GitHub Pages workflow to build and deploy...");
const checkT0 = Date.now();
while (true) {
  const status = await publisher.check({ repo, commitSha });
  const checkDuration = ((Date.now() - checkT0) / 1000).toFixed(1);
  if (status.state === "live") {
    console.log(`\nSite is live at: ${status.siteUrl}`);
    console.log(`Build & deploy took ${checkDuration}s (total: ${((Date.now() - startT0) / 1000).toFixed(1)}s).`);
    break;
  }
  if (status.state === "failed") {
    console.error(`\nPublishing failed after ${checkDuration}s.`);
    process.exit(1);
  }
  process.stdout.write(`... still building (${checkDuration}s)\r`);
  await new Promise((r) => setTimeout(r, 5000));
}

