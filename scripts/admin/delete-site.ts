import fs from "node:fs";
import readline from "node:readline/promises";

if (fs.existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore
  }
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: delete-site.ts <repo> (e.g. pg-showcase-12345678 or owner/pg-showcase-12345678)");
  process.exit(1);
}

const token = process.env.GITHUB_PUBLISH_TOKEN;
const defaultOwner = process.env.GITHUB_PUBLISH_OWNER;

const repoPath = target.includes("/") ? target : `${defaultOwner}/${target}`;
const [owner, repo] = repoPath.split("/");

if (!token) {
  console.error("Missing GITHUB_PUBLISH_TOKEN in environment.");
  process.exit(1);
}

if (!owner || !repo) {
  console.error("Invalid repository format. Specify 'owner/repo' or set GITHUB_PUBLISH_OWNER.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(`Are you sure you want to permanently delete repository ${owner}/${repo}? (yes/no): `);
rl.close();

if (answer.trim().toLowerCase() !== "yes") {
  console.log("Aborted.");
  process.exit(0);
}

console.log(`Deleting ${owner}/${repo}...`);
const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
  method: "DELETE",
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

if (response.status === 204) {
  console.log(`Successfully deleted ${owner}/${repo}.`);
} else {
  const body = await response.text();
  console.error(`Failed to delete (HTTP ${response.status}): ${body}`);
  process.exit(1);
}

