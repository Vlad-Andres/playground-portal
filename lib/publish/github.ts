import { isBundlePath } from "@core/generate/bundle";
import type { Publisher } from "./types";

export interface GitHubPublisherOptions {
  token: string;
  owner: string;
  template: string;
}

const API = "https://api.github.com";

async function ghFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  return response;
}

/** Wait for the default branch to appear on a newly-created repo (up to 10 s). */
async function waitForBranch(owner: string, repo: string, token: string): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const response = await ghFetch(`/repos/${owner}/${repo}`, token);
    if (response.ok) {
      const data = (await response.json()) as { default_branch?: string };
      if (data.default_branch) return data.default_branch;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("The default branch did not appear after creating the repository.");
}

/**
 * Create a single tree entry that deletes a file.
 * Git Data API: a tree entry with `sha: null` removes the path.
 */
interface TreeEntry {
  path: string;
  mode: "100644";
  type: "blob";
  sha?: string | null;
  content?: string;
}

/**
 * Build the set of tree entries: delete old content files, add bundle files.
 * Every path is validated with `isBundlePath`.
 */
function treeEntries(files: Record<string, string>, deletePaths: string[]): TreeEntry[] {
  const entries: TreeEntry[] = [];

  // Delete old content files
  for (const path of deletePaths) {
    entries.push({ path: `content/${path}`, mode: "100644", type: "blob", sha: null });
  }

  // Add new files from the bundle
  for (const [path, content] of Object.entries(files)) {
    if (!isBundlePath(path)) throw new Error(`Path not allowed: ${path}`);
    entries.push({ path: `content/${path}`, mode: "100644", type: "blob", content });
  }

  return entries;
}

/**
 * List existing content/ files to delete before writing the bundle.
 * Returns relative paths like "lectures/01-intro.json".
 */
async function listContentFiles(owner: string, repo: string, branch: string, token: string): Promise<string[]> {
  const paths: string[] = [];

  async function walk(treePath: string, prefix: string) {
    const response = await ghFetch(`/repos/${owner}/${repo}/git/trees/${branch}:${treePath}`, token);
    if (!response.ok) return;
    const data = (await response.json()) as { tree: { path: string; type: string }[] };
    for (const entry of data.tree) {
      const full = prefix ? `${prefix}/${entry.path}` : entry.path;
      if (entry.type === "tree" && entry.path === "lectures") {
        await walk(`${treePath}/${entry.path}`, full);
      } else if (entry.type === "blob" && /\.json$/.test(entry.path)) {
        paths.push(full);
      }
    }
  }

  await walk("content", "");
  return paths;
}

function safeError(message: string): Error {
  // Never include the token in any error message.
  return new Error(message.replace(/Bearer [A-Za-z0-9_-]+/g, "Bearer ***"));
}

export function githubPublisher(options: GitHubPublisherOptions): Publisher {
  const { token, owner, template } = options;
  const [templateOwner, templateRepo] = template.split("/");

  return {
    async start(input) {
      const { repoName, files } = input;

      // Validate all paths up front
      for (const path of Object.keys(files)) {
        if (!isBundlePath(path)) throw safeError(`Path not allowed in a bundle: ${path}`);
      }

      // 1. Create the repo from the template
      const createResponse = await ghFetch(`/repos/${templateOwner}/${templateRepo}/generate`, token, {
        method: "POST",
        body: JSON.stringify({
          owner,
          name: repoName,
          description: "Generated study site",
          private: false,
          include_all_branches: false,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!createResponse.ok) {
        const body = (await createResponse.json().catch(() => ({}))) as { message?: string };
        throw safeError(`Could not create repository: ${body.message ?? `HTTP ${createResponse.status}`}`);
      }

      // 2. Wait for the default branch
      const branch = await waitForBranch(owner, repoName, token);

      // 3. Enable GitHub Pages with the "workflow" build type
      await ghFetch(`/repos/${owner}/${repoName}/pages`, token, {
        method: "POST",
        body: JSON.stringify({ build_type: "workflow", source: { branch, path: "/" } }),
        headers: { "Content-Type": "application/json" },
      });

      // 4. Find content files to delete
      const toDelete = await listContentFiles(owner, repoName, branch, token);
      // Filter to only the paths we want to replace
      const deletePaths = toDelete.filter(
        (p) => p === "exam.json" || p === "expected.json" || p.startsWith("lectures/"),
      );

      // 5. Get the latest commit SHA for the branch
      const refResponse = await ghFetch(`/repos/${owner}/${repoName}/git/ref/heads/${branch}`, token);
      if (!refResponse.ok) throw safeError("Could not read the branch reference.");
      const refData = (await refResponse.json()) as { object: { sha: string } };
      const baseCommitSha = refData.object.sha;

      // 6. Get the base tree SHA
      const commitResponse = await ghFetch(`/repos/${owner}/${repoName}/git/commits/${baseCommitSha}`, token);
      if (!commitResponse.ok) throw safeError("Could not read the base commit.");
      const commitData = (await commitResponse.json()) as { tree: { sha: string } };
      const baseTreeSha = commitData.tree.sha;

      // 7. Create a new tree with deletions and additions
      const entries = treeEntries(files, deletePaths);
      const treeResponse = await ghFetch(`/repos/${owner}/${repoName}/git/trees`, token, {
        method: "POST",
        body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
        headers: { "Content-Type": "application/json" },
      });
      if (!treeResponse.ok) throw safeError("Could not create the content tree.");
      const treeData = (await treeResponse.json()) as { sha: string };

      // 8. Create a commit
      const newCommitResponse = await ghFetch(`/repos/${owner}/${repoName}/git/commits`, token, {
        method: "POST",
        body: JSON.stringify({
          message: "Add generated course content",
          tree: treeData.sha,
          parents: [baseCommitSha],
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!newCommitResponse.ok) throw safeError("Could not create the commit.");
      const newCommit = (await newCommitResponse.json()) as { sha: string };

      // 9. Update the branch ref
      await ghFetch(`/repos/${owner}/${repoName}/git/refs/heads/${branch}`, token, {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha }),
        headers: { "Content-Type": "application/json" },
      });

      return { repo: `${owner}/${repoName}`, commitSha: newCommit.sha };
    },

    async check(input) {
      const { repo, commitSha } = input;

      // Look up workflow runs for the commit
      const runsResponse = await ghFetch(`/repos/${repo}/actions/runs?head_sha=${commitSha}&per_page=5`, token);
      if (!runsResponse.ok) return { state: "building" };

      const runsData = (await runsResponse.json()) as {
        workflow_runs: { status: string; conclusion: string | null }[];
      };

      const runs = runsData.workflow_runs;
      if (runs.length === 0) return { state: "building" };

      // Any run completed successfully → live
      const success = runs.some((run) => run.status === "completed" && run.conclusion === "success");
      if (success) {
        const [repoOwner, repoName] = repo.split("/");
        return { state: "live", siteUrl: `https://${repoOwner}.github.io/${repoName}/` };
      }

      // Any run still in progress → building
      const inProgress = runs.some((run) => run.status !== "completed");
      if (inProgress) return { state: "building" };

      // All completed but none succeeded → failed
      return { state: "failed" };
    },
  };
}

