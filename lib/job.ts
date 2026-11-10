import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type JobStatus = "accepted" | "running" | "completed" | "failed";

export interface JobRecord {
  id: string;
  status: JobStatus;
  error?: string;
  output?: string;
}

export function jobDirectory(id: string): string {
  return path.join(process.cwd(), "jobs", id);
}

export async function readJob(id: string): Promise<JobRecord | null> {
  try {
    return JSON.parse(await readFile(path.join(jobDirectory(id), "status.json"), "utf8")) as JobRecord;
  } catch {
    return null;
  }
}

export async function writeJob(job: JobRecord): Promise<void> {
  await mkdir(jobDirectory(job.id), { recursive: true });
  await writeFile(path.join(jobDirectory(job.id), "status.json"), `${JSON.stringify(job)}\n`);
}
