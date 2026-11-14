import { defaultStore } from "@/lib/jobs/store";
import { metricsHandler } from "@/lib/metrics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return metricsHandler(request, defaultStore(), new Date());
}
