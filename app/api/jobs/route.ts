import { createJobHandler } from "@/lib/api/handlers";
import { defaultStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return createJobHandler(request, defaultStore(), process.env);
}
