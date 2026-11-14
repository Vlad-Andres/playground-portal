import { defaultStore } from "@/lib/jobs/store";
import { createReportHandler } from "@/lib/reports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return createReportHandler(request, defaultStore(), new Date());
}
