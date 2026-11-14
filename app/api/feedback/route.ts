import { createFeedbackHandler } from "@/lib/feedback";
import { defaultStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return createFeedbackHandler(request, defaultStore(), new Date());
}
