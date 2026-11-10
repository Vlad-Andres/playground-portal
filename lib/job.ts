import { deleteStorageFile, readStorageFile, writeStorageFile } from "@/lib/storage";

export type JobStatus = "accepted" | "running" | "completed" | "failed";

export interface JobRecord {
  id: string;
  status: JobStatus;
  error?: string;
  output?: string;
}

export function jobKey(id: string, file = "status.json"): string {
  return `jobs/${id}/${file}`;
}

export async function readJob(id: string): Promise<JobRecord | null> {
  try {
    return JSON.parse((await readStorageFile(jobKey(id))).toString("utf8")) as JobRecord;
  } catch {
    return null;
  }
}

export async function writeJob(job: JobRecord): Promise<void> {
  await writeStorageFile(jobKey(job.id), `${JSON.stringify(job)}\n`, "application/json");
}

export async function deleteJobSources(id: string): Promise<void> {
  let files: string[];
  try {
    files = JSON.parse((await readStorageFile(jobKey(id, "manifest.json"))).toString("utf8")) as string[];
  } catch {
    files = [];
  }
  await Promise.all([
    ...files.map((file) => deleteStorageFile(jobKey(id, file))),
    deleteStorageFile(jobKey(id, "manifest.json")),
  ]);
}
