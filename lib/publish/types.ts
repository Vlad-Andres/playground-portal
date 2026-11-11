export interface Publisher {
  start(input: { repoName: string; files: Record<string, string> }): Promise<{ repo: string; commitSha: string }>;
  check(input: { repo: string; commitSha: string }): Promise<{ state: "building" | "live" | "failed"; siteUrl?: string }>;
}
