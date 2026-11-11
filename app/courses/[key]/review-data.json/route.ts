import { buildReviewData } from "@site/site/reviewData";
import { loadSite } from "@/lib/sites/load";
import { courseBase } from "@/lib/sites/page";

/** Review data for the "Difficult parts" page of one course. */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const data = await loadSite(key);
  if (!data) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json(buildReviewData(data, courseBase(key)));
}
