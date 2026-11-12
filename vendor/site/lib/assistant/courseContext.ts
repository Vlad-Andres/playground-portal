import type { SiteData } from "@core/site";
import { lectureToContext } from "@site/lib/assistant/lectureContext";

const MAX_CONTEXT_CHARS = 120_000;

export function siteToContext(data: SiteData) {
  const contexts: string[] = [];
  let total = 0;

  for (const lecture of data.lectures) {
    const context = lectureToContext(lecture);
    if (total + context.length > MAX_CONTEXT_CHARS && contexts.length > 0) {
      contexts.push("[Additional lectures omitted to fit the context window.]");
      break;
    }
    contexts.push(context);
    total += context.length;
  }

  if (data.exam) {
    const examContext = lectureToContext(data.exam);
    if (total + examContext.length <= MAX_CONTEXT_CHARS) {
      contexts.push(examContext);
    }
  }

  return contexts.join("\n\n---\n\n");
}
