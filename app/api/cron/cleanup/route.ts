import { cleanupHandler } from "@/lib/api/handlers";
import { defaultStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return cleanupHandler(request, defaultStore(), process.env);
}
