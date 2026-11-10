import { generateLecture } from "@/lib/gemini";
import { deleteJobSources, jobKey, readJob, writeJob } from "@/lib/job";
import { readStorageFile, writeStorageFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Invalid job id." }, { status: 400 });
  if (process.env.PORTAL_ENABLE_GENERATION !== "true") {
    return Response.json({ error: "Generation is disabled. Set PORTAL_ENABLE_GENERATION=true on the server." }, { status: 503 });
  }
  const job = await readJob(id);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  if (job.status !== "accepted") return Response.json({ error: `Job is already ${job.status}.` }, { status: 409 });

  await writeJob({ ...job, status: "running" });
  try {
    const brief = JSON.parse((await readStorageFile(jobKey(id, "brief.json"))).toString("utf8"));
    const output = await generateLecture(id, brief);
    await writeStorageFile(jobKey(id, "lecture.json"), `${JSON.stringify(JSON.parse(output), null, 2)}\n`, "application/json");
    await writeJob({ id, status: "completed", output: "lecture.json" });
    try {
      await deleteJobSources(id);
    } catch (cleanupError) {
      console.error("Course source cleanup failed", { id, error: cleanupError });
    }
    return Response.json({ id, status: "completed", previewUrl: `/courses/${id}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    console.error("Course generation failed", { id, error });
    await writeJob({ id, status: "failed", error: message });
    try {
      await deleteJobSources(id);
    } catch (cleanupError) {
      console.error("Course source cleanup failed", { id, error: cleanupError });
    }
    return Response.json({ id, status: "failed", error: message }, { status: 502 });
  }
}
