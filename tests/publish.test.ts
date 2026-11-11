import { describe, expect, it, vi, afterEach } from "vitest";
import { githubPublisher } from "@/lib/publish/github";
import { repoNameFor } from "@/lib/publish/names";

const TOKEN = "ghp_test1234567890";
const OWNER = "test-org";
const TEMPLATE = "Vlad-Andres/playground-template";
const REPO_NAME = "pg-my-course-abcd1234";
const COMMIT_SHA = "abc123def456789";

const validFiles: Record<string, string> = {
  "course.json": JSON.stringify({ id: "my-course" }),
  "lectures/01-intro.json": JSON.stringify({ meta: { number: 1 } }),
};

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function mockFetch(handler: Handler) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    return handler(urlStr, init);
  }) as typeof globalThis.fetch;
}

const API = "https://api.github.com";

describe("githubPublisher", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("start", () => {
    it("creates a repo from the template, enables Pages, and commits content", async () => {
      const calls: { url: string; method: string; body?: unknown }[] = [];

      globalThis.fetch = mockFetch((url, init) => {
        const method = init?.method ?? "GET";
        const bodyStr = init?.body as string | undefined;

        // 1. Create from template
        if (url.endsWith("/generate") && method === "POST") {
          calls.push({ url: "generate", method, body: JSON.parse(bodyStr!) });
          return new Response(JSON.stringify({ id: 1, name: REPO_NAME }), { status: 201 });
        }

        // 2. Get repo info (for waitForBranch)
        if (url === `${API}/repos/${OWNER}/${REPO_NAME}` && method === "GET") {
          return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
        }

        // 3. Enable Pages
        if (url === `${API}/repos/${OWNER}/${REPO_NAME}/pages` && method === "POST") {
          calls.push({ url: "pages", method, body: JSON.parse(bodyStr!) });
          return new Response(JSON.stringify({}), { status: 201 });
        }

        // 4. List content tree (root)
        if (url.includes(`/git/trees/main:content`) && !url.includes("lectures") && method === "GET") {
          return new Response(
            JSON.stringify({
              tree: [
                { path: "course.json", type: "blob" },
                { path: "lectures", type: "tree" },
                { path: "exam.json", type: "blob" },
                { path: "expected.json", type: "blob" },
              ],
            }),
            { status: 200 },
          );
        }

        // 5. List content/lectures tree
        if (url.includes(`/git/trees/main:content/lectures`) && method === "GET") {
          return new Response(
            JSON.stringify({
              tree: [{ path: "01-getting-started.json", type: "blob" }],
            }),
            { status: 200 },
          );
        }

        // 6. Get branch ref
        if (url.includes(`/git/ref/heads/main`) && method === "GET") {
          return new Response(JSON.stringify({ object: { sha: "base000" } }), { status: 200 });
        }

        // 7. Get base commit
        if (url.includes(`/git/commits/base000`) && method === "GET") {
          return new Response(JSON.stringify({ tree: { sha: "tree000" } }), { status: 200 });
        }

        // 8. Create tree
        if (url.endsWith(`/git/trees`) && method === "POST") {
          calls.push({ url: "tree", method, body: JSON.parse(bodyStr!) });
          return new Response(JSON.stringify({ sha: "newtree" }), { status: 201 });
        }

        // 9. Create commit
        if (url.endsWith(`/git/commits`) && method === "POST") {
          calls.push({ url: "commit", method, body: JSON.parse(bodyStr!) });
          return new Response(JSON.stringify({ sha: COMMIT_SHA }), { status: 201 });
        }

        // 10. Update ref
        if (url.includes(`/git/refs/heads/main`) && method === "PATCH") {
          calls.push({ url: "ref", method, body: JSON.parse(bodyStr!) });
          return new Response(JSON.stringify({}), { status: 200 });
        }

        return new Response(JSON.stringify({ message: "Not found" }), { status: 404 });
      });

      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      const result = await publisher.start({ repoName: REPO_NAME, files: validFiles });

      expect(result.repo).toBe(`${OWNER}/${REPO_NAME}`);
      expect(result.commitSha).toBe(COMMIT_SHA);

      // Verify the request sequence
      const generateCall = calls.find((c) => c.url === "generate");
      expect(generateCall).toBeDefined();
      expect(generateCall!.body).toMatchObject({ owner: OWNER, name: REPO_NAME, private: false });

      const pagesCall = calls.find((c) => c.url === "pages");
      expect(pagesCall).toBeDefined();
      expect(pagesCall!.body).toMatchObject({ build_type: "workflow" });

      const treeCall = calls.find((c) => c.url === "tree");
      expect(treeCall).toBeDefined();
      const treeBody = treeCall!.body as { base_tree: string; tree: { path: string; sha?: string | null; content?: string }[] };
      expect(treeBody.base_tree).toBe("tree000");

      // Check that old lectures and exam/expected are deleted (sha: null)
      const deletions = treeBody.tree.filter((e) => e.sha === null);
      expect(deletions.map((d) => d.path).sort()).toEqual([
        "content/exam.json",
        "content/expected.json",
        "content/lectures/01-getting-started.json",
      ]);

      // Check that new files are added
      const additions = treeBody.tree.filter((e) => e.content !== undefined);
      expect(additions.map((a) => a.path).sort()).toEqual([
        "content/course.json",
        "content/lectures/01-intro.json",
      ]);

      const commitCall = calls.find((c) => c.url === "commit");
      expect(commitCall!.body).toMatchObject({ parents: ["base000"], tree: "newtree" });

      const refCall = calls.find((c) => c.url === "ref");
      expect(refCall!.body).toMatchObject({ sha: COMMIT_SHA });
    });

    it("refuses a file path containing ..", async () => {
      globalThis.fetch = mockFetch(() => new Response("{}", { status: 200 }));
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      await expect(publisher.start({ repoName: REPO_NAME, files: { "../etc/passwd": "bad" } })).rejects.toThrow(
        /not allowed/,
      );
    });

    it("refuses an absolute path", async () => {
      globalThis.fetch = mockFetch(() => new Response("{}", { status: 200 }));
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      await expect(publisher.start({ repoName: REPO_NAME, files: { "/etc/passwd": "bad" } })).rejects.toThrow(
        /not allowed/,
      );
    });

    it("reports GitHub errors without the token", async () => {
      globalThis.fetch = mockFetch(() =>
        new Response(JSON.stringify({ message: `Bad credentials for Bearer ${TOKEN}` }), { status: 401 }),
      );
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      try {
        await publisher.start({ repoName: REPO_NAME, files: validFiles });
        expect.fail("should throw");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(TOKEN);
        expect(message).toContain("Could not create repository");
      }
    });
  });

  describe("check", () => {
    it("returns building when no runs exist", async () => {
      globalThis.fetch = mockFetch(() =>
        new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 }),
      );
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      const result = await publisher.check({ repo: `${OWNER}/${REPO_NAME}`, commitSha: COMMIT_SHA });
      expect(result.state).toBe("building");
    });

    it("returns building when a run is in progress", async () => {
      globalThis.fetch = mockFetch(() =>
        new Response(
          JSON.stringify({
            workflow_runs: [{ status: "in_progress", conclusion: null }],
          }),
          { status: 200 },
        ),
      );
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      const result = await publisher.check({ repo: `${OWNER}/${REPO_NAME}`, commitSha: COMMIT_SHA });
      expect(result.state).toBe("building");
    });

    it("returns live with a site URL when the run succeeds", async () => {
      globalThis.fetch = mockFetch(() =>
        new Response(
          JSON.stringify({
            workflow_runs: [{ status: "completed", conclusion: "success" }],
          }),
          { status: 200 },
        ),
      );
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      const result = await publisher.check({ repo: `${OWNER}/${REPO_NAME}`, commitSha: COMMIT_SHA });
      expect(result.state).toBe("live");
      expect(result.siteUrl).toBe(`https://${OWNER}.github.io/${REPO_NAME}/`);
    });

    it("returns failed when all runs completed without success", async () => {
      globalThis.fetch = mockFetch(() =>
        new Response(
          JSON.stringify({
            workflow_runs: [{ status: "completed", conclusion: "failure" }],
          }),
          { status: 200 },
        ),
      );
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      const result = await publisher.check({ repo: `${OWNER}/${REPO_NAME}`, commitSha: COMMIT_SHA });
      expect(result.state).toBe("failed");
    });

    it("returns building when the API errors", async () => {
      globalThis.fetch = mockFetch(() => new Response("error", { status: 500 }));
      const publisher = githubPublisher({ token: TOKEN, owner: OWNER, template: TEMPLATE });
      const result = await publisher.check({ repo: `${OWNER}/${REPO_NAME}`, commitSha: COMMIT_SHA });
      expect(result.state).toBe("building");
    });
  });
});

describe("repoNameFor", () => {
  it("produces the expected format", () => {
    expect(repoNameFor("my-course", "abcd1234-5678-9012-3456-abcdef123456")).toBe("pg-my-course-abcd1234");
  });

  it("truncates long course ids", () => {
    const long = "a".repeat(60);
    const name = repoNameFor(long, "abcd1234-5678-9012-3456-abcdef123456");
    expect(name).toBe(`pg-${"a".repeat(40)}-abcd1234`);
  });
});
